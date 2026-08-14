SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_exam_user_mapping'
    AND COLUMN_NAME = 'ai_result_json'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE question_exam_user_mapping ADD COLUMN ai_result_json TEXT DEFAULT NULL AFTER ai_result',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
