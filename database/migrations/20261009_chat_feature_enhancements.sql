-- Migration: Enhance chat schema for VietSign
-- Tables: conversation, group_member, message

ALTER TABLE `message` MODIFY COLUMN `content` TEXT NULL;

-- 1. Conversation tracking columns
SET @col_pinned := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation' AND COLUMN_NAME = 'pinned_message_id');
SET @sql_pinned := IF(@col_pinned = 0, 'ALTER TABLE `conversation` ADD COLUMN `pinned_message_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_pinned; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_last_msg := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation' AND COLUMN_NAME = 'last_message_id');
SET @sql_last_msg := IF(@col_last_msg = 0, 'ALTER TABLE `conversation` ADD COLUMN `last_message_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_last_msg; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_last_at := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation' AND COLUMN_NAME = 'last_message_at');
SET @sql_last_at := IF(@col_last_at = 0, 'ALTER TABLE `conversation` ADD COLUMN `last_message_at` DATETIME(6) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_last_at; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Group member user tracking columns
SET @col_uid := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_member' AND COLUMN_NAME = 'user_id');
SET @sql_uid := IF(@col_uid = 0, 'ALTER TABLE `group_member` ADD COLUMN `user_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_uid; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_read := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_member' AND COLUMN_NAME = 'last_read_message_id');
SET @sql_read := IF(@col_read = 0, 'ALTER TABLE `group_member` ADD COLUMN `last_read_message_id` BIGINT DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_read; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Message columns
SET @col_cid := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND COLUMN_NAME = 'conversation_id');
SET @sql_cid := IF(@col_cid = 0, 'ALTER TABLE `message` ADD COLUMN `conversation_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_cid; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_sid := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND COLUMN_NAME = 'sender_id');
SET @sql_sid := IF(@col_sid = 0, 'ALTER TABLE `message` ADD COLUMN `sender_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_sid; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_rid := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND COLUMN_NAME = 'reply_to_id');
SET @sql_rid := IF(@col_rid = 0, 'ALTER TABLE `message` ADD COLUMN `reply_to_id` BIGINT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_rid; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_del := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND COLUMN_NAME = 'is_deleted');
SET @sql_del := IF(@col_del = 0, 'ALTER TABLE `message` ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_del; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_edt := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND COLUMN_NAME = 'is_edited');
SET @sql_edt := IF(@col_edt = 0, 'ALTER TABLE `message` ADD COLUMN `is_edited` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_edt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes & Constraints
SET @idx_msg := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND INDEX_NAME = 'idx_msg_conv_date');
SET @sql_idx_msg := IF(@idx_msg = 0, 'ALTER TABLE `message` ADD INDEX `idx_msg_conv_date` (`conversation_id`, `created_date`)', 'SELECT 1');
PREPARE stmt FROM @sql_idx_msg; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_gm := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_member' AND INDEX_NAME = 'idx_gm_conv_user');
SET @sql_idx_gm := IF(@idx_gm = 0, 'ALTER TABLE `group_member` ADD INDEX `idx_gm_conv_user` (`conversation_id`, `user_id`)', 'SELECT 1');
PREPARE stmt FROM @sql_idx_gm; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_mc := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND CONSTRAINT_NAME = 'fk_message_conv');
SET @sql_fk_mc := IF(@fk_mc = 0, 'ALTER TABLE `message` ADD CONSTRAINT `fk_message_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`conversation_id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql_fk_mc; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_ms := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'message' AND CONSTRAINT_NAME = 'fk_message_sender');
SET @sql_fk_ms := IF(@fk_ms = 0, 'ALTER TABLE `message` ADD CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql_fk_ms; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_gmu := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_member' AND CONSTRAINT_NAME = 'fk_gm_user');
SET @sql_fk_gmu := IF(@fk_gmu = 0, 'ALTER TABLE `group_member` ADD CONSTRAINT `fk_gm_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql_fk_gmu; EXECUTE stmt; DEALLOCATE PREPARE stmt;
