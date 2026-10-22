require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "vietsignschool",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  typeCast: function (field, next) {
    if (field.type === "BIT" && field.length === 1) {
      const bytes = field.buffer();
      return bytes ? bytes[0] === 1 : false;
    }
    return next();
  },
});

function isDatabaseError(err) {
  if (!err) return false;
  const dbCodes = [
    "ECONNREFUSED",
    "PROTOCOL_CONNECTION_LOST",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
    "ER_CON_COUNT_ERROR",
    "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
    "ECONNRESET",
    "EPIPE",
    "ER_SERVER_SHUTDOWN",
    "PROTOCOL_PACKETS_OUT_OF_ORDER",
  ];
  return (
    dbCodes.includes(err.code) ||
    err.sqlMessage !== undefined ||
    err.sqlState !== undefined
  );
}

async function checkDbConnection() {
  try {
    const [rows] = await pool.query("SELECT 1 AS alive");
    return { ok: rows[0]?.alive === 1, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}

pool.checkDbConnection = checkDbConnection;
pool.isDatabaseError = isDatabaseError;

module.exports = pool;
module.exports.isDatabaseError = isDatabaseError;
