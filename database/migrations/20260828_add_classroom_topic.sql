CREATE TABLE IF NOT EXISTS classroom_topic (
  classroom_topic_id BIGINT NOT NULL AUTO_INCREMENT,
  classroom_id BIGINT NOT NULL,
  topic_id BIGINT NOT NULL,
  assigned_by BIGINT DEFAULT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (classroom_topic_id),
  UNIQUE KEY uq_classroom_topic (classroom_id, topic_id),
  KEY idx_classroom_topic_topic (topic_id),
  KEY idx_classroom_topic_assigned_by (assigned_by),
  CONSTRAINT fk_classroom_topic_classroom
    FOREIGN KEY (classroom_id) REFERENCES class_room (class_room_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_classroom_topic_topic
    FOREIGN KEY (topic_id) REFERENCES topic (topic_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
