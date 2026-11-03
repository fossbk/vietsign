SET NAMES utf8mb4;

UPDATE curriculum_lesson lesson
JOIN curriculum_activity activity ON activity.lesson_id = lesson.lesson_id
JOIN curriculum_media media ON media.activity_id = activity.activity_id
   AND media.source_url LIKE '%defaultvideo%'
SET lesson.content_status = 'drafting'
WHERE lesson.content_status = 'ready';

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
  KEY idx_curriculum_ai_job_status (status, available_at),
  KEY idx_curriculum_ai_job_user (user_id, created_at),
  CONSTRAINT fk_curriculum_ai_job_progress FOREIGN KEY (progress_id)
    REFERENCES curriculum_game_progress (progress_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_ai_job_activity FOREIGN KEY (activity_id)
    REFERENCES curriculum_activity (activity_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_ai_job_user FOREIGN KEY (user_id)
    REFERENCES user (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE job
  FROM curriculum_ai_job job
  LEFT JOIN curriculum_game_progress progress ON progress.progress_id = job.progress_id
 WHERE progress.progress_id IS NULL;

DELETE job
  FROM curriculum_ai_job job
  LEFT JOIN curriculum_activity activity ON activity.activity_id = job.activity_id
 WHERE activity.activity_id IS NULL;

DELETE job
  FROM curriculum_ai_job job
  LEFT JOIN `user` account ON account.user_id = job.user_id
 WHERE account.user_id IS NULL;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_ai_job'
    AND INDEX_NAME = 'idx_curriculum_ai_job_user'
);
SET @ddl := IF(
  @index_exists = 0,
  'ALTER TABLE curriculum_ai_job ADD KEY idx_curriculum_ai_job_user (user_id, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_ai_job'
    AND CONSTRAINT_NAME = 'fk_curriculum_ai_job_progress'
);
SET @ddl := IF(
  @constraint_exists = 0,
  'ALTER TABLE curriculum_ai_job ADD CONSTRAINT fk_curriculum_ai_job_progress FOREIGN KEY (progress_id) REFERENCES curriculum_game_progress (progress_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_ai_job'
    AND CONSTRAINT_NAME = 'fk_curriculum_ai_job_activity'
);
SET @ddl := IF(
  @constraint_exists = 0,
  'ALTER TABLE curriculum_ai_job ADD CONSTRAINT fk_curriculum_ai_job_activity FOREIGN KEY (activity_id) REFERENCES curriculum_activity (activity_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_ai_job'
    AND CONSTRAINT_NAME = 'fk_curriculum_ai_job_user'
);
SET @ddl := IF(
  @constraint_exists = 0,
  'ALTER TABLE curriculum_ai_job ADD CONSTRAINT fk_curriculum_ai_job_user FOREIGN KEY (user_id) REFERENCES `user` (user_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_game_progress'
    AND COLUMN_NAME = 'ai_status'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE curriculum_game_progress ADD COLUMN ai_status VARCHAR(20) NOT NULL DEFAULT ''not_requested'' AFTER is_completed',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_game_progress'
    AND COLUMN_NAME = 'ai_attempt_id'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE curriculum_game_progress ADD COLUMN ai_attempt_id BIGINT UNSIGNED DEFAULT NULL AFTER ai_status',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_game_progress'
    AND COLUMN_NAME = 'ai_score'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE curriculum_game_progress ADD COLUMN ai_score DECIMAL(5,2) DEFAULT NULL AFTER ai_attempt_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_game_progress'
    AND COLUMN_NAME = 'ai_confidence'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE curriculum_game_progress ADD COLUMN ai_confidence DECIMAL(7,6) DEFAULT NULL AFTER ai_score',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'curriculum_game_progress'
    AND COLUMN_NAME = 'ai_error_message'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE curriculum_game_progress ADD COLUMN ai_error_message TEXT DEFAULT NULL AFTER ai_confidence',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
