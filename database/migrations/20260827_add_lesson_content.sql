SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'content'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN content TEXT DEFAULT NULL AFTER created_by',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'topic_id'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN topic_id BIGINT DEFAULT NULL AFTER content',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'description'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN description TEXT DEFAULT NULL AFTER topic_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'image_location'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN image_location VARCHAR(500) DEFAULT NULL AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'video_location'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN video_location VARCHAR(500) DEFAULT NULL AFTER image_location',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'difficulty_level'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN difficulty_level VARCHAR(20) DEFAULT ''MEDIUM'' AFTER video_location',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'order_number'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN order_number INT DEFAULT 0 AFTER difficulty_level',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lesson'
    AND COLUMN_NAME = 'is_active'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE lesson ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER order_number',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
