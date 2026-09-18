-- ==============================================================================
-- Migration: 20260918_add_curriculum_activities_and_games.sql
-- Description: Khung nội dung hỗ trợ dạy và học ký hiệu (Lớp 1 - 5)
-- Quy chuẩn ID: 
--   - Level: L1, L2, L3, L4, L5
--   - Topic: BT (Bản thân), GD (Gia đình), TH (Trường học), TN-ĐN (Thiên nhiên - Đất nước)
--   - Lesson Code: [Lớp].[Chủđề].[Sốthứtự] (Ví dụ: L1.BT.01)
--   - Activity Code: [MãBài].[Cấpđộ][STT] (Ví dụ: L1.BT.01.T01, Cấp độ: T=Từ, C=Câu, H=Hội thoại)
--   - Media Code: [ID Bài].[Loại].[STT] (Ví dụ: L1.BT.01.V01)
-- 6+2 Core Games:
--   - FlipCardViewer, LineMatchingGame, ChoiceQuizGame, JigsawPuzzleGame,
--   - BucketDropGame, MemoryCardGame, SequenceOrderGame, VideoPracticeRecorder
-- ==============================================================================

-- 1. Bảng phân cấp bài học theo Level & Topic (Chủ đề)
CREATE TABLE IF NOT EXISTS curriculum_lesson (
  lesson_id BIGINT NOT NULL AUTO_INCREMENT,
  lesson_code VARCHAR(30) NOT NULL COMMENT 'Mã bài học chuẩn format [Lớp].[Chủđề].[Sốthứtự] (VD: L1.BT.01)',
  level_code VARCHAR(10) NOT NULL COMMENT 'Khối lớp: L1, L2, L3, L4, L5',
  topic_code VARCHAR(20) NOT NULL COMMENT 'Chủ đề: BT (Bản thân), GD (Gia đình), TH (Trường học), TN-ĐN (Thiên nhiên - Đất nước)',
  title VARCHAR(255) NOT NULL COMMENT 'Tên bài (VD: Bài 1: A a, B b, thanh huyền)',
  description TEXT DEFAULT NULL COMMENT 'Tóm tắt nội dung/từ khóa trong bài',
  content_status ENUM('ready', 'drafting', 'not_started') NOT NULL DEFAULT 'not_started' COMMENT 'Trạng thái: ready (Đã sẵn sàng), drafting (Đang soạn), not_started (Chưa bắt đầu)',
  display_order INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id),
  UNIQUE KEY uk_curriculum_lesson_code (lesson_code),
  KEY idx_curriculum_level_topic (level_code, topic_code, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Hoạt động (Activity) & Metadata của Core Game Components
CREATE TABLE IF NOT EXISTS curriculum_activity (
  activity_id BIGINT NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT NOT NULL,
  activity_code VARCHAR(50) NOT NULL COMMENT 'Mã hoạt động chuẩn (VD: L1.BT.01.T01 hoặc T01)',
  activity_level ENUM('T', 'C', 'H') NOT NULL DEFAULT 'T' COMMENT 'T=Từ (50%), C=Câu (30%), H=Hội thoại (20%)',
  game_type ENUM(
    'FlipCardViewer',
    'LineMatchingGame',
    'ChoiceQuizGame',
    'JigsawPuzzleGame',
    'BucketDropGame',
    'MemoryCardGame',
    'SequenceOrderGame',
    'VideoPracticeRecorder'
  ) NOT NULL COMMENT 'Tên chuẩn của Game Component frontend',
  title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề hoạt động (VD: 1. Thẻ lật thông minh)',
  instruction TEXT DEFAULT NULL COMMENT 'Mô tả kỹ thuật / hướng dẫn học sinh thực hiện',
  display_order INT NOT NULL DEFAULT 1,
  game_config JSON NOT NULL COMMENT 'Metadata & payload cấu hình logic game (cards, pairs, options...)',
  pass_score DECIMAL(5,2) NOT NULL DEFAULT 80.00 COMMENT 'Tỉ lệ đạt yêu cầu (%)',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id),
  UNIQUE KEY uk_curriculum_lesson_activity (lesson_id, activity_code),
  KEY idx_curriculum_game_type (game_type),
  CONSTRAINT fk_curriculum_act_lesson FOREIGN KEY (lesson_id) 
    REFERENCES curriculum_lesson (lesson_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng lưu media độc lập cho hoạt động (Video/Image)
CREATE TABLE IF NOT EXISTS curriculum_media (
  media_id BIGINT NOT NULL AUTO_INCREMENT,
  activity_id BIGINT NOT NULL,
  media_code VARCHAR(50) NOT NULL COMMENT 'Chuẩn [ID Bài].[Loại].[STT], vd: L1.BT.01.V01',
  media_type ENUM('video', 'image') NOT NULL,
  source_url VARCHAR(500) NOT NULL COMMENT 'Link YouTube/QIPEDC gốc',
  display_order INT DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (media_id),
  UNIQUE KEY uk_curriculum_media_code (media_code),
  KEY idx_curriculum_media_activity (activity_id),
  CONSTRAINT fk_curriculum_media_activity FOREIGN KEY (activity_id) 
    REFERENCES curriculum_activity (activity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng LỊCH SỬ làm bài/hoàn thành hoạt động của học sinh (History Log)
CREATE TABLE IF NOT EXISTS curriculum_game_progress (
  progress_id BIGINT NOT NULL AUTO_INCREMENT,
  activity_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  game_type VARCHAR(50) NOT NULL COMMENT 'Redundant column for fast filtering without joins',
  score DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Điểm số / Tỉ lệ chính xác (%) của lần làm này',
  stars TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Đánh giá 0 - 3 sao',
  duration_seconds INT DEFAULT NULL COMMENT 'Thời gian hoàn thành (giây)',
  is_completed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Đạt yêu cầu ở lần làm này',
  submission_video_url VARCHAR(500) DEFAULT NULL COMMENT 'Video upload cho hoạt động VideoPracticeRecorder',
  teacher_feedback TEXT DEFAULT NULL COMMENT 'Đánh giá/nhận xét của giáo viên cho lần nộp này',
  game_result_details JSON DEFAULT NULL COMMENT 'Chi tiết kết quả (lượt lật, đáp án, AI confidence...)',
  played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (progress_id),
  KEY idx_curriculum_prog_user_act (user_id, activity_id),
  KEY idx_curriculum_prog_activity (activity_id),
  KEY idx_curriculum_prog_user (user_id, is_completed),
  CONSTRAINT fk_curriculum_prog_activity FOREIGN KEY (activity_id) 
    REFERENCES curriculum_activity (activity_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_prog_user FOREIGN KEY (user_id) 
    REFERENCES user (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng TỔNG HỢP tiến độ mới nhất & cao nhất theo học sinh và hoạt động (Summary)
CREATE TABLE IF NOT EXISTS curriculum_user_activity_summary (
  summary_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  best_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  best_stars TINYINT UNSIGNED NOT NULL DEFAULT 0,
  total_attempts INT NOT NULL DEFAULT 1,
  last_progress_id BIGINT DEFAULT NULL COMMENT 'FK trỏ về lượt nộp gần nhất trong bảng lịch sử',
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  last_played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (summary_id),
  UNIQUE KEY uk_summary_user_activity (user_id, activity_id),
  KEY idx_summary_user_completed (user_id, is_completed),
  KEY idx_summary_activity (activity_id),
  CONSTRAINT fk_summary_user FOREIGN KEY (user_id) 
    REFERENCES user (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_summary_activity FOREIGN KEY (activity_id) 
    REFERENCES curriculum_activity (activity_id) ON DELETE CASCADE,
  CONSTRAINT fk_summary_last_progress FOREIGN KEY (last_progress_id) 
    REFERENCES curriculum_game_progress (progress_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
