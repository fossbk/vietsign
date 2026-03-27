const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { minioClient, bucketName } = require("../utils/minio");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const buildBackendProxyUrl = (req, objectName) => {
  // Serve uploaded objects through backend `/uploads/...` endpoint.
  // This avoids direct MinIO URL dependency and works in local Docker setup.
  return `${req.protocol}://${req.get("host")}/uploads/${objectName}`;
};

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    // Lấy tên folder từ body (hoặc mặc định là others nếu không có)
    let folder = req.body.folder || req.query.folder || "others";

    // Danh sách các folder hợp lệ theo yêu cầu
    const validFolders = ["exam", "question", "avatar", "Data_FSL", "others"];
    if (!validFolders.includes(folder)) {
      folder = "others";
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Tạo object name bao gồm cả folder (VD: avatar/16234...jpg)
    const objectName = `${folder}/${uniqueSuffix}${path.extname(req.file.originalname)}`;

    // Upload to MinIO
    await minioClient.putObject(
      bucketName,
      objectName,
      req.file.buffer,
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
      url: publicUrl,
    });
  } catch (error) {
    console.error("MinIO upload error:", error);
    res.status(500).json({
      message: "Error uploading file to storage",
      error: error.message,
    });
  }
});

module.exports = router;
