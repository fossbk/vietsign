const aiPracticeService = require("../services/aiPractice.service");
const { ALLOWED_MODES } = aiPracticeService;

const MAX_FILE_SIZE_BYTES = Number(
  process.env.AI_MODEL_MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024,
);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const predict = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "File is required (multipart field: file)",
    });
  }

  const mode = String(req.body.mode || "match").trim().toLowerCase();
  if (!ALLOWED_MODES.has(mode)) {
    return res.status(400).json({
      success: false,
      message: "Invalid mode. Allowed values: match, spell, free",
    });
  }

  if (!ALLOWED_MIME_TYPES.has(req.file.mimetype || "")) {
    return res.status(415).json({
      success: false,
      message: "Unsupported file type. Allowed: jpeg, png, webp, mp4, webm, mov",
    });
  }

  if (req.file.size > MAX_FILE_SIZE_BYTES) {
    return res.status(413).json({
      success: false,
      message: `File exceeds maximum size ${MAX_FILE_SIZE_BYTES} bytes`,
    });
  }

  try {
    const userId = toNullableInt(req.user?.user_id);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user context",
      });
    }

    const payload = await aiPracticeService.predictAndSave({
      userId,
      file: req.file,
      targetText: req.body.target_text || req.body.targetText || null,
      mode,
      vocabularyId: toNullableInt(req.body.vocabulary_id || req.body.vocabularyId),
      topicId: toNullableInt(req.body.topic_id || req.body.topicId),
    });

    return res.status(200).json({
      success: true,
      message: "AI prediction completed",
      data: payload,
    });
  } catch (error) {
    console.error("AI prediction error:", error);

    let statusCode = 502;
    if (error?.code === "AI_TIMEOUT" || error?.status === 504) {
      statusCode = 504;
    } else if (error?.status === 400 || error?.status === 415 || error?.status === 422) {
      statusCode = 422;
    } else if (error?.status === 401 || error?.status === 403) {
      statusCode = 502;
    } else if (typeof error?.status === "number" && error.status >= 500) {
      statusCode = 502;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "AI prediction failed",
    });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = toNullableInt(req.user?.user_id);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user context",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await aiPracticeService.getHistoryByUser({
      userId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "AI history fetched",
      data: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (error) {
    console.error("AI history error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch AI history",
    });
  }
};

module.exports = {
  predict,
  getHistory,
};
