const svc = require('../services/curriculum.services');
const access = require('../services/curriculumAccess.service');
const { fail } = require('../services/curriculumContent.service');
const handle = fn => async (req, res) => {
    try {
        const data = await fn(req, res);
        if (!res.headersSent)
            res.json({ success: true, data });
    }
    catch (e) {
        const missingSchema = ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(e.code);
        res.status(missingSchema ? 503 : e.status || 500).json({ success: false, message: missingSchema ? 'Cần áp dụng migration curriculum M1 trước khi sử dụng' : e.message });
    }
};
const uid = req => Number(req.user.user_id);
const id = value => { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1)
    fail('ID không hợp lệ', 400); return n; };
const getLessons = handle(req => svc.getLessons({ level: req.query.level, topic: req.query.topic, userId: uid(req) }));
const getCatalog = handle(req => svc.getCatalog(uid(req)));
const getLessonByCode = handle(async (req) => { const r = await svc.getLessonByCode(req.params.lessonCode, uid(req)); if (!r)
    fail('Không tìm thấy bài học', 404); return r; });
const getActivityByCode = handle(async (req) => { const r = await svc.getActivityByCode(req.params.activityCode, uid(req)); if (!r)
    fail('Không tìm thấy hoạt động', 404); return r; });
const submitProgress = handle(() => svc.submitGameProgress());
const getUserProgress = handle(async (req) => { const target = id(req.params.userId); await access.assertStudentAccess(uid(req), target); if (!req.query.lessonCode)
    fail('Thiếu lessonCode', 400); return svc.getUserProgressByLesson(target, req.query.lessonCode); });
const getActivityHistory = handle(async (req) => { const target = id(req.params.userId); await access.assertStudentAccess(uid(req), target); return svc.getActivityHistory(target, id(req.params.activityId)); });
const getProgressAiStatus = handle(async (req) => { const p = await svc.getProgressAiStatus(id(req.params.progressId)); if (!p)
    fail('Không tìm thấy bài nộp', 404); await access.assertStudentAccess(uid(req), p.user_id); return p; });
const updateFeedback = handle(req => svc.updateFeedback(id(req.params.progressId), req.body.teacherFeedback, uid(req)));
const startAttempt = handle(req => svc.attempts.start(uid(req), id(req.params.activityId), req.body));
const getAttempt = handle(req => svc.attempts.get(uid(req), req.params.attemptId));
const answerAttempt = handle(req => svc.attempts.answer(uid(req), req.params.attemptId, req.body));
const submitAttempt = handle(req => svc.attempts.submit(uid(req), req.params.attemptId, req.body));
module.exports = { getLessons, getCatalog, getLessonByCode, getActivityByCode, submitProgress, getUserProgress, getActivityHistory, getProgressAiStatus, updateFeedback, startAttempt, getAttempt, answerAttempt, submitAttempt };
