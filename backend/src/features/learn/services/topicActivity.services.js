const db = require("../../../db");

let schemaPromise;

async function ensureTopicActivitySchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS topic_quiz_attempt (
          attempt_id BIGINT NOT NULL AUTO_INCREMENT,
          topic_id BIGINT NOT NULL,
          user_id BIGINT NOT NULL,
          total_questions INT NOT NULL DEFAULT 0,
          correct_answers INT NOT NULL DEFAULT 0,
          score DECIMAL(10,2) NOT NULL DEFAULT 0,
          started_at DATETIME DEFAULT NULL,
          finished_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          details JSON DEFAULT NULL,
          PRIMARY KEY (attempt_id),
          KEY idx_topic_quiz_topic_user (topic_id, user_id),
          CONSTRAINT fk_topic_quiz_topic FOREIGN KEY (topic_id) REFERENCES topic (topic_id),
          CONSTRAINT fk_topic_quiz_user FOREIGN KEY (user_id) REFERENCES user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS topic_game_attempt (
          attempt_id BIGINT NOT NULL AUTO_INCREMENT,
          topic_id BIGINT NOT NULL,
          user_id BIGINT NOT NULL,
          game_type VARCHAR(50) NOT NULL DEFAULT 'MEMORY_MATCH',
          score DECIMAL(10,2) NOT NULL DEFAULT 0,
          matched_pairs INT NOT NULL DEFAULT 0,
          total_pairs INT NOT NULL DEFAULT 0,
          moves INT NOT NULL DEFAULT 0,
          duration_seconds INT DEFAULT NULL,
          played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          details JSON DEFAULT NULL,
          PRIMARY KEY (attempt_id),
          KEY idx_topic_game_topic_user (topic_id, user_id),
          CONSTRAINT fk_topic_game_topic FOREIGN KEY (topic_id) REFERENCES topic (topic_id),
          CONSTRAINT fk_topic_game_user FOREIGN KEY (user_id) REFERENCES user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function jsonValue(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

async function recordQuizAttempt(userId, topicId, payload = {}) {
  await ensureTopicActivitySchema();
  const totalQuestions = Math.max(0, Number(payload.totalQuestions) || 0);
  const correctAnswers = Math.min(
    totalQuestions,
    Math.max(0, Number(payload.correctAnswers) || 0),
  );
  const score = Math.min(100, Math.max(0, Number(payload.score) || 0));

  const [result] = await db.execute(
    `INSERT INTO topic_quiz_attempt
      (topic_id, user_id, total_questions, correct_answers, score, started_at, finished_at, details)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      topicId,
      userId,
      totalQuestions,
      correctAnswers,
      score,
      payload.startedAt || null,
      jsonValue(payload.details),
    ],
  );
  return { attemptId: result.insertId, score, correctAnswers, totalQuestions };
}

async function recordGameAttempt(userId, topicId, payload = {}) {
  await ensureTopicActivitySchema();
  const totalPairs = Math.max(0, Number(payload.totalPairs) || 0);
  const matchedPairs = Math.min(
    totalPairs,
    Math.max(0, Number(payload.matchedPairs) || 0),
  );
  const score = Math.max(0, Number(payload.score) || 0);

  const [result] = await db.execute(
    `INSERT INTO topic_game_attempt
      (topic_id, user_id, game_type, score, matched_pairs, total_pairs, moves, duration_seconds, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      topicId,
      userId,
      payload.gameType || "MEMORY_MATCH",
      score,
      matchedPairs,
      totalPairs,
      Math.max(0, Number(payload.moves) || 0),
      payload.durationSeconds == null ? null : Math.max(0, Number(payload.durationSeconds) || 0),
      jsonValue(payload.details),
    ],
  );
  return { attemptId: result.insertId, score, matchedPairs, totalPairs };
}

async function getTopicStudentStatistics(topicId, classroomId) {
  await ensureTopicActivitySchema();
  const [rows] = await db.execute(
    `SELECT
       u.user_id AS studentId,
       u.name AS studentName,
       COUNT(DISTINCT tv.vocabulary_id) AS totalVocabulary,
       COUNT(DISTINCT CASE WHEN uvp.is_learned = 1 THEN tv.vocabulary_id END) AS learnedVocabulary,
       COALESCE(MAX(qa.score), 0) AS quizBestScore,
       COALESCE((SELECT qa2.score FROM topic_quiz_attempt qa2
          WHERE qa2.topic_id = ? AND qa2.user_id = u.user_id
          ORDER BY qa2.finished_at DESC, qa2.attempt_id DESC LIMIT 1), 0) AS quizLatestScore,
       COALESCE(MAX(ga.score), 0) AS gameBestScore,
       COALESCE((SELECT ga2.score FROM topic_game_attempt ga2
          WHERE ga2.topic_id = ? AND ga2.user_id = u.user_id
          ORDER BY ga2.played_at DESC, ga2.attempt_id DESC LIMIT 1), 0) AS gameLatestScore,
       COUNT(DISTINCT qa.attempt_id) AS quizAttempts,
       COUNT(DISTINCT ga.attempt_id) AS gameAttempts
     FROM class_student cs
     INNER JOIN user u ON u.user_id = cs.user_id AND u.is_deleted = 0
     CROSS JOIN topic_vocabulary tv
     LEFT JOIN user_vocabulary_progress uvp
       ON uvp.user_id = u.user_id AND uvp.vocabulary_id = tv.vocabulary_id
     LEFT JOIN topic_quiz_attempt qa
       ON qa.topic_id = tv.topic_id AND qa.user_id = u.user_id
     LEFT JOIN topic_game_attempt ga
       ON ga.topic_id = tv.topic_id AND ga.user_id = u.user_id
     WHERE cs.class_room_id = ? AND tv.topic_id = ?
     GROUP BY u.user_id, u.name
     ORDER BY u.name ASC`,
    [topicId, topicId, classroomId, topicId],
  );

  return rows.map((row) => ({
    ...row,
    totalVocabulary: Number(row.totalVocabulary) || 0,
    learnedVocabulary: Number(row.learnedVocabulary) || 0,
    progressPercent: row.totalVocabulary
      ? Math.round((Number(row.learnedVocabulary) / Number(row.totalVocabulary)) * 100)
      : 0,
    quizBestScore: Number(row.quizBestScore) || 0,
    quizLatestScore: Number(row.quizLatestScore) || 0,
    gameBestScore: Number(row.gameBestScore) || 0,
    gameLatestScore: Number(row.gameLatestScore) || 0,
    quizAttempts: Number(row.quizAttempts) || 0,
    gameAttempts: Number(row.gameAttempts) || 0,
  }));
}

module.exports = {
  ensureTopicActivitySchema,
  recordQuizAttempt,
  recordGameAttempt,
  getTopicStudentStatistics,
};
