const db = require("../../../db");

function jsonVal(v) {
  return v == null ? null : JSON.stringify(v);
}

// ---------------------------------------------------------------------------
// 1. CURRICULUM READ
// ---------------------------------------------------------------------------

async function getLessons({ level, topic }) {
  let sql = `SELECT lesson_id, lesson_code, level_code, topic_code, title,
                    description, content_status, display_order, is_active
             FROM curriculum_lesson WHERE is_active = 1`;
  const params = [];
  if (level) { sql += " AND level_code = ?"; params.push(level); }
  if (topic) { sql += " AND topic_code = ?"; params.push(topic); }
  sql += " ORDER BY display_order ASC";
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function getLessonByCode(lessonCode) {
  const [lessons] = await db.execute(
    `SELECT * FROM curriculum_lesson WHERE lesson_code = ? AND is_active = 1`,
    [lessonCode],
  );
  if (!lessons.length) return null;
  const lesson = lessons[0];

  const [activities] = await db.execute(
    `SELECT activity_id, activity_code, activity_level, game_type,
            title, instruction, display_order, game_config, pass_score
     FROM curriculum_activity
     WHERE lesson_id = ? AND is_active = 1
     ORDER BY display_order ASC`,
    [lesson.lesson_id],
  );
  return { ...lesson, activities };
}

async function getActivityByCode(activityCode) {
  const [acts] = await db.execute(
    `SELECT a.*, l.lesson_code, l.title AS lesson_title
     FROM curriculum_activity a
     JOIN curriculum_lesson l ON l.lesson_id = a.lesson_id
     WHERE a.activity_code = ? AND a.is_active = 1`,
    [activityCode],
  );
  if (!acts.length) return null;
  const activity = acts[0];

  const [media] = await db.execute(
    `SELECT media_id, media_code, media_type, source_url, display_order
     FROM curriculum_media
     WHERE activity_id = ?
     ORDER BY display_order ASC`,
    [activity.activity_id],
  );
  return { ...activity, media };
}

// ---------------------------------------------------------------------------
// 2. GAME PROGRESS - SUBMIT (TRANSACTION)
// ---------------------------------------------------------------------------

async function submitGameProgress(userId, activityId, payload) {
  // Validate activity exists
  const [acts] = await db.execute(
    "SELECT activity_id, game_type FROM curriculum_activity WHERE activity_id = ?",
    [activityId],
  );
  if (!acts.length) {
    const err = new Error("Hoạt động không tồn tại");
    err.status = 404;
    throw err;
  }
  // Validate user exists
  const [users] = await db.execute(
    "SELECT user_id FROM user WHERE user_id = ? AND is_deleted = 0",
    [userId],
  );
  if (!users.length) {
    const err = new Error("Người dùng không tồn tại");
    err.status = 404;
    throw err;
  }

  const gameType = acts[0].game_type;
  const score = Math.min(100, Math.max(0, Number(payload.score) || 0));
  const stars = Math.min(3, Math.max(0, Number(payload.stars) || 0));
  const duration = payload.durationSeconds == null
    ? null
    : Math.max(0, Number(payload.durationSeconds) || 0);
  const isCompleted = payload.isCompleted ? 1 : 0;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Step a: INSERT history row
    // Columns: activity_id, user_id, game_type, score, stars, duration_seconds,
    //          is_completed, submission_video_url, teacher_feedback, game_result_details, played_at
    // Params:  activityId,  userId,  gameType,  score, stars, duration,
    //          isCompleted,  submissionVideoUrl,  (NULL literal),  gameResultDetails, (NOW() literal)
    const [insertResult] = await conn.execute(
      `INSERT INTO curriculum_game_progress
        (activity_id, user_id, game_type, score, stars, duration_seconds,
         is_completed, submission_video_url, teacher_feedback, game_result_details, played_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW())`,
      [
        activityId, userId, gameType, score, stars, duration,
        isCompleted, payload.submissionVideoUrl || null,
        jsonVal(payload.gameResultDetails),
      ],
    );
    const progressId = insertResult.insertId;

    // Step b: UPSERT summary
    await conn.execute(
      `INSERT INTO curriculum_user_activity_summary
        (user_id, activity_id, best_score, best_stars, total_attempts,
         last_progress_id, is_completed, last_played_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         best_score       = GREATEST(best_score, VALUES(best_score)),
         best_stars       = GREATEST(best_stars, VALUES(best_stars)),
         total_attempts   = total_attempts + 1,
         last_progress_id = VALUES(last_progress_id),
         is_completed     = GREATEST(is_completed, VALUES(is_completed)),
         last_played_at   = NOW()`,
      [userId, activityId, score, stars, progressId, isCompleted],
    );

    await conn.commit();
    return { progressId, score, stars, isCompleted, gameType };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// 3. PROGRESS READ
// ---------------------------------------------------------------------------

async function getUserProgressByLesson(userId, lessonCode) {
  const [rows] = await db.execute(
    `SELECT a.activity_id, a.activity_code, a.game_type, a.title,
            s.best_score, s.best_stars, s.total_attempts,
            s.is_completed, s.last_played_at
     FROM curriculum_activity a
     JOIN curriculum_lesson l ON l.lesson_id = a.lesson_id
     LEFT JOIN curriculum_user_activity_summary s
       ON s.activity_id = a.activity_id AND s.user_id = ?
     WHERE l.lesson_code = ? AND a.is_active = 1
     ORDER BY a.display_order ASC`,
    [userId, lessonCode],
  );
  return rows;
}

async function getActivityHistory(userId, activityId) {
  const [rows] = await db.execute(
    `SELECT progress_id, game_type, score, stars, duration_seconds,
            is_completed, submission_video_url, teacher_feedback,
            game_result_details, played_at
     FROM curriculum_game_progress
     WHERE user_id = ? AND activity_id = ?
     ORDER BY played_at DESC`,
    [userId, activityId],
  );
  return rows;
}

// ---------------------------------------------------------------------------
// 4. TEACHER FEEDBACK
// ---------------------------------------------------------------------------

async function updateFeedback(progressId, teacherFeedback) {
  const [rows] = await db.execute(
    "SELECT progress_id FROM curriculum_game_progress WHERE progress_id = ?",
    [progressId],
  );
  if (!rows.length) {
    const err = new Error("Lần nộp bài không tồn tại");
    err.status = 404;
    throw err;
  }
  await db.execute(
    "UPDATE curriculum_game_progress SET teacher_feedback = ? WHERE progress_id = ?",
    [teacherFeedback, progressId],
  );
  return { progressId, teacherFeedback };
}

async function getUserRole(userId) {
  if (!userId) return null;
  const [rows] = await db.execute("SELECT code FROM user WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].code : null;
}

module.exports = {
  getLessons,
  getLessonByCode,
  getActivityByCode,
  submitGameProgress,
  getUserProgressByLesson,
  getActivityHistory,
  updateFeedback,
  getUserRole,
};
