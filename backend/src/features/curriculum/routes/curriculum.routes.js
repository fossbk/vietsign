const express = require("express");
const ctrl = require("../controllers/curriculum.controller");
const { authRequired } = require("../../../middleware/auth.middleware");

const router = express.Router();
const video = require('../services/curriculumVideo.service');
router.post('/attempts/:attemptId/tasks/:taskId/uploads', authRequired, video.uploadMiddleware, video.uploadVideo);
router.get('/submissions/:submissionId/video-ticket', authRequired, video.ticket);
router.get('/submissions/:submissionId/video', video.video);
router.get('/catalog', authRequired, ctrl.getCatalog);
router.post('/activities/:activityId/attempts', authRequired, ctrl.startAttempt);
router.get('/attempts/:attemptId', authRequired, ctrl.getAttempt);
router.post('/attempts/:attemptId/answers', authRequired, ctrl.answerAttempt);
router.post('/attempts/:attemptId/submit', authRequired, ctrl.submitAttempt);

// 1. CURRICULUM READ (public content, auth for user context)
router.get("/lessons", authRequired, ctrl.getLessons);
router.get("/lessons/:lessonCode", authRequired, ctrl.getLessonByCode);
router.get("/activities/:activityCode", authRequired, ctrl.getActivityByCode);

// 2. GAME PROGRESS - SUBMIT
router.post("/activities/:activityId/submit", authRequired, ctrl.submitProgress);

// 3. STUDENT PROGRESS
router.get("/users/:userId/progress", authRequired, ctrl.getUserProgress);
router.get("/users/:userId/activities/:activityId/history", authRequired, ctrl.getActivityHistory);
router.get("/progress/:progressId/ai-status", authRequired, ctrl.getProgressAiStatus);

// 4. TEACHER FEEDBACK
router.patch("/progress/:progressId/feedback", authRequired, ctrl.updateFeedback);

module.exports = router;
