CREATE TABLE IF NOT EXISTS auth_revoked_token (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_auth_revoked_token_expires_at (expires_at),
  KEY idx_auth_revoked_token_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
