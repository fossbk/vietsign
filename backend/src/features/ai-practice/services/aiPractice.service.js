const db = require("../../../db");

let historyTableEnsured = false;
const ALLOWED_MODES = new Set(["match", "spell", "free"]);

const normalizeMode = (mode) => {
  const safeMode = String(mode || "match").trim().toLowerCase();
  return ALLOWED_MODES.has(safeMode) ? safeMode : "match";
};

const ensureHistoryTable = async () => {
  if (historyTableEnsured) {
    return;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_practice_attempt (
      attempt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'match',
      target_text VARCHAR(255) DEFAULT NULL,
      predicted_label VARCHAR(255) DEFAULT NULL,
      action_name VARCHAR(255) DEFAULT NULL,
      confidence DECIMAL(7,6) DEFAULT NULL,
      is_match TINYINT(1) DEFAULT NULL,
      vocabulary_id BIGINT DEFAULT NULL,
      topic_id BIGINT DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
      error_message TEXT DEFAULT NULL,
      raw_response JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (attempt_id),
      KEY idx_ai_practice_attempt_user_created (user_id, created_at),
      KEY idx_ai_practice_attempt_topic (topic_id),
      KEY idx_ai_practice_attempt_vocab (vocabulary_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  historyTableEnsured = true;
};

const normalizeText = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const toNullableNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeModelPayload = (payload, targetText, mode) => {
  const predictedLabel =
    payload?.predicted_label ||
    payload?.predictedLabel ||
    payload?.label ||
    payload?.class ||
    payload?.class_name ||
    null;

  const actionName =
    payload?.action_name ||
    payload?.actionName ||
    payload?.recognized ||
    payload?.word ||
    null;

  const confidence =
    toNullableNumber(payload?.confidence) ??
    toNullableNumber(payload?.score) ??
    toNullableNumber(payload?.probability);

  const normalizedTarget = normalizeText(targetText);
  const normalizedPredicted = normalizeText(actionName || predictedLabel);

  let isMatch = null;
  if (mode === "match" || mode === "spell") {
    if (typeof payload?.is_match === "boolean") {
      isMatch = payload.is_match;
    } else if (normalizedTarget && normalizedPredicted) {
      isMatch = normalizedTarget === normalizedPredicted;
    } else {
      isMatch = false;
    }
  }

  return {
    predictedLabel,
    actionName,
    confidence,
    isMatch,
    rawResponse: payload,
  };
};

const insertAttempt = async ({
  userId,
  mode,
  targetText,
  predictedLabel,
  actionName,
  confidence,
  isMatch,
  vocabularyId,
  topicId,
  status,
  errorMessage,
  rawResponse,
}) => {
  const [result] = await db.execute(
    `
      INSERT INTO ai_practice_attempt (
        user_id,
        mode,
        target_text,
        predicted_label,
        action_name,
        confidence,
        is_match,
        vocabulary_id,
        topic_id,
        status,
        error_message,
        raw_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      mode || "match",
      targetText || null,
      predictedLabel || null,
      actionName || null,
      confidence,
      typeof isMatch === "boolean" ? Number(isMatch) : null,
      vocabularyId || null,
      topicId || null,
      status,
      errorMessage || null,
      JSON.stringify(rawResponse || {}),
    ],
  );

  return result.insertId;
};

const callModelApi = async (file) => {
  const retryCount = Math.max(0, Number(process.env.AI_MODEL_RETRY_COUNT || 1));
  const retryDelayMs = Math.max(
    0,
    Number(process.env.AI_MODEL_RETRY_DELAY_MS || 250),
  );

  const shouldRetry = (error) => {
    if (error?.code === "AI_TIMEOUT" || error?.code === "AI_NETWORK") {
      return true;
    }

    if (typeof error?.status === "number") {
      return error.status >= 500;
    }

    return false;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const callModelApiOnce = async () => {
  const modelBaseUrl =
    process.env.AI_MODEL_BASE_URL || "https://vietsign.ibme.edu.vn/vsl-api";
  const endpoint = `${modelBaseUrl.replace(/\/$/, "")}/predict`;
  const timeoutMs = Number(process.env.AI_MODEL_TIMEOUT_MS || 20000);

  const formData = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "application/octet-stream",
  });
  formData.append("file", blob, file.originalname || `practice-${Date.now()}.bin`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (fetchError) {
      const err = new Error(
        fetchError?.name === "AbortError"
          ? "AI model request timed out"
          : "Could not connect to AI model service",
      );
      err.status = fetchError?.name === "AbortError" ? 504 : 503;
      err.code = fetchError?.name === "AbortError" ? "AI_TIMEOUT" : "AI_NETWORK";
      throw err;
    }

    const rawText = await response.text();
    let jsonBody = null;

    if (rawText) {
      try {
        jsonBody = JSON.parse(rawText);
      } catch (error) {
        jsonBody = { rawText };
      }
    }

    if (!response.ok) {
      const message =
        jsonBody?.detail || jsonBody?.message || `AI model request failed with status ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.code = "AI_UPSTREAM_ERROR";
      err.payload = jsonBody;
      throw err;
    }

    return jsonBody || {};
  } finally {
    clearTimeout(timeoutId);
  }
  };

  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await callModelApiOnce();
    } catch (error) {
      lastError = error;

      if (attempt === retryCount || !shouldRetry(error)) {
        throw error;
      }

      await sleep(retryDelayMs);
    }
  }

  throw lastError;
};

const predictAndSave = async ({
  userId,
  file,
  targetText,
  mode,
  vocabularyId,
  topicId,
}) => {
  await ensureHistoryTable();
  const normalizedMode = normalizeMode(mode);

  try {
    const modelPayload = await callModelApi(file);
    const normalized = normalizeModelPayload(modelPayload, targetText, normalizedMode);

    const attemptId = await insertAttempt({
      userId,
      mode: normalizedMode,
      targetText,
      predictedLabel: normalized.predictedLabel,
      actionName: normalized.actionName,
      confidence: normalized.confidence,
      isMatch: normalized.isMatch,
      vocabularyId,
      topicId,
      status: "SUCCESS",
      errorMessage: null,
      rawResponse: normalized.rawResponse,
    });

    return {
      attempt_id: attemptId,
      mode: normalizedMode,
      target_text: targetText || null,
      predicted_label: normalized.predictedLabel,
      action_name: normalized.actionName,
      confidence: normalized.confidence,
      is_match: normalized.isMatch,
      raw_response: normalized.rawResponse,
    };
  } catch (error) {
    await insertAttempt({
      userId,
      mode: normalizedMode,
      targetText,
      predictedLabel: null,
      actionName: null,
      confidence: null,
      isMatch: null,
      vocabularyId,
      topicId,
      status: "FAILED",
      errorMessage: error.message,
      rawResponse: error.payload || { message: error.message },
    });

    throw error;
  }
};

const getHistoryByUser = async ({ userId, page, limit }) => {
  await ensureHistoryTable();

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await db.execute(
    `
      SELECT
        attempt_id,
        mode,
        target_text,
        predicted_label,
        action_name,
        confidence,
        is_match,
        vocabulary_id,
        topic_id,
        status,
        error_message,
        raw_response,
        created_at
      FROM ai_practice_attempt
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `,
    [userId],
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM ai_practice_attempt WHERE user_id = ?",
    [userId],
  );

  return {
    items: rows,
    page: safePage,
    limit: safeLimit,
    total: countRows[0]?.total || 0,
  };
};

module.exports = {
  ALLOWED_MODES,
  predictAndSave,
  getHistoryByUser,
};
