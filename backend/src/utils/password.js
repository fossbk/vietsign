const bcrypt = require("bcrypt");

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ""));
}

async function verifyPassword(input, storedPassword) {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(String(input || ""), storedPassword);
  }
  return String(input || "") === String(storedPassword);
}

function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

module.exports = { hashPassword, verifyPassword };
