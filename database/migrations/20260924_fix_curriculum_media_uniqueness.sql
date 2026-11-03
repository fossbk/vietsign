-- Allow the same lesson-level media code to be used by different activities.
-- Run once on databases created with 20260918_add_curriculum_activities_and_games.sql.
ALTER TABLE curriculum_media
  DROP INDEX uk_curriculum_media_code,
  ADD UNIQUE KEY uk_curriculum_activity_media_code (activity_id, media_code);
