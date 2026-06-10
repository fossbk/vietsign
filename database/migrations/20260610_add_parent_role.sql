INSERT IGNORE INTO `role` (`code`, `description`, `name`)
VALUES ('PARENT', 'Phu huynh hoc sinh', 'Phu huynh');

ALTER TABLE `organization_manager`
  MODIFY `role_in_org` enum(
    'SUPER_ADMIN',
    'CENTER_ADMIN',
    'SCHOOL_ADMIN',
    'TEACHER',
    'STUDENT',
    'PARENT',
    'USER'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
