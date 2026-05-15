// Exam Routes - Aggregator
const express = require("express");
const multer = require("multer");
const examController = require("../controllers/exam.controller");
const { authRequired } = require("../../../middleware/auth.middleware");
const checkOrgRole = require("../../../middleware/orgRole.middleware");

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
  upload.array("videos", 50),
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
