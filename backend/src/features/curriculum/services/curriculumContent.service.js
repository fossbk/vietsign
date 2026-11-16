const crypto = require('node:crypto');
const fail = (message, status = 422) => { throw Object.assign(new Error(message), { status }); };
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const games = ['FlipCardViewer', 'LineMatchingGame', 'ChoiceQuizGame', 'JigsawPuzzleGame', 'BucketDropGame', 'MemoryCardGame', 'SequenceOrderGame', 'VideoPracticeRecorder'];
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
} return a; };
const display = (type, content, label) => ({ type, content: String(content || ''), ...(label ? { label } : {}) });
const badMedia = url => !url || /defaultvideo|\/dictionary(?:[/?#]|$)|curriculum-practice\//i.test(url);
// Legacy content is only a preview. Never invent quiz distractors or bucket answers.
function adaptLegacy(activity, media) {
    const c = parse(activity.game_config) || {};
    const labels = c.targetWords || c.labels || c.sequence || [];
    const items = media.map((m, i) => ({ id: String(m.media_id), label: String(c.pairs?.[i]?.text || labels[i] || m.media_code), prompt: display(m.media_type, m.source_url) }));
    const option = i => ({ id: i.id, presentation: display('text', i.label) });
    let tasks = [];
    switch (activity.game_type) {
        case 'ChoiceQuizGame':
            tasks = (c.questions || []).map(q => ({ id: `q${q.id}`, kind: 'choice', prompt: display(q.promptType, q.promptContent),
                options: q.options.map(o => ({ id: String(o.id), presentation: display(o.mediaType || 'text', o.mediaUrl || o.text, o.text) })),
                correct: q.options.filter(o => o.isCorrect === true).map(o => String(o.id)) }));
            break;
        case 'BucketDropGame':
            tasks = (c.items || []).map((i, n) => ({ id: `b${n}`, kind: 'choice', prompt: items[i.mediaIndex ?? n]?.prompt,
                options: (c.buckets || []).map(b => ({ id: String(b.id), presentation: display('text', b.label) })), correct: [String(i.targetBucketId)] }));
            break;
        case 'SequenceOrderGame':
            tasks = [{ id: 'sequence', kind: 'sequence', prompt: display('text', 'Sắp xếp theo thứ tự'), options: items.map(option), correct: items.map(i => i.id), fixedSlots: c.fixedSlots || [] }];
            break;
        default:
            tasks = items.map(i => ({ id: i.id, kind: activity.game_type === 'FlipCardViewer' ? 'view' : activity.game_type === 'VideoPracticeRecorder' ? 'recording' : 'pair',
                prompt: i.prompt, label: i.label, ...(!['FlipCardViewer', 'VideoPracticeRecorder'].includes(activity.game_type) ? { options: items.map(option), correct: [i.id] } : {}) }));
    }
    return { runtime_version: 1, game_type: activity.game_type, tasks,
        policy: { completion: 'all_correct', pass_score: null, star_thresholds: null, max_retries: null, ai_enabled: false }, legacy: true };
}
function validate(config, published = false) {
    if (config?.runtime_version !== 1 || !games.includes(config.game_type) || !Array.isArray(config.tasks) || !config.tasks.length)
        fail('Cấu hình chưa có nội dung chơi hợp lệ');
    const ids = new Set();
    for (const t of config.tasks) {
        if (typeof t.id !== 'string' || !t.id || t.id.length > 100 || ids.has(t.id))
            fail('Task ID thiếu hoặc trùng');
        ids.add(t.id);
        const kind = { FlipCardViewer: 'view', VideoPracticeRecorder: 'recording', SequenceOrderGame: 'sequence', ChoiceQuizGame: 'choice', BucketDropGame: 'choice' }[config.game_type] || 'pair';
        if (t.kind !== kind)
            fail('Loại mục không khớp trò chơi');
        if (!['view', 'choice', 'pair', 'sequence', 'recording'].includes(t.kind) || !t.prompt || !['text', 'image', 'video'].includes(t.prompt.type) || !t.prompt.content)
            fail('Đề bài không hợp lệ');
        if (['choice', 'pair', 'sequence'].includes(t.kind)) {
            const opts = t.options || [];
            const keys = opts.map(o => o.id);
            if (!keys.length || keys.some(id => typeof id !== 'string') || new Set(keys).size !== keys.length || !Array.isArray(t.correct) || !t.correct.length || t.correct.some(id => !keys.includes(id)))
                fail('Khóa đáp án/option không hợp lệ');
            if (t.kind !== 'sequence' && t.correct.length !== 1)
                fail('Cần đúng một đáp án');
            if (t.kind === 'sequence' && (new Set(t.correct).size !== keys.length || t.correct.length !== keys.length || (t.fixedSlots || []).some(i => !Number.isInteger(i) || i < 0 || i >= keys.length)))
                fail('Dãy hoặc fixed slots không hợp lệ');
        }
    }
    const p = config.policy;
    if (!p || !['all_correct', 'viewed_all', 'score', 'review'].includes(p.completion) || !(p.max_retries === null || Number.isInteger(p.max_retries) && p.max_retries >= 0))
        fail('Thiếu chính sách kết quả');
    if ((p.completion === 'review') !== (config.game_type === 'VideoPracticeRecorder') && !config.legacy)
        fail('Chính sách review không khớp loại hoạt động');
    if (p.completion === 'score' && !(typeof p.pass_score === 'number' && p.pass_score >= 0 && p.pass_score <= 100))
        fail('Thiếu ngưỡng điểm đã duyệt');
    if (p.star_thresholds !== null && (!Array.isArray(p.star_thresholds) || p.star_thresholds.length !== 3 || p.star_thresholds.some((n, i, a) => typeof n !== 'number' || n < 0 || n > 100 || (i > 0 && n < a[i - 1]))))
        fail('Ngưỡng sao không hợp lệ');
    if (published) {
        if (config.legacy || config.example_only || config.blocked_by_decisions?.length || !config.source_refs?.length || !config.asset_ids?.length)
            fail('Nội dung chưa được duyệt hoặc thiếu nguồn/học liệu');
        for (const t of config.tasks)
            for (const d of [t.prompt, ...(t.options || []).map(o => o.presentation)]) {
                if (!d || !['text', 'image', 'video'].includes(d.type) || !d.content || (d.type !== 'text' && badMedia(d.content)))
                    fail('Học liệu thiếu hoặc là placeholder/lookup');
            }
    }
    return config;
}
function snapshot(config) {
    // Opaque option IDs cannot reveal pair/sequence keys through legacy numeric IDs.
    const ids = new Map();
    const opaque = id => { if (!ids.has(id))
        ids.set(id, crypto.randomUUID()); return ids.get(id); };
    return { ...config, tasks: config.tasks.map(t => ({ ...t, ...(t.options ? { options: shuffle(t.options.map(o => ({ ...o, id: opaque(o.id) }))), correct: t.correct.map(opaque) } : {}) })) };
}
function publicConfig(config, answers = []) {
    return { runtime_version: config.runtime_version, game_type: config.game_type, policy: { max_retries: config.policy.max_retries },
        tasks: config.tasks.map(t => ({ id: t.id, kind: t.kind, prompt: t.prompt, ...(['view','recording'].includes(t.kind) ? {label:t.label} : {}), options: t.options?.map(o => ({ id: o.id, presentation: o.presentation })),
            fixedOptions: t.kind === 'sequence' ? Object.fromEntries((t.fixedSlots || []).map(i => [i, t.correct[i]])) : undefined })) };
}
function grade(config, task, input, previous = []) {
    const retries = previous.filter(a => a.task_id === task.id);
    if (retries.length && (config.game_type === 'ChoiceQuizGame' || task.kind === 'view' || task.kind === 'recording' || retries.some(a => a.is_correct === 1)))
        fail('Mục này đã được trả lời', 409);
    if (config.policy.max_retries !== null && retries.length > config.policy.max_retries)
        fail('Đã hết lượt thử', 409);
    let correct;
    if (task.kind === 'view') {
        if (input.action !== 'view')
            fail('Sự kiện xem không hợp lệ', 400);
        correct = true;
    }
    else if (task.kind === 'recording')
        correct = null;
    else {
        const choices = input.choiceIds;
        if (!Array.isArray(choices) || new Set(choices).size !== choices.length || choices.some(id => !task.options.some(o => o.id === id)) || choices.length !== (task.kind === 'sequence' ? task.correct.length : 1))
            fail('Lựa chọn không thuộc phiên làm bài', 400);
        if (task.kind === 'sequence' && (task.fixedSlots || []).some(i => choices[i] !== task.correct[i]))
            fail('Không được thay đổi ô cố định', 400);
        correct = choices.every((id, i) => id === task.correct[i]);
    }
    return { correct, ...(task.kind === 'choice' ? { correctOptionIds: task.correct } : {}), ...(task.kind === 'recording' ? { reviewStatus: 'pending_review' } : {}) };
}
function summarize(config, answers) {
    const done = config.tasks.filter(t => answers.some(a => a.task_id === t.id));
    const solved = config.tasks.filter(t => answers.some(a => a.task_id === t.id && a.is_correct === 1));
    const firstCorrect = config.tasks.filter(t => answers.find(a => a.task_id === t.id)?.is_correct === 1).length;
    const score = Math.round(solved.length / config.tasks.length * 100);
    const review = config.tasks.some(t => t.kind === 'recording');
    const completed = !review && done.length === config.tasks.length && (config.policy.completion === 'score' ? score >= config.policy.pass_score : solved.length === config.tasks.length);
    const viewed = config.game_type === 'FlipCardViewer';
    return { score: review || viewed ? 0 : score, stars: review || viewed ? 0 : (config.policy.star_thresholds || []).filter(n => score >= n).length, isCompleted: Number(completed),
        answered: done.length, required: config.tasks.length, firstCorrect, reviewStatus: review ? 'pending_review' : viewed ? 'viewed_all' : 'assessed' };
}
module.exports = { fail, parse, hash, shuffle, badMedia, adaptLegacy, validate, snapshot, publicConfig, grade, summarize };
