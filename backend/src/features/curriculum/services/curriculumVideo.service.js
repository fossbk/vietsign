const { randomUUID, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('../../../db');
const { minioClient, bucketName, practiceBucketName } = require('../../../utils/minio');
const access = require('./curriculumAccess.service');
const attempts = require('./curriculumAttempt.service');
const { fail } = require('./curriculumContent.service');
const { isUserActive } = require('../../../services/tokenRevocation.service');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('file');
const uploadMiddleware = (req, res, next) => upload(req, res, e => e ? res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Video không hợp lệ hoặc vượt quá 10 MB' }) : next());
const safeKey = k => typeof k === 'string' && k.length > 0 && k.length <= 1000 && !k.startsWith('/') && !/[\u0000-\u001f\\:]/u.test(k) && !k.split('/').some(s => !s || s === '.' || s === '..' || /[. ]$/.test(s));
async function uploadVideo(req, res) {
    let stagedKey,stagedId;
    try {
        const f = req.file;
        if (!f)
            fail('Thiếu video', 400);
        const webm = f.buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        const mp4 = f.buffer.subarray(4, 8).toString() === 'ftyp';
        if (!webm && !mp4)
            fail('Chỉ nhận video WebM hoặc MP4', 415);
        const uploadId = req.body?.uploadRequestId || randomUUID();
        if(typeof uploadId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uploadId))fail('Upload request ID không hợp lệ',400);
        const digest=createHash('sha256').update(f.buffer).digest('hex');
        const objectKey = `curriculum-practice/${uploadId}.${webm ? 'webm' : 'mp4'}`;
        const mime = webm ? 'video/webm' : 'video/mp4';
        await attempts.transaction(async (conn) => {
            const a = await attempts.owned(conn, req.user.user_id, req.params.attemptId, true);
            const t = a.snapshot.tasks.find(t => t.id === req.params.taskId && t.kind === 'recording');
            if (!t)
                fail('Mục tiêu quay không hợp lệ', 409);
            const [existing]=await conn.execute('SELECT * FROM curriculum_upload WHERE upload_id=?',[uploadId]);
            if(existing[0]){
                const old=existing[0];if(Number(old.user_id)!==Number(req.user.user_id)||old.attempt_id!==a.attempt_id||old.task_id!==t.id||old.byte_size!==f.size||old.mime_type!==mime)fail('Upload ID đã dùng cho video hoặc mục khác',409);
                const stat=await minioClient.statObject(practiceBucketName,old.object_key);
                if((stat.metaData?.sha256||stat.metaData?.['x-amz-meta-sha256'])!==digest)fail('Upload ID đã dùng với nội dung khác',409);
                return;
            }
            if(a.status!=='open')fail('Phiên đã nộp; hãy tạo lượt mới để quay lại.',409);
            const [[count]] = await conn.execute('SELECT COUNT(*) AS total FROM curriculum_upload WHERE attempt_id=?', [a.attempt_id]);
            if (count.total >= 50)
                fail('Phiên làm bài đã đạt giới hạn 50 video tải lên', 429);
            await minioClient.putObject(practiceBucketName, objectKey, f.buffer, f.size, { 'Content-Type': mime,'X-Amz-Meta-Sha256':digest });
            stagedKey=objectKey;stagedId=uploadId;
            try {
                await conn.execute('INSERT INTO curriculum_upload(upload_id,user_id,attempt_id,task_id,object_key,mime_type,byte_size) VALUES(?,?,?,?,?,?,?)', [uploadId, req.user.user_id, a.attempt_id, t.id, objectKey, mime, f.size]);
            }
            catch (e) {
                await minioClient.removeObject(practiceBucketName, objectKey).catch(() => { });
                throw e;
            }
        });
        res.status(201).json({ success: true, data: { uploadId } });
    }
    catch (e) {
        // Also clean up a successful object write if the SQL transaction/commit failed.
        if(stagedKey){const [kept]=await db.execute('SELECT upload_id FROM curriculum_upload WHERE upload_id=?',[stagedId]).catch(()=>[[{upload_id:stagedId}]]);if(!kept.length)await minioClient.removeObject(practiceBucketName,stagedKey).catch(()=>{});}
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
}
async function locateSubmission(id) {
    const [p] = await db.execute('SELECT * FROM curriculum_game_progress WHERE progress_id=?', [id]);
    if (!p.length)
        fail('Không tìm thấy bài nộp', 404);
    const row = p[0];
    const [uploads] = row.attempt_id ? await db.execute(`SELECT u.* FROM curriculum_upload u
  JOIN curriculum_attempt_answer a ON a.attempt_id=u.attempt_id AND a.task_id=u.task_id AND JSON_UNQUOTE(JSON_EXTRACT(a.payload,'$.uploadId'))=u.upload_id
  JOIN (SELECT task_id,MAX(answer_id) answer_id FROM curriculum_attempt_answer WHERE attempt_id=? GROUP BY task_id) latest ON latest.answer_id=a.answer_id
  WHERE u.attempt_id=? ORDER BY a.answer_id`, [row.attempt_id,row.attempt_id]) : [[]];
    if (uploads.length)
        return { owner: row.user_id, uploads,attemptId:row.attempt_id };
    const match = String(row.submission_video_url || '').match(/^\/uploads\/(curriculum-practice\/[^/]+)$/);
    if (!match || !safeKey(match[1]))
        fail('Không có video', 404);
    return { owner: row.user_id, uploads: [{ upload_id: 'legacy', object_key: match[1], legacy: true }] };
}
async function ticket(req, res) {
    try {
        const s = await locateSubmission(req.params.submissionId);
        await submissionAccess(req.user.user_id,s);
        const urls = s.uploads.map(u => ({ uploadId: u.upload_id, url: `/curriculum/submissions/${req.params.submissionId}/video?ticket=${jwt.sign({ purpose: 'curriculum-video', user_id: req.user.user_id, submissionId: String(req.params.submissionId), uploadId: u.upload_id }, process.env.JWT_SECRET, { expiresIn: '5m' })}` }));
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data: urls });
    }
    catch (e) {
        res.status(e.status || 500).json({ message: e.message });
    }
}
async function submissionAccess(userId, submission) {
    await access.assertStudentAccess(userId, submission.owner);
}
async function stream(req, res, key, bucket = bucketName) {
    if (!safeKey(key))
        fail('Đường dẫn không hợp lệ', 400);
    const stat = await minioClient.statObject(bucket, key);
    const size = Number(stat.size);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', stat.metaData?.['content-type'] || 'video/webm');
    let start = 0, end = size - 1;
    if (req.headers.range) {
        const m = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
        if (!m || (!m[1] && !m[2])) {
            res.setHeader('Content-Range', `bytes */${size}`);
            return res.sendStatus(416);
        }
        if (!m[1])
            start = Math.max(0, size - Number(m[2]));
        else {
            start = Number(m[1]);
            end = m[2] ? Math.min(end, Number(m[2])) : end;
        }
        if (start > end || start >= size) {
            res.setHeader('Content-Range', `bytes */${size}`);
            return res.sendStatus(416);
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.setHeader('Content-Length', end - start + 1);
    const data = await minioClient.getPartialObject(bucket, key, start, end - start + 1);
    data.on('error', () => res.destroy());
    res.on('close', () => data.destroy());
    data.pipe(res);
}
async function video(req, res) {
    try {
        const token = jwt.verify(String(req.query.ticket || ''), process.env.JWT_SECRET);
        if (token.purpose !== 'curriculum-video' || token.submissionId !== String(req.params.submissionId) || !(await isUserActive(token.user_id)))
            fail('Vé xem video không hợp lệ', 401);
        const s = await locateSubmission(req.params.submissionId);
        await submissionAccess(token.user_id,s);
        const u = s.uploads.find(u => u.upload_id === token.uploadId);
        if (!u)
            fail('Video không tồn tại', 404);
        await stream(req, res, u.object_key, u.legacy ? bucketName : practiceBucketName);
    }
    catch (e) {
        if (!res.headersSent)
            res.status(e.status || 401).json({ message: 'Không có quyền xem video' });
    }
}
// All compatibility aliases call this guard before local file or MinIO reads.
async function guardLegacy(req, res, key) {
    if (!safeKey(key))
        fail('Đường dẫn không hợp lệ', 400);
    if (!key.toLowerCase().startsWith('curriculum-practice/'))
        return;
    const { authRequired } = require('../../../middleware/auth.middleware');
    const allowed = await new Promise(resolve => { res.once('finish', () => resolve(false)); authRequired(req, res, () => resolve(true)); });
    if (!allowed)
        return;
    const [rows] = await db.execute('SELECT user_id FROM curriculum_game_progress WHERE submission_video_url=? LIMIT 1', [`/uploads/${key}`]);
    if (!rows.length)
        fail('Video chưa được gắn quyền sở hữu', 403);
    await access.assertStudentAccess(req.user.user_id, rows[0].user_id);
}
module.exports = { uploadMiddleware, uploadVideo, ticket, video, stream, guardLegacy, safeKey };
