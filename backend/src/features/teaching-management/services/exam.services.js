const db = require("../../../db");

/**
 * Service layer for exam management.
 * Aligned with updated database schema (name, exam_type, class_room_id, duration_minutes, total_points, passing_score, description)
 */

async function createExam(data, userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      exam_type,
      class_room_id,
      duration_minutes,
      total_points,
      passing_score,
      description,
      is_private,
      question_ids,
      practice_questions,
    } = data;

    const isQuiz = exam_type === "MULTIPLE_CHOICE";
    const isPractice = exam_type === "PRACTICAL";

    if (!name) {
      throw { status: 400, message: "Exam name is required" };
    }

    const query = `
      INSERT INTO exam (
        name,
        class_room_id,
        is_private, 
        created_by, 
        created_date, 
        modified_date
      )
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;

    // Note: duration_minutes, total_points, passing_score, description, organization_id
    // are currently NOT in the database schema for 'exam' table.
    // They are ignored here to prevent SQL errors.

    // Create the Exam entry
    let examId;
    try {
      const is_private_val = is_private === true || is_private === 1 || is_private === "true" ? 1 : 0;
      const [result] = await connection.execute(query, [
        name,
        class_room_id || null,
        is_private_val,
        userId || null,
      ]);
      examId = result.insertId;
    } catch (err) {
      console.error("Database error creating exam:", err);
      throw { status: 500, message: "Error creating exam record: " + err.message };
    }

    // Mapping for Quiz (Multiple Choice Questions)
    const qIds = question_ids || data.questionIds || [];
    if (isQuiz && Array.isArray(qIds)) {
      for (const qId of qIds) {
        await connection.execute(
          "INSERT INTO question_exam_mapping (exam_id, question_id) VALUES (?, ?)",
          [examId, qId],
        );
      }
    }

    // Mapping for Practice (Vocabulary Questions)
    const pqs = practice_questions || data.practiceQuestions || [];
    if (isPractice && Array.isArray(pqs)) {
      for (const pq of pqs) {
        try {
          // Supports both vocabularyId and vocabulary_id
          const vId = pq.vocabularyId || pq.vocabulary_id || null;
          await connection.execute(
            "INSERT INTO vocabulary_exam_mapping (exam_id, vocabulary_id, content, created_date) VALUES (?, ?, ?, NOW())",
            [examId, vId, pq.content || ""],
          );
        } catch (err) {
          console.error("Error inserting practice question mapping:", err);
        }
      }
    }

    await connection.commit();

    return {
      id: examId,
      name,
      class_room_id,
      exam_type,
    };
  } catch (err) {
    await connection.rollback();
    throw { status: err.status || 500, message: err.message };
  } finally {
    connection.release();
  }
}

async function getExams(filters) {
  try {
    const {
      page = 1,
      limit = 1000,
      class_room_id,
      class_room_ids,
      exam_type,
      studentId, // Added studentId parameter support
    } = filters;
    const offset = (page - 1) * limit;

    let whereClause = " WHERE 1=1";
    const params = [];

    // Filter by single class_room_id
    if (class_room_id) {
      whereClause += " AND e.class_room_id = ?";
      params.push(class_room_id);
    }

    // Filter by Multiple Classrooms
    if (class_room_ids) {
      let classIdsArray = Array.isArray(class_room_ids)
        ? class_room_ids.map((id) => parseInt(id))
        : class_room_ids.split(",").map((id) => parseInt(id.trim()));

      if (classIdsArray.length > 0) {
        const placeholders = classIdsArray.map(() => "?").join(",");
        whereClause += ` AND e.class_room_id IN (${placeholders})`;
        params.push(...classIdsArray);
      }
    }

    // Since exam_type is not a column in 'exam' table, we filter using EXISTS in mappings
    if (exam_type === "PRACTICAL") {
      whereClause +=
        " AND EXISTS (SELECT 1 FROM vocabulary_exam_mapping vem WHERE vem.exam_id = e.exam_id)";
    } else if (exam_type === "MULTIPLE_CHOICE") {
      whereClause +=
        " AND EXISTS (SELECT 1 FROM question_exam_mapping qem WHERE qem.exam_id = e.exam_id)";
    }

    // Get total count
    const [countRows] = await db.execute(
      "SELECT COUNT(*) as total FROM exam e" + whereClause,
      params,
    );
    const total = countRows[0].total;

    let query = "";
    if (studentId) {
      query = `
        SELECT e.*, 
               CASE WHEN ea.attempt_id IS NOT NULL THEN 1 ELSE 0 END as is_submitted,
               ea.score as user_score
        FROM exam e 
        LEFT JOIN exam_attempt ea ON e.exam_id = ea.exam_id AND ea.user_id = ?
        ${whereClause} 
        ORDER BY e.exam_id DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      params.unshift(studentId); // Add studentId at the beginning for the LEFT JOIN
    } else {
      query = `SELECT e.* FROM exam e ${whereClause} ORDER BY e.exam_id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    }

    const [exams] = await db.execute(query, params);

    // Add inferred type to results
    const examsWithType = await Promise.all(
      exams.map(async (exam) => {
        // Optimization: if we already filtered by type, we know it
        if (exam_type) {
          return { ...exam, exam_type };
        }
        // Otherwise infer
        const [qMap] = await db.execute(
          "SELECT 1 FROM question_exam_mapping WHERE exam_id = ? LIMIT 1",
          [exam.exam_id],
        );
        const [vMap] = await db.execute(
          "SELECT 1 FROM vocabulary_exam_mapping WHERE exam_id = ? LIMIT 1",
          [exam.exam_id],
        );
        // Prefer practical type if vocabulary mappings exist
        return {
          ...exam,
          exam_type:
            vMap.length > 0
              ? "PRACTICAL"
              : qMap.length > 0
                ? "MULTIPLE_CHOICE"
                : "MULTIPLE_CHOICE",
        };
      }),
    );

    return {
      data: examsWithType,
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
    };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

/**
 * Get all practical submissions for grading
 */
async function getAllPracticalSubmissions(filters = {}) {
  try {
    const { teacherId } = filters;
    let query = `
      SELECT 
        ea.attempt_id,
        ea.exam_id,
        ea.user_id as studentId,
        u.name as studentName,
        e.name as examName,
        cr.content as classRoomName,
        ea.score,
        ea.started_at,
        ea.finished_at
      FROM exam_attempt ea
      JOIN exam e ON ea.exam_id = e.exam_id
      JOIN user u ON ea.user_id = u.user_id
      LEFT JOIN class_room cr ON e.class_room_id = cr.class_room_id
      WHERE EXISTS (SELECT 1 FROM vocabulary_exam_mapping vem WHERE vem.exam_id = e.exam_id)
      AND ea.score IS NULL
    `;
    // If teacherId is provided, should we filter by classroom?
    // For now list all pending practical submissions
    query += " ORDER BY ea.started_at DESC";

    const [rows] = await db.execute(query);
    return rows;
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function getExamById(examId) {
  try {
    const [results] = await db.execute("SELECT * FROM exam WHERE exam_id = ?", [
      examId,
    ]);
    if (results.length === 0) throw { status: 404, message: "Exam not found" };

    const exam = results[0];

    // Fallback: Infer exam_type if not present in DB
    // Check question mapping first
    const [qMap] = await db.execute(
      "SELECT 1 FROM question_exam_mapping WHERE exam_id = ? LIMIT 1",
      [examId],
    );
    const [vMap] = await db.execute(
      "SELECT 1 FROM vocabulary_exam_mapping WHERE exam_id = ? LIMIT 1",
      [examId],
    );

    const actualType =
      exam.exam_type ||
      (vMap.length > 0
        ? "PRACTICAL"
        : qMap.length > 0
          ? "MULTIPLE_CHOICE"
          : "MULTIPLE_CHOICE");

    // Fetch associated content based on type
    if (actualType === "PRACTICAL" || actualType === "PRACTICE") {
      const [practiceQuestions] = await db.execute(
        `
        SELECT 
          vem.vocabulary_exam_id as id,
          vem.content as contentFromExamVocabulary,
          vem.vocabulary_id as vocabularyId,
          v.topic_id as topicId,
          t.content as topic_name,
          v.content as vocabulary_content
        FROM vocabulary_exam_mapping vem
        LEFT JOIN vocabulary v ON vem.vocabulary_id = v.vocabulary_id
        LEFT JOIN topic t ON v.topic_id = t.topic_id
        WHERE vem.exam_id = ?
      `,
        [examId],
      );

      return {
        ...exam,
        exam_type: actualType,
        practiceQuestions,
      };
    } else {
      const [questions] = await db.execute(
        `
        SELECT q.* FROM question q
        JOIN question_exam_mapping qem ON q.question_id = qem.question_id
        WHERE qem.exam_id = ?
      `,
        [examId],
      );

      const questionsWithAnswers = await Promise.all(
        questions.map(async (q) => {
          const [answers] = await db.execute(
            "SELECT answer_id as answerId, content, is_correct as correct, video_location as videoLocation, NULL as imageLocation FROM answer WHERE question_id = ?",
            [q.question_id],
          );
          return {
            ...q,
            questionId: q.question_id,
            questionType: q.question_type,
            answerResList: answers.map((a) => {
              let isCorrect = a.correct;
              if (Buffer.isBuffer(isCorrect)) isCorrect = isCorrect[0] === 1;
              else if (typeof isCorrect === "number")
                isCorrect = isCorrect === 1;
              else isCorrect = !!isCorrect;

              return {
                ...a,
                correct: isCorrect,
              };
            }),
          };
        }),
      );

      return {
        ...exam,
        questionsList: questionsWithAnswers,
      };
    }
  } catch (err) {
    throw { status: err.status || 500, message: err.message };
  }
}

async function updateExam(examId, data) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      class_room_id,
      is_private,
      exam_type,
      duration_minutes,
      total_points,
      passing_score,
      description,
      question_ids,
      practice_questions,
    } = data;

    let query = "UPDATE exam SET ";
    const params = [];
    const fields = [];

    if (name) {
      fields.push("name = ?");
      params.push(name);
    }
    if (class_room_id !== undefined) {
      fields.push("class_room_id = ?");
      params.push(class_room_id);
    }
    if (is_private !== undefined) {
      fields.push("is_private = ?");
      params.push(is_private ? 1 : 0);
    }
    // Note: Other fields (exam_type, duration, description, etc.) are ignored
    // as they don't exist in the current schema.

    if (fields.length > 0) {
      fields.push("modified_date = NOW()");
      query += fields.join(", ") + " WHERE exam_id = ?";
      params.push(examId);
      await connection.execute(query, params);
    }

    // Update question mapping if provided
    if (question_ids && Array.isArray(question_ids)) {
      await connection.execute(
        "DELETE FROM question_exam_mapping WHERE exam_id = ?",
        [examId],
      );
      for (const qId of question_ids) {
        await connection.execute(
          "INSERT INTO question_exam_mapping (exam_id, question_id) VALUES (?, ?)",
          [examId, qId],
        );
      }
    }

    // Update practice mapping if provided
    if (practice_questions && Array.isArray(practice_questions)) {
      await connection.execute(
        "DELETE FROM vocabulary_exam_mapping WHERE exam_id = ?",
        [examId],
      );
      for (const pq of practice_questions) {
        await connection.execute(
          "INSERT INTO vocabulary_exam_mapping (exam_id, vocabulary_id, content, created_date) VALUES (?, ?, ?, NOW())",
          [examId, pq.vocabularyId || null, pq.content || ""],
        );
      }
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw { status: 500, message: err.message };
  } finally {
    connection.release();
  }
}

async function deleteExam(examId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "DELETE FROM question_exam_mapping WHERE exam_id = ?",
      [examId],
    );
    await connection.execute(
      "DELETE FROM vocabulary_exam_mapping WHERE exam_id = ?",
      [examId],
    );
    await connection.execute("DELETE FROM exam_attempt WHERE exam_id = ?", [
      examId,
    ]);
    const [result] = await connection.execute(
      "DELETE FROM exam WHERE exam_id = ?",
      [examId],
    );
    await connection.commit();
    return { success: result.affectedRows > 0 };
  } catch (err) {
    await connection.rollback();
    throw { status: 500, message: err.message };
  } finally {
    connection.release();
  }
}

async function getExamsByCreator(creatorId, limit, offset) {
  try {
    const [exams] = await db.execute(
      "SELECT * FROM exam WHERE created_by = ? ORDER BY exam_id DESC LIMIT ? OFFSET ?",
      [creatorId, parseInt(limit), parseInt(offset)],
    );
    return { data: exams, total: exams.length };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function getExamsByType(examType, limit, offset) {
  try {
    // Note: This is inefficient since exam_type is not in DB
    // We'd normally filter by exam_type column.
    // For now, we return exams that have at least one mapping of that type.
    let query = "";
    if (examType === "MULTIPLE_CHOICE") {
      query =
        "SELECT DISTINCT e.* FROM exam e JOIN question_exam_mapping qem ON e.exam_id = qem.exam_id";
    } else {
      query =
        "SELECT DISTINCT e.* FROM exam e JOIN vocabulary_exam_mapping vem ON e.exam_id = vem.exam_id";
    }
    query += " ORDER BY e.exam_id DESC LIMIT ? OFFSET ?";
    const [exams] = await db.execute(query, [
      parseInt(limit),
      parseInt(offset),
    ]);
    return { data: exams, total: exams.length };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function deleteExamsByClassroom(classroomId) {
  try {
    const [exams] = await db.execute(
      "SELECT exam_id FROM exam WHERE class_room_id = ?",
      [classroomId],
    );
    for (const e of exams) {
      await deleteExam(e.exam_id);
    }
    return { success: true, affectedRows: exams.length };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function getExamResults(examId, studentId) {
  try {
    let query = "SELECT * FROM exam_attempt WHERE exam_id = ?";
    const params = [examId];
    if (studentId) {
      query += " AND user_id = ?";
      params.push(studentId);
    }
    const [results] = await db.execute(query, params);
    return results;
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function getExamStatistics(classroomId, examType) {
  try {
    let query = "SELECT COUNT(*) as total FROM exam WHERE 1=1";
    const params = [];
    if (classroomId) {
      query += " AND class_room_id = ?";
      params.push(classroomId);
    }
    // examType filtering is hard without the column, but we'll ignore it for now as it's optional
    const [rows] = await db.execute(query, params);
    return rows[0];
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

async function getStudentExamAttempts(studentId, limit, offset) {
  try {
    const [attempts] = await db.execute(
      "SELECT ea.*, e.name as exam_name FROM exam_attempt ea JOIN exam e ON ea.exam_id = e.exam_id WHERE ea.user_id = ? ORDER BY ea.started_at DESC LIMIT ? OFFSET ?",
      [studentId, parseInt(limit), parseInt(offset)],
    );
    return { data: attempts, total: attempts.length };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}

function normalizeInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeSelectedAnswers(rawSelectedAnswers) {
  if (Array.isArray(rawSelectedAnswers)) {
    return [...new Set(rawSelectedAnswers.map((v) => normalizeInt(v)).filter((v) => v !== null))];
  }

  if (typeof rawSelectedAnswers === "number") {
    return [rawSelectedAnswers];
  }

  if (typeof rawSelectedAnswers === "string") {
    const trimmed = rawSelectedAnswers.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((v) => normalizeInt(v)).filter((v) => v !== null))];
      }
      const maybeSingle = normalizeInt(parsed);
      return maybeSingle !== null ? [maybeSingle] : [];
    } catch {
      return [...new Set(trimmed.split(",").map((v) => normalizeInt(v)).filter((v) => v !== null))];
    }
  }

  return [];
}

function bitToBoolean(value) {
  if (Buffer.isBuffer(value)) return value[0] === 1;
  if (typeof value === "number") return value === 1;
  return !!value;
}

function areSameIdSets(left, right) {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}

async function submitExam(examId, studentId, answers, _timeSpent) {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    const normalizedExamId = parseInt(examId);
    const normalizedStudentId = parseInt(studentId);

    if (!normalizedExamId || isNaN(normalizedExamId)) {
      throw { status: 400, message: "Invalid exam ID" };
    }

    if (!normalizedStudentId || isNaN(normalizedStudentId)) {
      throw { status: 400, message: "Invalid student ID" };
    }

    const [examRows] = await connection.execute(
      "SELECT exam_id FROM exam WHERE exam_id = ? LIMIT 1",
      [normalizedExamId],
    );
    if (examRows.length === 0) {
      throw { status: 404, message: "Exam not found" };
    }

    const [userRows] = await connection.execute(
      "SELECT user_id FROM `user` WHERE user_id = ? LIMIT 1",
      [normalizedStudentId],
    );
    if (userRows.length === 0) {
      throw { status: 400, message: "Invalid student ID" };
    }

    const [examQuestionRows] = await connection.execute(
      "SELECT question_id FROM question_exam_mapping WHERE exam_id = ? ORDER BY question_exam_id ASC",
      [normalizedExamId],
    );

    if (examQuestionRows.length === 0) {
      throw {
        status: 400,
        message: "Exam has no question mappings for grading",
      };
    }

    const examQuestionIds = examQuestionRows.map((row) => row.question_id);
    const examQuestionIdSet = new Set(examQuestionIds);

    const submittedAnswers = Array.isArray(answers) ? answers : [];
    const submittedByQuestion = new Map();

    for (const item of submittedAnswers) {
      const questionId =
        normalizeInt(item?.questionId) ||
        normalizeInt(item?.question_id) ||
        normalizeInt(item?.id);

      if (!questionId) {
        throw {
          status: 400,
          message: "Each answer item must include questionId",
        };
      }

      if (!examQuestionIdSet.has(questionId)) {
        throw {
          status: 400,
          message: `Question ${questionId} does not belong to exam ${normalizedExamId}`,
        };
      }

      const selectedAnswers = normalizeSelectedAnswers(
        item?.selectedAnswers ||
          item?.selected_answers ||
          item?.answerIds ||
          item?.answer_ids ||
          item?.answerId ||
          item?.answer_id ||
          [],
      );

      submittedByQuestion.set(questionId, selectedAnswers);
    }

    const placeholders = examQuestionIds.map(() => "?").join(",");
    const [answerRows] = await connection.execute(
      `SELECT question_id, answer_id, is_correct FROM answer WHERE question_id IN (${placeholders})`,
      examQuestionIds,
    );

    const correctAnswersByQuestion = new Map();
    for (const qid of examQuestionIds) {
      correctAnswersByQuestion.set(qid, new Set());
    }

    for (const row of answerRows) {
      if (bitToBoolean(row.is_correct)) {
        correctAnswersByQuestion.get(row.question_id)?.add(row.answer_id);
      }
    }

    const questionWeight = 10 / examQuestionIds.length;
    const gradedAnswers = [];
    let finalScoreRaw = 0;

    for (const questionId of examQuestionIds) {
      const selectedAnswers = submittedByQuestion.get(questionId) || [];
      const selectedSet = new Set(selectedAnswers);
      const correctSet = correctAnswersByQuestion.get(questionId) || new Set();

      const isCorrect = correctSet.size > 0 && areSameIdSets(selectedSet, correctSet);
      const questionScoreRaw = isCorrect ? questionWeight : 0;
      finalScoreRaw += questionScoreRaw;

      gradedAnswers.push({
        questionId,
        selectedAnswers,
        isCorrect,
        score: Number(questionScoreRaw.toFixed(2)),
      });
    }

    const finalScore = Number(finalScoreRaw.toFixed(2));

    await connection.beginTransaction();
    transactionStarted = true;

    // Insert into exam_attempt (always create a new attempt)
    const [attemptResult] = await connection.execute(
      "INSERT INTO exam_attempt (exam_id, user_id, score, started_at, finished_at) VALUES (?, ?, ?, NOW(), NOW())",
      [normalizedExamId, normalizedStudentId, finalScore],
    );

    const attemptId = attemptResult.insertId;

    // Also update user_exam_mapping for overall progress tracking
    // Schema: (user_exam_id, exam_id, is_finish, score, user_id)
    const [mappingExists] = await connection.execute(
      "SELECT user_exam_id FROM user_exam_mapping WHERE exam_id = ? AND user_id = ?",
      [normalizedExamId, normalizedStudentId],
    );

    if (mappingExists.length > 0) {
      await connection.execute(
        "UPDATE user_exam_mapping SET score = ?, is_finish = 1 WHERE user_exam_id = ?",
        [finalScore, mappingExists[0].user_exam_id],
      );
    } else {
      // Column order must match schema: exam_id, is_finish, score, user_id
      await connection.execute(
        "INSERT INTO user_exam_mapping (exam_id, is_finish, score, user_id) VALUES (?, 1, ?, ?)",
        [normalizedExamId, finalScore, normalizedStudentId],
      );
    }

    for (const item of gradedAnswers) {
      await connection.execute(
        `INSERT INTO question_exam_user_mapping
         (exam_id, question_id, user_id, attempt_id, selected_answers, is_correct, score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedExamId,
          item.questionId,
          normalizedStudentId,
          attemptId,
          Buffer.from(JSON.stringify(item.selectedAnswers), "utf8"),
          item.isCorrect ? 1 : 0,
          item.score,
        ],
      );
    }

    await connection.commit();
    return {
      success: true,
      attemptId,
      score: finalScore,
      totalQuestions: examQuestionIds.length,
      correctAnswers: gradedAnswers.filter((item) => item.isCorrect).length,
    };
  } catch (err) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw { status: err.status || 500, message: err.message };
  } finally {
    connection.release();
  }
}

async function createPracticeAttempt(examId, studentId) {
  // Bug fix: simplified - no need for manual connection pool management for single INSERT
  try {
    const [result] = await db.execute(
      "INSERT INTO exam_attempt (exam_id, user_id, score, started_at, finished_at) VALUES (?, ?, NULL, NOW(), NOW())",
      [examId, studentId],
    );
    return { attemptId: result.insertId };
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}


async function savePracticeQuestionVideo(
  examId,
  userId,
  attemptId,
  vocabularyId,
  minioPath,
) {
  const connection = await db.getConnection();
  try {
    const [existing] = await connection.execute(
      `SELECT question_exam_user_id FROM question_exam_user_mapping 
       WHERE exam_id = ? AND user_id = ? AND question_id = ?`,
      [examId, userId, vocabularyId],
    );

    if (existing.length > 0) {
      await connection.execute(
        `UPDATE question_exam_user_mapping SET minio_path = ?, attempt_id = ?
         WHERE question_exam_user_id = ?`,
        [minioPath, attemptId, existing[0].question_exam_user_id],
      );
    } else {
      await connection.execute(
        `INSERT INTO question_exam_user_mapping 
         (exam_id, question_id, user_id, attempt_id, minio_path) 
         VALUES (?, ?, ?, ?, ?)`,
        [examId, vocabularyId, userId, attemptId, minioPath],
      );
    }
    return { success: true };
  } catch (err) {
    throw { status: 500, message: err.message };
  } finally {
    connection.release();
  }
}

async function getPracticeSubmission(examId, studentId) {
  try {
    const [rows] = await db.execute(
      `SELECT 
         q.question_exam_user_id as id,
         COALESCE(vem.content, v.content) as contentFromVocabulary,
         q.minio_path as studentVideoUrl,
         q.ai_answer as aiAnswer,
         q.is_correct as isCorrect,
         q.score as score,
         q.question_id as vocabularyId
       FROM question_exam_user_mapping q
       LEFT JOIN vocabulary v ON v.vocabulary_id = q.question_id
       LEFT JOIN vocabulary_exam_mapping vem ON vem.exam_id = q.exam_id AND vem.vocabulary_id = q.question_id
       WHERE q.exam_id = ? AND q.user_id = ?
       ORDER BY q.question_exam_user_id ASC`,
      [examId, studentId],
    );
    return rows;
  } catch (err) {
    throw { status: 500, message: err.message };
  }
}


async function markPracticeExam(examId, userId, score, details) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Bug fix: get the LATEST attempt (not oldest) when multiple submissions exist
    const [existing] = await connection.execute(
      "SELECT attempt_id FROM exam_attempt WHERE exam_id = ? AND user_id = ? ORDER BY attempt_id DESC LIMIT 1",
      [examId, userId],
    );
    let attemptId;
    if (existing.length > 0) {
      attemptId = existing[0].attempt_id;
      await connection.execute(
        "UPDATE exam_attempt SET score = ?, finished_at = NOW() WHERE attempt_id = ?",
        [score, attemptId],
      );
    } else {
      const [attempt] = await connection.execute(
        "INSERT INTO exam_attempt (exam_id, user_id, score, started_at, finished_at) VALUES (?, ?, ?, NOW(), NOW())",
        [examId, userId, score],
      );
      attemptId = attempt.insertId;
    }

    // Also update user_exam_mapping for overall progress tracking
    const [mappingExists] = await connection.execute(
      "SELECT user_exam_id FROM user_exam_mapping WHERE exam_id = ? AND user_id = ?",
      [examId, userId],
    );

    if (mappingExists.length > 0) {
      await connection.execute(
        "UPDATE user_exam_mapping SET score = ?, is_finish = 1 WHERE user_exam_id = ?",
        [score || 0, mappingExists[0].user_exam_id],
      );
    } else {
      // Column order must match schema: exam_id, is_finish, score, user_id
      await connection.execute(
        "INSERT INTO user_exam_mapping (exam_id, is_finish, score, user_id) VALUES (?, 1, ?, ?)",
        [examId, score || 0, userId],
      );
    }

    if (details && details.length > 0) {
      // Bug fix: query only mappings that belong to the current (latest) attempt
      const [mappings] = await connection.execute(
        `SELECT question_exam_user_id FROM question_exam_user_mapping 
         WHERE exam_id = ? AND user_id = ? AND attempt_id = ? ORDER BY question_exam_user_id ASC`,
        [examId, userId, attemptId],
      );
      for (let i = 0; i < Math.min(details.length, mappings.length); i++) {
        if (details[i] && typeof details[i].isCorrect === "boolean") {
          await connection.execute(
            "UPDATE question_exam_user_mapping SET is_correct = ? WHERE question_exam_user_id = ?",
            [details[i].isCorrect ? 1 : 0, mappings[i].question_exam_user_id],
          );
        }
      }
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw { status: 500, message: err.message };
  } finally {
    connection.release();
  }
}

module.exports = {
  createExam,
  getExams,
  getExamById,
  getExamsByCreator,
  getExamsByType,
  updateExam,
  deleteExam,
  deleteExamsByClassroom,
  submitExam,
  getExamResults,
  getExamStatistics,
  getStudentExamAttempts,
  createPracticeAttempt,
  savePracticeQuestionVideo,
  getPracticeSubmission,
  getAllPracticalSubmissions,
  markPracticeExam,
};
