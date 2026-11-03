// Exam Routes - Aggregator
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const examController = require("../controllers/exam.controller");
const { authRequired } = require("../../../middleware/auth.middleware");
const checkOrgRole = require("../../../middleware/orgRole.middleware");
const os = require("os");
const path = require("path");
const fs = require("fs");

const maxPracticeVideoSize = Number(
  process.env.PRACTICE_MAX_VIDEO_FILE_SIZE_BYTES || 10 * 1024 * 1024,
);
const maxPracticeVideoCount = Math.max(
  1,
  Number(process.env.PRACTICE_MAX_VIDEO_COUNT || 50),
);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, os.tmpdir()),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || ".webm");
    const suffix = crypto.randomBytes(8).toString("hex");
    callback(null, `vietsign-practice-${Date.now()}-${suffix}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxPracticeVideoSize,
    files: maxPracticeVideoCount,
  },
});

const cleanupUploadedFiles = async (files) => {
  await Promise.all(
    (Array.isArray(files) ? files : []).map(async (file) => {
      if (!file?.path) return;
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // The queued AI worker may already have removed the file.
      }
    }),
  );
};

const uploadPracticeVideos = (req, res, next) => {
  upload.array("videos", maxPracticeVideoCount)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    cleanupUploadedFiles(req.files).finally(() => {
      if (error instanceof multer.MulterError) {
        const status = ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT"].includes(error.code)
          ? 413
          : 400;
        return res.status(status).json({
          success: false,
          message:
            status === 413
              ? "Video upload exceeds the configured size or file limit"
              : "Invalid practice video upload",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid practice video upload",
      });
    });
  });
};

const router = express.Router();

router.post(
  "/",
  authRequired,
  checkOrgRole(["TEACHER", "SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  examController.createExam,
);

router.get("/", authRequired, examController.getExams);
router.get("/statistics", authRequired, examController.getExamStatistics);
router.get(
  "/classroom/:classroom_id",
  authRequired,
  examController.getExamsByClassroom,
);
router.get(
  "/creator/:creator_id",
  authRequired,
  examController.getExamsByCreator,
);
router.get("/type/:exam_type", authRequired, examController.getExamsByType);

// Practice exam routes (must be before /:exam_id catch-all)
router.post(
  "/practice/submit",
  authRequired,
  uploadPracticeVideos,
  examController.submitPracticeExam,
);
router.get(
  "/practice-submission/:examId/:studentId",
  authRequired,
  examController.getPracticeSubmission,
);
router.get(
  "/practical-submissions",
  authRequired,
  examController.getAllPracticalSubmissions,
);
router.post("/mark-practice", authRequired, examController.markPracticeExam);

router.post("/:exam_id/submit", authRequired, examController.submitExam);
router.get("/:exam_id/results", authRequired, examController.getExamResults);
router.get("/:exam_id/review/:student_id", authRequired, examController.getStudentExamReview);
router.get(
  "/student/:student_id/attempts",
  authRequired,
  examController.getStudentExamAttempts,
);
router.get("/:exam_id", authRequired, examController.getExamById);

router.put(
  "/:exam_id",
  authRequired,
  checkOrgRole(["TEACHER", "SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  examController.updateExam,
);

router.delete(
  "/:exam_id",
  authRequired,
  checkOrgRole(["TEACHER", "SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  examController.deleteExam,
);

module.exports = router;
