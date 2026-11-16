const db = require('../../../db');
const { fail } = require('./curriculumContent.service');
async function role(userId, executor = db) {
    const [rows] = await executor.execute('SELECT code FROM user WHERE user_id = ? AND is_deleted = 0', [userId]);
    return String(rows[0]?.code || '').toLowerCase();
}
async function canPreview(userId, executor = db) { return ['teacher', 'admin', 'super_admin'].includes(await role(userId, executor)); }
async function assertStudentAccess(callerId, studentId, { feedback = false } = {}) {
    const r = await role(callerId);
    if (!feedback && Number(callerId) === Number(studentId))
        return;
    if (['admin', 'super_admin'].includes(r))
        return;
    if (r === 'teacher') {
        const [rows] = await db.execute(`SELECT 1 FROM class_teacher t
   JOIN class_student s ON s.class_room_id=t.class_room_id AND s.status='ACTIVE'
   JOIN class_room c ON c.class_room_id=t.class_room_id AND c.is_active=1
   WHERE t.user_id=? AND s.user_id=? LIMIT 1`, [callerId, studentId]);
        if (rows.length)
            return;
    }
    fail('Không có quyền truy cập bài làm của học viên này', 403);
}
module.exports = { role, canPreview, assertStudentAccess };
