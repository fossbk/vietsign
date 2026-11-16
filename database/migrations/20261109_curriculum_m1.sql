-- G1 / M1. Apply after the existing curriculum + AI queue migrations.
-- Additive: no legacy rows/IDs are deleted or promoted to verified results.
CREATE TABLE IF NOT EXISTS curriculum_content_item (
 item_id VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
 item_type VARCHAR(40) NOT NULL, label VARCHAR(255) NOT NULL, sense VARCHAR(255),
 source_refs JSON NOT NULL, approval_status VARCHAR(20) NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_asset (
 asset_id BIGINT AUTO_INCREMENT PRIMARY KEY, item_id VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 role VARCHAR(40) NOT NULL, provider VARCHAR(30) NOT NULL, lookup_url VARCHAR(1000),
 playable_url VARCHAR(1000), verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified', source_refs JSON NOT NULL,
 FOREIGN KEY (item_id) REFERENCES curriculum_content_item(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_activity_version (
 version_id BIGINT AUTO_INCREMENT PRIMARY KEY, activity_id BIGINT NOT NULL, version_number INT NOT NULL,
 content_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 publication_status VARCHAR(20) NOT NULL DEFAULT 'draft', config JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_activity_version(activity_id,version_number), UNIQUE KEY uk_activity_hash(activity_id,content_hash),
 FOREIGN KEY (activity_id) REFERENCES curriculum_activity(activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_attempt (
 attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id BIGINT NOT NULL, activity_id BIGINT NOT NULL, version_id BIGINT NOT NULL,
 request_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 is_preview TINYINT NOT NULL DEFAULT 0, snapshot JSON NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'open',
 submit_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin, result JSON,
 started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, finalized_at DATETIME,
 UNIQUE KEY uk_attempt_request(user_id,activity_id,request_id),
 FOREIGN KEY(user_id) REFERENCES user(user_id), FOREIGN KEY(activity_id) REFERENCES curriculum_activity(activity_id),
 FOREIGN KEY(version_id) REFERENCES curriculum_activity_version(version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_attempt_answer (
 answer_id BIGINT AUTO_INCREMENT PRIMARY KEY, attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 task_id VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 payload JSON NOT NULL, response JSON NOT NULL, is_correct TINYINT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_answer_event(attempt_id,event_id), FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_upload (
 upload_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id BIGINT NOT NULL, attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 task_id VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 object_key VARCHAR(500) NOT NULL UNIQUE, mime_type VARCHAR(80) NOT NULL, byte_size INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES user(user_id), FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE curriculum_game_progress
 ADD COLUMN attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN version_id BIGINT NULL,
 ADD COLUMN result_source VARCHAR(30) NOT NULL DEFAULT 'legacy_unverified',
 ADD COLUMN review_status VARCHAR(30) NOT NULL DEFAULT 'legacy_unverified',
 ADD UNIQUE KEY uk_progress_attempt(attempt_id),
 ADD FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id),
 ADD FOREIGN KEY(version_id) REFERENCES curriculum_activity_version(version_id);
