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
  uploadSingleFile,
  aiPracticeController.predict,
);

router.get("/history", authRequired, aiPracticeController.getHistory);

module.exports = router;
