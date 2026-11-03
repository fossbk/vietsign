const express = require("express");
const multer = require("multer");
const aiPracticeController = require("../controllers/aiPractice.controller");
const { authRequired } = require("../../../middleware/auth.middleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.AI_MODEL_MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024),
  },
});
const configuredConcurrency = Number(process.env.AI_MAX_CONCURRENT_REQUESTS);
const maxConcurrentRequests = Number.isFinite(configuredConcurrency)
  ? Math.min(10, Math.max(1, Math.floor(configuredConcurrency)))
  : 2;
let activeRequests = 0;

const aiConcurrencyGuard = (req, res, next) => {
  if (activeRequests >= maxConcurrentRequests) {
    res.setHeader("Retry-After", "5");
    return res.status(429).json({
      success: false,
      message: "AI service is busy. Please retry shortly.",
    });
  }

  activeRequests += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeRequests = Math.max(0, activeRequests - 1);
  };
  res.once("finish", release);
  res.once("close", release);
  next();
};

const uploadSingleFile = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid multipart payload",
    });
  });
};

router.post(
  "/predict",
  authRequired,
  aiConcurrencyGuard,
  uploadSingleFile,
  aiPracticeController.predict,
);

router.post(
  "/predict-model3",
  authRequired,
  aiConcurrencyGuard,
  uploadSingleFile,
  aiPracticeController.predictModel3,
);

router.get("/history", authRequired, aiPracticeController.getHistory);

module.exports = router;
