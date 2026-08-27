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
