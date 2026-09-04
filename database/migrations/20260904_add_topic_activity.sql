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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
