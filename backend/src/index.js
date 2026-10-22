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
const chatRoutes = require("./features/chat");
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/user", userRoutes);
app.use("/organizations", organizationRoutes);
app.use("/organization-managers", organizationManagerRoutes);
app.use("/teaching-management", teachingManagementRoutes);
app.use("/learn", learnRoutes);
app.use("/ai-practice", aiPracticeRoutes);
app.use("/upload", uploadRoutes);
app.use("/chat", chatRoutes);
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

// Health check endpoint
app.get("/health", async (req, res) => {
  const db = require("./db");
  const dbCheck = await db.checkDbConnection();

  let minioStatus = "connected";
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      minioStatus = "bucket_not_found";
    }
  } catch (err) {
    minioStatus = "disconnected";
  }

  const isHealthy = dbCheck.ok;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbCheck.ok ? "connected" : "disconnected",
      minio: minioStatus,
    },
    ...(dbCheck.error ? { dbError: dbCheck.error.message } : {}),
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  if (err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ETIMEDOUT") {
    return res.status(503).json({
      message: "Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. Vui lòng kiểm tra MySQL container.",
      error: err.message,
      code: err.code,
    });
  }
  return res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Auto-heal / verify local Docker services (DB and MinIO)
  const { ensureServices } = require("./utils/ensureServices");
  await ensureServices();

  // Initialize MinIO
  await initMinio();

  // Initialize Database with retry
  const db = require("./db");
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT || 3308;
  const dbName = process.env.DB_NAME || "vietsignschool";

  console.log(`Connecting to DB: ${dbHost}:${dbPort}, Database: ${dbName}`);

  let dbConnected = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!dbConnected && attempts < maxAttempts) {
    attempts++;
    try {
      const [tables] = await db.query("SHOW TABLES");
      const tableList = tables.map((t) => Object.values(t)[0]);
      console.log(`[Database] Connected successfully (attempt ${attempts}). Available tables:`, tableList.length);

      if (tableList.includes("user")) {
        console.log("[Database] Confirmed: 'user' table exists and is accessible.");
      } else {
        console.error(`[Database] CRITICAL: Table 'user' does not exist in database '${dbName}'!`);
      }
      dbConnected = true;
    } catch (err) {
      console.error(`[Database] Connection attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
      if (attempts < maxAttempts) {
        console.log("[Database] Retrying in 2 seconds...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  if (!dbConnected) {
    console.error(`\n⚠️  CRITICAL DATABASE ERROR: Unable to establish database connection after ${maxAttempts} attempts.`);
    console.error(`👉 Ensure MySQL is running on ${dbHost}:${dbPort} ('docker start vietsign_db' or 'npm run dev').\n`);
  }
});
