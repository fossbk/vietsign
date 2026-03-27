const express = require("express");
const {
  getProfile,
  updateProfile,
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  viewLesson,
  viewVocabulary,
  getStudentLearningProgress,
  getUsers,
  getUserById,
  createUser,
  getUserStatistics,
  updateUser,
  changeUserRole,
} = require("../controllers/user.controller");
const { authRequired } = require("../middleware/auth.middleware");
const checkOrgRole = require("../middleware/orgRole.middleware");
const checkOrgScope = require("../middleware/orgScope.middleware");

const router = express.Router();

router.get("/", authRequired, getUsers);

// Generic create user (for Admin/Facility Manager) - Restricted
router.post(
  "/",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN"]),
  createUser,
);

// User profile routes
router.get("/profile", authRequired, getProfile);
router.put("/profile", authRequired, updateProfile);

// Avatar upload (MinIO)
const multer = require("multer");
const path = require("path");
const { minioClient, bucketName } = require("../utils/minio");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
  "/avatar/upload",
  authRequired,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename =
        "avatar/" + uniqueSuffix + path.extname(req.file.originalname);

      // Upload to MinIO
      await minioClient.putObject(
        bucketName,
        filename,
        req.file.buffer,
        req.file.size,
        { "Content-Type": req.file.mimetype },
      );

      const relativePath = `/uploads/${filename}`;
      const publicUrl = process.env.MINIO_PUBLIC_URL
        ? `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${filename}`
        : `http://localhost:9000/${bucketName}/${filename}`;

      res.json({
        message: "Avatar uploaded successfully",
        path: relativePath,
        filename: filename,
        url: publicUrl,
        data: { url: publicUrl }, // Structure compatible with some FE expectations
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res
        .status(500)
        .json({ message: "Error uploading avatar", error: error.message });
    }
  },
);

// Teacher CRUD routes
router.get("/teachers", authRequired, getTeachers);

router.post(
  "/teachers",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  createTeacher,
);

router.get("/teachers/:id", authRequired, getTeacherById);

router.put(
  "/teachers/:id",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  updateTeacher,
);

router.delete(
  "/teachers/:id",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  deleteTeacher,
);

// Student CRUD routes
router.get("/students", authRequired, getStudents);

router.post(
  "/students",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  createStudent,
);

router.get("/students/:id", authRequired, getStudentById);

router.put(
  "/students/:id",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  updateStudent,
);

router.delete(
  "/students/:id",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  checkOrgScope(),
  deleteStudent,
);

// Student learning tracking routes (student access own data)
router.post("/students/tracking/view-lesson", authRequired, viewLesson);
router.post("/students/tracking/view-vocabulary", authRequired, viewVocabulary);
router.get(
  "/students/progress/learning",
  authRequired,
  getStudentLearningProgress,
);

// Statistics endpoints for admin/teacher viewing student progress
router.get("/statistics/:userId", authRequired, getUserStatistics);
router.get("/vocabulary/recent-view/:userId", authRequired, getUserStatistics);
router.get("/lesson/recent-view/:userId", authRequired, getUserStatistics);

// Generic GET/PUT user by ID must be at the end to avoid conflicts
router.put(
  "/:id/change-role",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN"]),
  changeUserRole
);

router.put(
  "/:id",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN"]),
  updateUser
);

router.get("/:id", authRequired, getUserById);

module.exports = router;
