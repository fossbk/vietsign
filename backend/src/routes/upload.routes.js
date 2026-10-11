const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const { minioClient, bucketName } = require("../utils/minio");

const maxUploadSize = Number(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024,
);
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, os.tmpdir()),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || ".bin");
    const suffix = crypto.randomBytes(8).toString("hex");
    callback(null, `vietsign-upload-${Date.now()}-${suffix}${extension}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: maxUploadSize },
});

const uploadSingleFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "File exceeds the configured upload size limit",
      });
    }

    return res.status(400).json({ message: "Invalid upload payload" });
  });
};

const buildBackendProxyUrl = (req, objectName) => {
  // Serve uploaded objects through backend `/uploads/...` endpoint.
  // This avoids direct MinIO URL dependency and works in local Docker setup.
  return `${req.protocol}://${req.get("host")}/uploads/${objectName}`;
};

router.post("/", uploadSingleFile, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    // Lấy tên folder từ body (hoặc mặc định là others nếu không có)
    let folder = req.body.folder || req.query.folder || "others";

    // Danh sách các folder hợp lệ theo yêu cầu
    const validFolders = [
      "exam",
      "question",
      "avatar",
      "Data_FSL",
      "topic",
      "curriculum-practice",
      "others",
    ];
    if (!validFolders.includes(folder)) {
      folder = "others";
    }

    if (folder === "topic") {
      if (!(req.file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({
          message: "Topic illustration must be an image file",
        });
      }
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          message: "Topic illustration must not exceed 5 MB",
        });
      }
    }

    if (folder === "curriculum-practice") {
      const practiceMaxSize = Number(
        process.env.PRACTICE_MAX_VIDEO_FILE_SIZE_BYTES || 10 * 1024 * 1024,
      );
      if (!(req.file.mimetype || "").startsWith("video/")) {
        return res.status(415).json({ message: "Curriculum practice upload must be a video" });
      }
      if (req.file.size > practiceMaxSize) {
        return res.status(413).json({ message: "Curriculum practice video is too large" });
      }
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Tạo object name bao gồm cả folder (VD: avatar/16234...jpg)
    const objectName = `${folder}/${uniqueSuffix}${path.extname(req.file.originalname)}`;

    // Upload to MinIO
    await minioClient.putObject(
      bucketName,
      objectName,
      fs.createReadStream(req.file.path),
      req.file.size,
      { "Content-Type": req.file.mimetype },
    );

    // Return the relative path and information
    const relativePath = `/uploads/${objectName}`;

    // Public URL should always point to backend proxy endpoint.
    const publicUrl = buildBackendProxyUrl(req, objectName);

    res.json({
      message: "File uploaded successfully to MinIO",
      path: relativePath,
      filename: objectName,
      url: relativePath,   // relative path, frontend tự prepend base URL
    });
  } catch (error) {
    console.error("MinIO upload error:", error);
    res.status(500).json({
      message: "Error uploading file to storage",
      error: error.message,
    });
  } finally {
    try {
      await fs.promises.unlink(req.file.path);
    } catch {
      // The temporary upload may already have been removed.
    }
  }
});

module.exports = router;
