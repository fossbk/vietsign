require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const organizationRoutes = require("./routes/organization.routes");
const organizationManagerRoutes = require("./routes/organizationManager.routes");
const teachingManagementRoutes = require("./features/teaching-management");
const learnRoutes = require("./features/learn");
const aiPracticeRoutes = require("./features/ai-practice/routes/aiPractice.routes");
const { authRequired } = require("./middleware/auth.middleware");
const { specs, swaggerUi } = require("./swagger/index");
const { initMinio, minioClient, bucketName } = require("./utils/minio");

const app = express();

// CORS - cho phép FE từ mọi domain gọi API
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const uploadRoutes = require("./routes/upload.routes");
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/user", userRoutes);
app.use("/organizations", organizationRoutes);
app.use("/organization-managers", organizationManagerRoutes);
app.use("/teaching-management", teachingManagementRoutes);
app.use("/learn", learnRoutes);
app.use("/ai-practice", aiPracticeRoutes);
app.use("/upload", uploadRoutes);
const path = require("path");
const fs = require("fs");

const streamUploadedObject = async (res, objectKey) => {
  const localPath = path.join(__dirname, "../uploads", objectKey);

  // Try local first (existing files)
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // Then try MinIO
  try {
    const stat = await minioClient.statObject(bucketName, objectKey);
    if (stat && stat.metaData && stat.metaData["content-type"]) {
      res.setHeader("Content-Type", stat.metaData["content-type"]);
    }

    const dataStream = await minioClient.getObject(bucketName, objectKey);
    dataStream.pipe(res);
  } catch (err) {
    if (err.code === "NoSuchKey" || err.code === "NotFound") {
      return res.status(404).send("File not found");
    }
    console.error("MinIO retrieval error:", err);
    return res.status(500).send("Error retrieving file");
  }
};

// Proxy /uploads/<objectKey> to MinIO or local files.
// Supports nested keys like /uploads/question/123-file.png.
app.get(/^\/uploads\/(.+)/, async (req, res) => {
  const objectKey = req.params[0];
  return streamUploadedObject(res, objectKey);
});

// Backward compatibility for legacy URLs saved as /upload/<bucket>/<objectKey>.
app.get(/^\/upload\/([^/]+)\/(.+)/, async (req, res) => {
  const reqBucket = req.params[0];
  const objectKey = req.params[1];

  if (reqBucket !== bucketName) {
    return res.status(404).send("Bucket not found");
  }

  return streamUploadedObject(res, objectKey);
});

// Backward compatibility for URLs like /<bucket>/<objectKey>
// (when MINIO_PUBLIC_URL was configured as backend domain).
app.get(new RegExp(`^/${bucketName}/(.+)`), async (req, res) => {
  const objectKey = req.params[0];
  return streamUploadedObject(res, objectKey);
});

//router login
app.get("/me", authRequired, (req, res) => {
  return res.json({
    message: "This is protected data.",
    user: req.user,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Initialize MinIO
  await initMinio();
  try {
    const db = require("./db");
    console.log(
      `Connecting to DB: ${process.env.DB_HOST}:${process.env.DB_PORT}, Database: ${process.env.DB_NAME}`,
    );

    const [tables] = await db.query("SHOW TABLES");
    const tableList = tables.map((t) => Object.values(t)[0]);
    console.log("Available tables in database:", tableList);

    if (tableList.includes("user")) {
      const [rows] = await db.query("DESCRIBE `user`");
      console.log("Confirmed: 'user' table exists and is accessible.");
    } else {
      console.error(
        `CRITICAL ERROR: Table 'user' does not exist in the database '${process.env.DB_NAME}'!`,
      );
    }
  } catch (err) {
    console.error("DATABASE INITIALIZATION ERROR:", err);
  }
});
