const express = require("express");
const ctrl = require("../controllers/curriculum.controller");
const { authRequired } = require("../../../middleware/auth.middleware");

const router = express.Router();
const video = require('../services/curriculumVideo.service');
const review = require('../services/curriculumReview.service');
const dev = fn => async(req,res)=>{try{res.json({success:true,data:await fn(req)});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}};
router.get('/reviews/classes',authRequired,dev(req=>review.classes(req.user.user_id)));
router.get('/reviews/activities',authRequired,dev(async req=>{await review.classes(req.user.user_id);const [rows]=await require('../../../db').query("SELECT a.activity_id,a.activity_code,a.title,l.lesson_code FROM curriculum_activity a JOIN curriculum_lesson l ON l.lesson_id=a.lesson_id WHERE a.game_type='VideoPracticeRecorder' AND a.is_active=1 AND l.is_active=1 AND a.activity_code REGEXP '^L1[.]BT[.](0[1-9]|10)[.]T[0-9][0-9]$' ORDER BY l.display_order");return rows;}));
router.get('/reviews/submissions',authRequired,dev(req=>review.queue(req.user.user_id,req.query)));
router.get('/reviews/submissions/:attemptId',authRequired,dev(req=>review.getDetail(req.user.user_id,req.params.attemptId)));
router.post('/reviews/submissions/:attemptId/items',authRequired,dev(req=>review.write(req.user.user_id,req.params.attemptId,req.body)));
router.get('/reviews/submissions/:attemptId/tasks/:taskId/video-ticket',authRequired,video.reviewTicket);
router.get('/review-videos/:uploadId',video.reviewVideo);
router.get('/class-practices',authRequired,dev(req=>review.practices(req.user.user_id)));
router.post('/class-practices',authRequired,dev(req=>review.createPractice(req.user.user_id,req.body)));
router.post('/class-practices/:practiceId/attempts',authRequired,dev(req=>review.startPractice(req.user.user_id,req.params.practiceId,req.body)));
router.post('/attempts/:attemptId/resubmissions',authRequired,dev(async req=>{const child=await review.resubmit(req.user.user_id,req.params.attemptId,req.body);return require('../services/curriculumAttempt.service').get(req.user.user_id,child.attempt_id);}));
router.get('/attempts/:attemptId/uploads/:uploadId/video-ticket',authRequired,video.uploadTicket);
router.get('/recording-uploads/:uploadId/video',video.uploadVideoStream);

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
