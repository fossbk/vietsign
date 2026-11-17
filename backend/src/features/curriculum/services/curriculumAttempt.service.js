const db = require('../../../db');
const { randomUUID } = require('node:crypto');
const c = require('./curriculumContent.service');
const access = require('./curriculumAccess.service');
const recording = require('./curriculumRecording.service');
const key = value => { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value))
    c.fail('Request/event/idempotency ID không hợp lệ', 400); return value; };
async function transaction(fn) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    }
    catch (e) {
        await conn.rollback();
        throw e;
    }
    finally {
        conn.release();
    }
}
async function rowsAnswers(conn, id) { const [rows] = await conn.execute('SELECT * FROM curriculum_attempt_answer WHERE attempt_id=? ORDER BY answer_id', [id]); return rows; }
async function owned(conn, userId, id, lock = false) {
    const [rows] = await conn.execute(`SELECT * FROM curriculum_attempt WHERE attempt_id=?${lock ? ' FOR UPDATE' : ''}`, [id]);
    const a = rows[0];
    if (!a)
        c.fail('Không tìm thấy phiên làm bài', 404);
    if (Number(a.user_id) !== Number(userId))
        c.fail('Phiên làm bài thuộc người dùng khác', 403);
    a.snapshot = c.parse(a.snapshot);
    a.result = c.parse(a.result);
    return a;
}
async function response(a, answers = [],conn=db) {
    return { attemptId: a.attempt_id, activityId: a.activity_id, versionId: a.version_id, isPreview: !!a.is_preview, status: a.status,
        config: c.publicConfig(a.snapshot,answers), answers: answers.map(r => ({ eventId: r.event_id, taskId: r.task_id, ...c.parse(r.response) })), result: a.result,
        recording: recording.state(a,answers),review:await require('./curriculumReview.service').projection(conn,a) };
}
async function assertAssets(conn, config) {
    c.validate(config, true);
    const [assets] = await conn.execute(`SELECT a.*, i.approval_status FROM curriculum_asset a JOIN curriculum_content_item i ON i.item_id=a.item_id WHERE a.asset_id IN (${config.asset_ids.map(() => '?').join(',')})`, config.asset_ids);
    if (assets.length !== new Set(config.asset_ids).size || assets.some(a => a.verification_status !== 'verified' || a.approval_status !== 'approved' || !a.playable_url))
        c.fail('Học liệu chưa được xác minh');
    const urls = new Set(assets.map(a => a.playable_url));
    if(config.icon&&!urls.has(config.icon))c.fail('Biểu tượng không thuộc asset đã duyệt');
    const presentations = config.runtime_version===2 ? require('./curriculumRounds.service').presentations(config) : config.tasks.flatMap(t=>[t.prompt,...(t.options||[]).map(o=>o.presentation)]);
    for (const p of presentations)
            if (['image','video'].includes(p.type) && !urls.has(p.content))
                c.fail('Học liệu không thuộc asset đã duyệt');
}
async function start(userId, activityId, payload, classContext=null) {
    key(payload.requestId);
    return transaction(async (conn) => {
        // Serializes version creation and same-request starts without unique-key races.
        const [acts] = await conn.execute(`SELECT a.*,l.content_status,l.is_active AS lesson_active FROM curriculum_activity a JOIN curriculum_lesson l ON l.lesson_id=a.lesson_id WHERE a.activity_id=? FOR UPDATE`, [activityId]);
        const activity = acts[0];
        if (!activity || !activity.is_active || !activity.lesson_active)
            c.fail('Hoạt động không tồn tại', 404);
        const [existing] = await conn.execute('SELECT * FROM curriculum_attempt WHERE user_id=? AND activity_id=? AND request_id=?', [userId, activityId, payload.requestId]);
        if (existing.length) {
            const a = await owned(conn, userId, existing[0].attempt_id);
            if(classContext){const ctx=await require('./curriculumReview.service').context(conn,a.attempt_id);if(ctx?.practice_id!==classContext.practiceId)c.fail('Request ID đã dùng cho lớp khác',409);}
            return response(a, await rowsAnswers(conn, a.attempt_id),conn);
        }
        const [published] = await conn.execute("SELECT * FROM curriculum_activity_version WHERE activity_id=? AND publication_status='published' ORDER BY version_number DESC LIMIT 1", [activityId]);
        let v = published[0];
        let preview = activity.content_status !== 'ready' || !v;
        const classPractice=classContext?await require('./curriculumReview.service').practiceForStart(conn,userId,classContext.practiceId,activityId):null;
        if(classPractice){const [pinned]=await conn.execute('SELECT * FROM curriculum_activity_version WHERE version_id=? AND activity_id=?',[classPractice.version_id,activityId]);v=pinned[0];if(!v)c.fail('Phiên bản của lớp không tồn tại',409);preview=true;}
        if (preview && !classPractice && !(await access.canPreview(userId, conn)))
            c.fail('Hoạt động đang biên soạn, chưa sẵn sàng học', 403);
        if (preview&&!classPractice) {
            const [drafts] = await conn.execute("SELECT * FROM curriculum_activity_version WHERE activity_id=? AND publication_status='draft' ORDER BY version_number DESC LIMIT 1", [activityId]);
            if (drafts[0]) v = drafts[0];
        }
        let config;
        if (v) {
            config = c.parse(v.config);
            if (c.hash(config) !== v.content_hash)
                c.fail('Phiên bản đã bị sửa tại chỗ; cần tạo phiên bản mới');
            if (v.publication_status === 'published') await assertAssets(conn, config);
            else c.validate(config);
        }
        else {
            const [media] = await conn.execute('SELECT * FROM curriculum_media WHERE activity_id=? ORDER BY display_order,media_id', [activityId]);
            config = c.validate(c.adaptLegacy(activity, media));
            const digest = c.hash(config);
            const [versions] = await conn.execute('SELECT * FROM curriculum_activity_version WHERE activity_id=? AND content_hash=?', [activityId, digest]);
            v = versions[0];
            if (!v) {
                const [n] = await conn.execute('SELECT COALESCE(MAX(version_number),0)+1 AS n FROM curriculum_activity_version WHERE activity_id=?', [activityId]);
                const [insert] = await conn.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,?,?,'draft',?)", [activityId, n[0].n, digest, JSON.stringify(config)]);
                v = { version_id: insert.insertId };
            }
        }
        if (config.game_type !== activity.game_type)
            c.fail('Game type không khớp phiên bản');
        const a = { attempt_id: randomUUID(), activity_id: activityId, version_id: v.version_id, is_preview: Number(preview), status: 'open', snapshot: c.snapshot(classPractice?await require('./curriculumGroup.service').scopedConfig(conn,classPractice.practice_id,config):config), result: null };
        await conn.execute('INSERT INTO curriculum_attempt(attempt_id,user_id,activity_id,version_id,request_id,is_preview,snapshot) VALUES(?,?,?,?,?,?,?)', [a.attempt_id, userId, activityId, a.version_id, payload.requestId, a.is_preview, JSON.stringify(a.snapshot)]);
        a.user_id=userId;
        if(classPractice)await conn.execute('INSERT INTO curriculum_attempt_class(attempt_id,practice_id) VALUES(?,?)',[a.attempt_id,classPractice.practice_id]);
        return response(a,[],conn);
    });
}
async function get(userId, id) { const a = await owned(db, userId, id); return response(a, await rowsAnswers(db, id)); }
async function answer(userId, id, payload) {
    key(payload.eventId);
    // Canonical payload excludes claimed score, correctness and client target text.
    const input = { taskId: payload.taskId, ...(payload.choiceIds ? { choiceIds: payload.choiceIds } : {}), ...(payload.action ? { action: payload.action } : {}), ...(payload.uploadId ? { uploadId: payload.uploadId } : {}), ...(payload.replacesUploadId ? {replacesUploadId:payload.replacesUploadId}:{}), ...(payload.objectId ? {objectId:payload.objectId}:{}), ...(payload.cardId ? {cardId:payload.cardId}:{}) };
    return transaction(async (conn) => {
        const a = await owned(conn, userId, id, true);
        const answers = await rowsAnswers(conn, id);
        const existing = answers.find(r => r.event_id === payload.eventId);
        if (existing) {
            if (c.hash(c.parse(existing.payload)) !== c.hash(input))
                c.fail('Event ID đã dùng với nội dung khác', 409);
            return c.parse(existing.response);
        }
        if (a.status !== 'open')
            c.fail('Phiên làm bài đã kết thúc', 409);
        await require('./curriculumReview.service').assertWritable(conn,a);
        const task = a.snapshot.tasks.find(t => t.id === input.taskId);
        if (!task)
            c.fail('Mục không thuộc phiên làm bài', 400);
        if (task.kind === 'recording') {
            const [uploads] = await conn.execute('SELECT * FROM curriculum_upload WHERE upload_id=? AND user_id=? AND attempt_id=? AND task_id=?', [input.uploadId || '', userId, id, task.id]);
            if (!uploads.length)
                c.fail('Video không thuộc người nộp/phiên/mục tiêu', 403);
        }
        const feedback = task.kind==='recording' ? recording.grade(a.snapshot,task,input,answers) : c.grade(a.snapshot, task, input, answers);
        await conn.execute('INSERT INTO curriculum_attempt_answer(attempt_id,event_id,task_id,payload,response,is_correct) VALUES(?,?,?,?,?,?)', [id, payload.eventId, task.id, JSON.stringify(input), JSON.stringify(feedback), feedback.correct === null ? null : Number(feedback.correct)]);
        return feedback;
    });
}
async function rebuildSummary(conn, userId, activityId) {
    // Rebuild from authoritative history, so pending/revoked results cannot retain stale maxima.
    await conn.execute(`INSERT INTO curriculum_user_activity_summary(user_id,activity_id,best_score,best_stars,total_attempts,last_progress_id,is_completed,last_played_at)
 SELECT ?,?,COALESCE(MAX(IF(result_source='server',score,0)),0),COALESCE(MAX(IF(result_source='server',stars,0)),0),COALESCE(SUM(result_source='server'),0),MAX(IF(result_source='server',progress_id,NULL)),COALESCE(MAX(IF(result_source='server',is_completed,0)),0),COALESCE(MAX(IF(result_source='server',played_at,NULL)),NOW())
 FROM curriculum_game_progress WHERE user_id=? AND activity_id=? AND version_id=(SELECT version_id FROM curriculum_activity_version WHERE activity_id=? AND publication_status='published' ORDER BY version_number DESC LIMIT 1)
 ON DUPLICATE KEY UPDATE best_score=VALUES(best_score),best_stars=VALUES(best_stars),total_attempts=VALUES(total_attempts),last_progress_id=VALUES(last_progress_id),is_completed=VALUES(is_completed),last_played_at=VALUES(last_played_at)`, [userId, activityId, userId, activityId, activityId]);
}
async function submit(userId, id, payload) {
    key(payload.idempotencyKey);
    return transaction(async (conn) => {
        const a = await owned(conn, userId, id, true);
        if (a.status === 'finalized') {
            if (a.submit_key !== payload.idempotencyKey)
                c.fail('Phiên đã nộp với khóa khác', 409);
            return a.result;
        }
        const answers = await rowsAnswers(conn, id);
        await require('./curriculumReview.service').assertWritable(conn,a);
        const result = c.summarize(a.snapshot, answers);
        if (result.answered !== result.required)
            c.fail('Chưa làm đủ các mục bắt buộc', 409);
        result.resultSource = a.is_preview ? 'preview' : 'server';
        result.isPreview = !!a.is_preview;
        if (a.is_preview) {
            result.isCompleted = 0;
            result.stars = 0;
        }
        const seconds = Math.max(0, Math.round((Date.now() - new Date(a.started_at).getTime()) / 1000));
        // New recordings remain pending review. AI is advisory until D06 is approved.
        const [insert] = await conn.execute(`INSERT INTO curriculum_game_progress(activity_id,user_id,game_type,score,stars,duration_seconds,is_completed,game_result_details,attempt_id,version_id,result_source,review_status)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, [a.activity_id, userId, a.snapshot.game_type, result.score, result.stars, seconds, result.isCompleted, JSON.stringify(result), id, a.version_id, result.resultSource, result.reviewStatus]);
        result.progressId = insert.insertId;
        result.aiStatus = 'not_requested';
        if(a.snapshot.tasks.some(t=>t.kind==='recording'))result.recording = recording.state({...a,status:'finalized'},answers);
        await conn.execute("UPDATE curriculum_attempt SET status='finalized',submit_key=?,result=?,finalized_at=NOW() WHERE attempt_id=?", [payload.idempotencyKey, JSON.stringify(result), id]);
        if(!a.is_preview)await rebuildSummary(conn, userId, a.activity_id);
        return result;
    });
}
module.exports = { start, get, answer, submit, owned, transaction, rebuildSummary, assertAssets };
