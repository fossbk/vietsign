const crypto = require("crypto");
const db = require("../db");

let schemaPromise;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function ensureRevokedTokenSchema() {
  if (!schemaPromise) {
    schemaPromise = db
      .execute(`
        CREATE TABLE IF NOT EXISTS auth_revoked_token (
          token_hash CHAR(64) NOT NULL,
          user_id BIGINT DEFAULT NULL,
          expires_at DATETIME NOT NULL,
          revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (token_hash),
          KEY idx_auth_revoked_token_expires_at (expires_at),
          KEY idx_auth_revoked_token_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }
  return schemaPromise;
}

async function revokeToken(token, payload) {
  await ensureRevokedTokenSchema();
  const expiresAt = payload?.exp
    ? new Date(payload.exp * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.execute(
    `INSERT INTO auth_revoked_token (token_hash, user_id, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE revoked_at = CURRENT_TIMESTAMP`,
    [hashToken(token), payload?.user_id || null, expiresAt],
  );

  await db.execute("DELETE FROM auth_revoked_token WHERE expires_at <= NOW()");
}

async function isTokenRevoked(token) {
  await ensureRevokedTokenSchema();
  const [rows] = await db.execute(
    `SELECT 1
     FROM auth_revoked_token
     WHERE token_hash = ? AND expires_at > NOW()
     LIMIT 1`,
    [hashToken(token)],
  );
  return rows.length > 0;
}

module.exports = {
  ensureRevokedTokenSchema,
  revokeToken,
  isTokenRevoked,
};
