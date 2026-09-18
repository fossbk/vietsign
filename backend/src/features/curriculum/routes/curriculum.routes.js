const express = require("express");
const ctrl = require("../controllers/curriculum.controller");
const { authRequired } = require("../../../middleware/auth.middleware");

const router = express.Router();

// 1. CURRICULUM READ (public content, auth for user context)
router.get("/lessons", authRequired, ctrl.getLessons);
router.get("/lessons/:lessonCode", authRequired, ctrl.getLessonByCode);
router.get("/activities/:activityCode", authRequired, ctrl.getActivityByCode);

// 2. GAME PROGRESS - SUBMIT
router.post("/activities/:activityId/submit", authRequired, ctrl.submitProgress);

// 3. STUDENT PROGRESS
router.get("/users/:userId/progress", authRequired, ctrl.getUserProgress);
router.get("/users/:userId/activities/:activityId/history", authRequired, ctrl.getActivityHistory);

// 4. TEACHER FEEDBACK
router.patch("/progress/:progressId/feedback", authRequired, ctrl.updateFeedback);

module.exports = router;
