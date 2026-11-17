-- G4B / M2: additive class context, immutable reviews and resubmission lineage.
-- No legacy rows, content versions, attempts, answers or results are updated.
CREATE TABLE IF NOT EXISTS curriculum_class_practice (
 practice_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 class_room_id BIGINT NOT NULL, activity_id BIGINT NOT NULL, version_id BIGINT NOT NULL,
 created_by BIGINT NOT NULL, request_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'open', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_practice_request(created_by,request_id), KEY ix_practice_class(class_room_id,status),
 FOREIGN KEY(class_room_id) REFERENCES class_room(class_room_id),
 FOREIGN KEY(activity_id) REFERENCES curriculum_activity(activity_id),
 FOREIGN KEY(version_id) REFERENCES curriculum_activity_version(version_id),
 FOREIGN KEY(created_by) REFERENCES user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_attempt_class (
 attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 practice_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_attempt_practice(practice_id),
 FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id),
 FOREIGN KEY(practice_id) REFERENCES curriculum_class_practice(practice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_item_review (
 review_id BIGINT AUTO_INCREMENT PRIMARY KEY,
 attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 task_id VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 upload_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reviewer_id BIGINT NOT NULL, verdict VARCHAR(30) NOT NULL, comment TEXT NOT NULL,
 request_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 supersedes_review_id BIGINT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_review_request(reviewer_id,request_id), KEY ix_review_task(attempt_id,task_id,review_id),
 FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id),
 FOREIGN KEY(upload_id) REFERENCES curriculum_upload(upload_id),
 FOREIGN KEY(reviewer_id) REFERENCES user(user_id),
 FOREIGN KEY(supersedes_review_id) REFERENCES curriculum_item_review(review_id),
 CONSTRAINT ck_review_verdict CHECK (verdict IN ('accepted','needs_revision'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_resubmission (
 attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 parent_attempt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scope_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 requested_reviews JSON NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_resubmission_scope(parent_attempt_id,scope_hash),
 UNIQUE KEY uk_resubmission_request(parent_attempt_id,request_id),
 FOREIGN KEY(attempt_id) REFERENCES curriculum_attempt(attempt_id),
 FOREIGN KEY(parent_attempt_id) REFERENCES curriculum_attempt(attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
