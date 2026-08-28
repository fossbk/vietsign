CREATE TABLE IF NOT EXISTS topic_vocabulary (
  topic_vocabulary_id BIGINT NOT NULL AUTO_INCREMENT,
  topic_id BIGINT NOT NULL,
  vocabulary_id BIGINT NOT NULL,
  added_by BIGINT DEFAULT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (topic_vocabulary_id),
  UNIQUE KEY uq_topic_vocabulary (topic_id, vocabulary_id),
  KEY idx_topic_vocabulary_vocabulary (vocabulary_id),
  CONSTRAINT fk_topic_vocabulary_topic
    FOREIGN KEY (topic_id) REFERENCES topic (topic_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_topic_vocabulary_vocabulary
    FOREIGN KEY (vocabulary_id) REFERENCES vocabulary (vocabulary_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO topic_vocabulary (topic_id, vocabulary_id, added_by)
SELECT topic_id, vocabulary_id, created_id
FROM vocabulary
WHERE topic_id IS NOT NULL AND status = 'APPROVED'
ON DUPLICATE KEY UPDATE topic_id = VALUES(topic_id);
