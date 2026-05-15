const express = require("express");
const router = express.Router();

const {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  getClassroomStudents,
  getMyClasses,
} = require("../controllers/classroom.controller");

const { authRequired } = require("../../../middleware/auth.middleware");
const checkOrgRole = require("../../../middleware/orgRole.middleware");

// Create classroom (teacher/admin)
router.post(
  "/",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]),
  createClassroom,
);

// Get all classrooms (all authenticated users)
router.get("/", authRequired, getClassrooms);

// Get current user's classes (students get enrolled classes, teachers get their classes)
// IMPORTANT: This route must be defined BEFORE /:classroomId to avoid conflict
router.get("/my-classes", authRequired, getMyClasses);

// Get classroom details (all authenticated users)
router.get("/:classroomId", authRequired, getClassroomById);

// Update classroom (teacher/admin)
router.put(
  "/:classroomId",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]),
  updateClassroom,
);

// Delete classroom (admin)
router.delete(
  "/:classroomId",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN"]),
  deleteClassroom,
);

// Add student to classroom (teacher/admin)
router.post(
  "/:classroomId/students",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]),
  addStudentToClassroom,
);

// Get classroom students (teacher/admin)
router.get(
  "/:classroomId/students",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]),
  getClassroomStudents,
);

// Remove student from classroom (admin or teacher of the classroom)
router.delete(
  "/:classroomId/students",
  authRequired,
  checkOrgRole(["SUPER_ADMIN", "CENTER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]),
  removeStudentFromClassroom,
);

module.exports = router;
