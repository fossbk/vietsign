const db = require("../../../db");
const { minioClient, bucketName } = require("../../../utils/minio");
const aiPracticeService = require("../../ai-practice/services/aiPractice.service");

const positiveInt = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
};

const POLL_INTERVAL_MS = positiveInt(
  process.env.CURRICULUM_AI_POLL_INTERVAL_MS,
  2000,
  1000,
  60000,
);
const MAX_ATTEMPTS = positiveInt(
  process.env.CURRICULUM_AI_MAX_ATTEMPTS,
  3,
  1,
  10,
);
const MAX_VIDEO_BYTES = positiveInt(
  process.env.AI_MODEL_MAX_FILE_SIZE_BYTES,
  10 * 1024 * 1024,
  1024 * 1024,
  100 * 1024 * 1024,
);
const STALE_LOCK_MINUTES = positiveInt(
  process.env.CURRICULUM_AI_STALE_LOCK_MINUTES,
  10,
  1,
  1440,
);

let schemaPromise = null;
let workerStarted = false;
let workerRunning = false;

const ensureColumn = async (columnName, definition) => {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'curriculum_game_progress'
        AND COLUMN_NAME = ?`,
    [columnName],
  );

  if (!rows.length) {
    await db.execute(`ALTER TABLE curriculum_game_progress ADD COLUMN ${definition}`);
  }
};

const ensureQueueSchema = () => {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS curriculum_ai_job (
          job_id BIGINT NOT NULL AUTO_INCREMENT,
          progress_id BIGINT NOT NULL,
          activity_id BIGINT NOT NULL,
          user_id BIGINT NOT NULL,
          video_url VARCHAR(500) NOT NULL,
          target_text VARCHAR(255) DEFAULT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'queued',
          attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
          available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          locked_at DATETIME DEFAULT NULL,
          ai_attempt_id BIGINT UNSIGNED DEFAULT NULL,
          result_json JSON DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (job_id),
          UNIQUE KEY uk_curriculum_ai_job_progress (progress_id),
          KEY idx_curriculum_ai_job_status (status, available_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await ensureColumn("ai_status", "ai_status VARCHAR(20) NOT NULL DEFAULT 'not_requested' AFTER is_completed");
      await ensureColumn("ai_attempt_id", "ai_attempt_id BIGINT UNSIGNED DEFAULT NULL AFTER ai_status");
      await ensureColumn("ai_score", "ai_score DECIMAL(5,2) DEFAULT NULL AFTER ai_attempt_id");
      await ensureColumn("ai_confidence", "ai_confidence DECIMAL(7,6) DEFAULT NULL AFTER ai_score");
      await ensureColumn("ai_error_message", "ai_error_message TEXT DEFAULT NULL AFTER ai_confidence");
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
};

const parseStoredVideoUrl = (videoUrl) => {
  const value = String(videoUrl || "").trim();
  const match = value.match(/^\/uploads\/([^?#]+)$/);
  if (!match || match[1].includes("..")) {
    const error = new Error("Video submission path is invalid");
    error.status = 400;
    throw error;
  }

  let objectKey;
  try {
    objectKey = decodeURIComponent(match[1]);
  } catch {
    const error = new Error("Video submission path is invalid");
    error.status = 400;
    throw error;
  }

  if (!/^curriculum-practice\/[^/\\]+$/.test(objectKey)) {
    const error = new Error("Video submission path is invalid");
    error.status = 400;
    throw error;
  }

  const filename = objectKey.slice("curriculum-practice/".length);
  if (filename === "." || filename === "..") {
    const error = new Error("Video submission path is invalid");
    error.status = 400;
    throw error;
  }

  return objectKey;
};

const streamToBuffer = async (stream, maxBytes) => {
  const chunks = [];
  let total = 0;

  for await (const chunk of stream) {
    total += chunk.length;
    if (total > maxBytes) {
      stream.destroy?.();
      const error = new Error("Video exceeds the AI processing size limit");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks, total);
};

const getStoredVideo = async (videoUrl) => {
  const objectKey = parseStoredVideoUrl(videoUrl);
  const stat = await minioClient.statObject(bucketName, objectKey);
  if (Number(stat.size) > MAX_VIDEO_BYTES) {
    const error = new Error("Video exceeds the AI processing size limit");
    error.status = 413;
    throw error;
  }

  const stream = await minioClient.getObject(bucketName, objectKey);
  const buffer = await streamToBuffer(stream, MAX_VIDEO_BYTES);
  const metadata = stat.metaData || {};

  return {
    buffer,
    mimetype: metadata["content-type"] || metadata["Content-Type"] || "video/webm",
    originalname: objectKey.split("/").pop() || "practice.webm",
  };
};

const calculateAiScore = (attempt) => {
  if (attempt?.is_match === true) return 100;
  if (attempt?.is_match === false) return 0;

  const confidence = Number(attempt?.confidence);
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(100, Math.max(0, Math.round(confidence * 100)));
};

const calculateStars = (score) => {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score > 0) return 1;
  return 0;
};

const recoverStaleJobs = async () => {
  await db.execute(
    `UPDATE curriculum_ai_job
        SET status = 'queued', locked_at = NULL, available_at = NOW(), updated_at = NOW()
      WHERE status = 'processing'
        AND locked_at < DATE_SUB(NOW(), INTERVAL ${STALE_LOCK_MINUTES} MINUTE)`,
  );
};

const claimNextJob = async () => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT j.job_id, j.progress_id, j.activity_id, j.user_id,
              j.video_url, j.target_text, j.attempts, a.pass_score
         FROM curriculum_ai_job j
         JOIN curriculum_activity a ON a.activity_id = j.activity_id
        WHERE j.status = 'queued'
          AND j.available_at <= NOW()
          AND j.attempts < ?
        ORDER BY j.job_id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [MAX_ATTEMPTS],
    );

    if (!rows.length) {
      await connection.commit();
      return null;
    }

    const job = rows[0];
    await connection.execute(
      `UPDATE curriculum_ai_job
          SET status = 'processing', attempts = attempts + 1, locked_at = NOW(), updated_at = NOW()
        WHERE job_id = ?`,
      [job.job_id],
    );
    await connection.execute(
      `UPDATE curriculum_game_progress
          SET ai_status = 'processing', ai_error_message = NULL
        WHERE progress_id = ?`,
      [job.progress_id],
    );
    await connection.commit();
    return { ...job, attempts: Number(job.attempts) + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const markJobRetry = async (job, error) => {
  const retry = job.attempts < MAX_ATTEMPTS;
  const status = retry ? "queued" : "failed";
  const delaySeconds = Math.min(60, 2 ** Math.max(0, job.attempts - 1) * 5);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE curriculum_ai_job
          SET status = ?, locked_at = NULL,
              available_at = IF(? = 'queued', DATE_ADD(NOW(), INTERVAL ${delaySeconds} SECOND), NOW()),
              error_message = ?, updated_at = NOW()
        WHERE job_id = ?`,
      [status, status, String(error.message || "AI processing failed").slice(0, 1000), job.job_id],
    );
    await connection.execute(
      `UPDATE curriculum_game_progress
          SET ai_status = ?, ai_error_message = ?
        WHERE progress_id = ?`,
      [status, String(error.message || "AI processing failed").slice(0, 1000), job.progress_id],
    );
    await connection.commit();
  } catch (updateError) {
    await connection.rollback();
    throw updateError;
  } finally {
    connection.release();
  }
};

const markJobCompleted = async (job, attempt) => {
  const score = calculateAiScore(attempt);
  const stars = calculateStars(score);
  const isCompleted = score >= Number(job.pass_score || 80) ? 1 : 0;
  const resultJson = JSON.stringify(attempt.raw_response || {});
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE curriculum_ai_job
          SET status = 'completed', locked_at = NULL, ai_attempt_id = ?,
              result_json = ?, error_message = NULL, updated_at = NOW()
        WHERE job_id = ?`,
      [attempt.attempt_id, resultJson, job.job_id],
    );
    await connection.execute(
      `UPDATE curriculum_game_progress
          SET ai_status = 'completed', ai_attempt_id = ?, ai_score = ?,
              ai_confidence = ?, ai_error_message = NULL, is_completed = ?
        WHERE progress_id = ?`,
      [attempt.attempt_id, score, attempt.confidence, isCompleted, job.progress_id],
    );
    await connection.execute(
      `UPDATE curriculum_user_activity_summary
          SET best_score = GREATEST(best_score, ?),
              best_stars = GREATEST(best_stars, ?),
              is_completed = GREATEST(is_completed, ?),
              last_played_at = NOW(), updated_at = NOW()
        WHERE user_id = ? AND activity_id = ?`,
      [score, stars, isCompleted, job.user_id, job.activity_id],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const processNextJob = async () => {
  await ensureQueueSchema();
  await recoverStaleJobs();
  const job = await claimNextJob();
  if (!job) return false;

  try {
    const file = await getStoredVideo(job.video_url);
    const result = await aiPracticeService.predictModel3({ file });
    const attempt = await aiPracticeService.saveModel3Attempt({
      userId: job.user_id,
      targetText: job.target_text,
      mode: "match",
      result,
    });
    await markJobCompleted(job, attempt);
  } catch (error) {
    await markJobRetry(job, error);
  }

  return true;
};

const poll = async () => {
  if (workerRunning) return;
  workerRunning = true;
  try {
    await processNextJob();
  } catch (error) {
    console.error("Curriculum AI worker error:", error.message);
  } finally {
    workerRunning = false;
  }
};

const startCurriculumAiWorker = () => {
  if (workerStarted) return;
  workerStarted = true;
  poll();
  const timer = setInterval(poll, POLL_INTERVAL_MS);
  timer.unref?.();
};

module.exports = {
  ensureQueueSchema,
  startCurriculumAiWorker,
  parseStoredVideoUrl,
  calculateAiScore,
  calculateStars,
  processNextJob,
};
