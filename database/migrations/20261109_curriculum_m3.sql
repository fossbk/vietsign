-- G4C: additive group ownership and explicit speaker scopes. No legacy ALTER/update.
CREATE TABLE IF NOT EXISTS curriculum_learning_group (
 group_code VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
 title VARCHAR(255) NOT NULL, lesson_codes JSON NOT NULL, source_refs JSON NOT NULL,
 editorial_status VARCHAR(30) NOT NULL DEFAULT 'requires_D07',
 publication_status VARCHAR(20) NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_group_activity (
 activity_id BIGINT PRIMARY KEY,
 group_code VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 content_level VARCHAR(1) NOT NULL, variant_code VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_column VARCHAR(1) NOT NULL, source_refs JSON NOT NULL,
 UNIQUE KEY uk_group_variant(group_code,content_level,variant_code),
 FOREIGN KEY(activity_id) REFERENCES curriculum_activity(activity_id),
 FOREIGN KEY(group_code) REFERENCES curriculum_learning_group(group_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curriculum_group_practice_scope (
 practice_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 speaker VARCHAR(100) NULL, task_ids JSON NOT NULL,
 FOREIGN KEY(practice_id) REFERENCES curriculum_class_practice(practice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
