const db = require('../../../db');
const c = require('./curriculumContent.service');
const access = require('./curriculumAccess.service');
const attempts = require('./curriculumAttempt.service');
const verifiedSummary = `LEFT JOIN (SELECT activity_id,user_id,version_id,MAX(score) best_score,MAX(stars) best_stars,MAX(is_completed) is_completed,COUNT(*) total_attempts,MAX(played_at) last_played_at FROM curriculum_game_progress WHERE result_source='server' GROUP BY activity_id,user_id,version_id) s ON s.activity_id=a.activity_id AND s.version_id=v.version_id AND s.user_id=?`;
async function activityStates(userId, lessonId,includeGroups=false) {
    const [rows] = await db.execute(`SELECT a.activity_id,a.lesson_id,a.activity_code,a.activity_level,a.game_type,a.title,a.instruction,a.display_order,
 l.content_status,v.version_id,v.config,v.content_hash,d.version_id draft_version_id,s.best_score,s.best_stars,s.is_completed,s.total_attempts,s.last_played_at
 FROM curriculum_activity a JOIN curriculum_lesson l ON l.lesson_id=a.lesson_id
 LEFT JOIN curriculum_activity_version v ON v.activity_id=a.activity_id AND v.publication_status='published' AND v.version_number=(SELECT MAX(v2.version_number) FROM curriculum_activity_version v2 WHERE v2.activity_id=a.activity_id AND v2.publication_status='published')
 LEFT JOIN curriculum_activity_version d ON d.activity_id=a.activity_id AND d.publication_status='draft' AND d.version_number=(SELECT MAX(d2.version_number) FROM curriculum_activity_version d2 WHERE d2.activity_id=a.activity_id AND d2.publication_status='draft')
 ${verifiedSummary} WHERE a.is_active=1 AND l.is_active=1 ${includeGroups?'':"AND a.activity_level='T'"} ${lessonId ? 'AND a.lesson_id=?' : ''} ORDER BY a.display_order`, lessonId ? [userId, lessonId] : [userId]);
    const preview = await access.canPreview(userId);
    return Promise.all(rows.map(async (row) => {
        const { config, content_hash, content_status, ...a } = row;
        let ready = false;
        if (config && content_status === 'ready') {
            try {
                const parsed = c.parse(config);
                if (c.hash(parsed) === content_hash && parsed.game_type === a.game_type) {
                    await attempts.assertAssets(db, parsed);
                    ready = true;
                }
            }
            catch (e) {
                if (e.status !== 422)
                    throw e;
            }
        }
        return { ...a, draft_version_id:preview?a.draft_version_id:null, readiness: ready ? 'ready' : 'drafting', can_preview: preview };
    }));
}
async function getLessons({ level, topic, userId }) {
    const params = [userId];
    let filter = '';
    if (level) {
        filter += ' AND l.level_code=?';
        params.push(level);
    }
    if (topic) {
        filter += ' AND l.topic_code=?';
        params.push(topic);
    }

    const [rows] = await db.execute(`SELECT l.*,COUNT(a.activity_id) total_activities,
 SUM(IF(l.content_status='ready' AND v.version_id IS NOT NULL,1,0)) published_activities,
 SUM(IF(l.content_status='ready' AND v.version_id IS NOT NULL AND s.is_completed=1,1,0)) completed_activities
 FROM curriculum_lesson l LEFT JOIN curriculum_activity a ON a.lesson_id=l.lesson_id AND a.is_active=1 AND a.activity_level='T'
 LEFT JOIN (SELECT activity_id,MAX(version_id) version_id FROM curriculum_activity_version WHERE publication_status='published' GROUP BY activity_id) v ON v.activity_id=a.activity_id
 ${verifiedSummary} WHERE l.is_active=1 ${filter} GROUP BY l.lesson_id ORDER BY l.display_order`, params);
    const states = await activityStates(userId);
    return rows.map(l => {
        const activities = states.filter(a => a.lesson_id === l.lesson_id);
        const ready = activities.filter(a => a.readiness === 'ready');
        return { ...l, total_activities: activities.length, published_activities: ready.length, completed_activities: ready.filter(a => a.is_completed).length, readiness: activities.length > 0 && ready.length === activities.length ? 'ready' : 'drafting' };
    });
}
async function getCatalog(userId) {
    const lessons = await getLessons({ userId });
    return ['L1', 'L2', 'L3', 'L4', 'L5'].map(code => ({ code, totalLessons: lessons.filter(l => l.level_code === code).length, availableLessons: lessons.filter(l => l.level_code === code && l.readiness === 'ready').length }));
}
async function getLessonByCode(code, userId) {
    const lesson = (await getLessons({ userId })).find(l => l.lesson_code === code);
    if (!lesson)
        return null;
    const activities = await activityStates(userId, lesson.lesson_id);
    return { ...lesson, activities };
}
async function getActivityByCode(code, userId) {
    const [rows] = await db.execute(`SELECT a.*,l.lesson_code,l.title lesson_title,l.content_status,l.is_active lesson_active FROM curriculum_activity a JOIN curriculum_lesson l ON l.lesson_id=a.lesson_id WHERE a.activity_code=? AND a.is_active=1 AND l.is_active=1`, [code]);
    if (!rows.length)
        return null;
    const a = rows[0];
    const state = (await activityStates(userId, a.lesson_id,true)).find(state => state.activity_id === a.activity_id);
    const ready = state?.readiness === 'ready';
    if (!ready && !(await access.canPreview(userId)))
        c.fail('Hoạt động đang biên soạn, chưa sẵn sàng học', 403);
    const { game_config, ...metadata } = a;
    return { ...metadata, game_config: null, media: [], readiness: ready ? 'ready' : 'drafting', preview_version_id:!ready?state?.draft_version_id:null };
}
async function submitGameProgress() { c.fail('Cần cập nhật ứng dụng và nộp qua phiên làm bài (attempt)', 410); }
async function getUserProgressByLesson(userId, lessonCode) { const detail = await getLessonByCode(lessonCode, userId); return detail?.activities || []; }
async function getActivityHistory(userId, activityId) {
    const [rows] = await db.execute('SELECT * FROM curriculum_game_progress WHERE user_id=? AND activity_id=? ORDER BY played_at DESC', [userId, activityId]);
    return rows.map(({ submission_video_url, ...r }) => ({ ...r, effective_score: r.result_source === 'server' && r.review_status === 'assessed' ? r.score : null, effective_completed: r.result_source === 'server' ? r.is_completed : 0, video_endpoint: submission_video_url || r.game_type === 'VideoPracticeRecorder' ? `/curriculum/submissions/${r.progress_id}/video-ticket` : null }));
}
async function getProgressAiStatus(id) { const [rows] = await db.execute('SELECT progress_id,user_id,activity_id,ai_status,ai_attempt_id,ai_score,ai_confidence,ai_error_message,is_completed,result_source,review_status FROM curriculum_game_progress WHERE progress_id=?', [id]); const r = rows[0]; return r ? { ...r, is_completed: r.result_source === 'server' ? r.is_completed : 0 } : null; }
async function updateFeedback(id, feedback, callerId) {
    if (typeof feedback !== 'string' || feedback.length > 10000)
        c.fail('Nhận xét không hợp lệ', 400);
    const row = await getProgressAiStatus(id);
    if (!row)
        c.fail('Lần nộp không tồn tại', 404);
    await access.assertStudentAccess(callerId, row.user_id, { feedback: true });
    await db.execute('UPDATE curriculum_game_progress SET teacher_feedback=? WHERE progress_id=?', [feedback, id]);
    return { progressId: id, teacherFeedback: feedback };
}
module.exports = { activityStates, getLessons, getCatalog, getLessonByCode, getActivityByCode, submitGameProgress, getUserProgressByLesson, getActivityHistory, getProgressAiStatus, updateFeedback, getUserRole: access.role, attempts };
