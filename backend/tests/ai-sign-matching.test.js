const test = require('node:test');
const assert = require('node:assert/strict');

// Mock DB before loading the service. No real schema/history writes or AI requests.
const writes = [];
const labels = new Map();
const dbPath = require.resolve('../src/db');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: {
        execute: async (sql, params = []) => {
            if (sql.includes('SELECT word FROM vocabulary')) {
                const word = labels.get(params[0]);
                return [word ? [{ word }] : []];
            }
            if (sql.includes('INSERT INTO ai_practice_attempt')) {
                writes.push(params);
                return [{ insertId: writes.length }];
            }
            if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[{ COLUMN_NAME: 'model_code' }]];
            if (sql.includes('INFORMATION_SCHEMA.STATISTICS')) return [[{ INDEX_NAME: 'fixture' }]];
            if (sql.includes('CREATE TABLE IF NOT EXISTS ai_practice_attempt')) return [{}];
            throw new Error(`Unexpected SQL in sign matching test: ${sql}`);
        },
    },
};
const ai = require('../src/features/ai-practice/services/aiPractice.service');
const { normalizeSignIdentity } = require('../src/utils/signIdentity');
const file = { buffer: Buffer.from('synthetic fixture'), mimetype: 'video/webm' };

test('sign matching preserves Vietnamese identity for model1 and model3', async t => {
    const originalFetch = global.fetch;
    const invoke = async (model, targetText, payload, expected, mode = 'match') => {
        global.fetch = async () => ({ ok: true, text: async () => JSON.stringify(payload) });
        const previousWrites = writes.length;
        const result = model === 'model1'
            ? await ai.predictAndSave({ userId: 1, targetText, mode, file })
            : await ai.saveModel3Attempt({ userId: 1, targetText, mode, result: payload });
        assert.equal(result.is_match, expected, `${model}: ${targetText}`);
        assert.equal(writes.length, previousWrites + 1);
        assert.equal(writes.at(-1)[7], expected === null ? null : Number(expected), 'Persist the API decision');
        assert.equal(writes.at(-1)[10], 'SUCCESS');
        assert.deepEqual(JSON.parse(writes.at(-1)[12]), payload, 'Keep original evidence');
        return result;
    };
    try {
        await t.test('tones, vowel variants, d/đ and word meanings remain distinct', async () => {
            for (const [target, predicted] of [['ca','cà'], ['cà','cá'], ['o','ô'], ['ô','ơ'], ['d','đ'], ['ba','3']]) {
                for (const model of ['model1', 'model3']) {
                    await invoke(model, target, { label_name: predicted, confidence: 0.99, is_match: true }, false);
                }
            }
        });
        await t.test('Unicode NFC, casing, whitespace and leading labels compare consistently', async () => {
            for (const [target, predicted] of [['cà','ca\u0300'], ['Chữ Đ','đ'], ['KÝ HIỆU CÁ','cá'], [' BỂ   CÁ ','bể cá']]) {
                for (const model of ['model1', 'model3']) {
                    await invoke(model, target, { label_name: predicted, is_match: false }, true);
                }
            }
            assert.equal(normalizeSignIdentity('  ĐO\u0302\u0300  '), 'đồ');
            assert.notEqual(normalizeSignIdentity('d'), normalizeSignIdentity('đ'));
        });
        await t.test('unresolved IDs and confidence alone are not matching labels', async () => {
            for (const model of ['model1', 'model3']) {
                await invoke(model, '3', { label_id: 3, confidence: 0.99, is_match: true }, null);
                await invoke(model, 'cá', { confidence: 1, is_match: true }, null);
                await invoke(model, '3', { label_id: 99, label_name: '3' }, true);
            }
        });
        await t.test('model1 resolves a class ID through vocabulary before comparing', async () => {
            labels.set(42, 'cà');
            const result = await invoke('model1', 'ca', { label_id: 42, is_match: true }, false);
            assert.equal(result.label_name, 'cà');
            await invoke('model1', 'cà', { data: { label_id: 42, is_match: false } }, true);
            await invoke('model1', 'cá', { label_id: 42, label_name: 'cá' }, true);
            labels.clear();
        });
        await t.test('model3 top-k label is compared without falling back to class ID', async () => {
            await invoke('model3', 'đ', { top_k: [{ class_id: 9, label: 'd', probability: 0.99 }], is_match: true }, false);
            await invoke('model3', '9', { top_k: [{ class_id: 9, probability: 0.99 }], is_match: true }, null);
        });
        await t.test('blank normalized labels or targets remain unknown in match and spell modes', async () => {
            for (const model of ['model1', 'model3']) {
                for (const mode of ['match', 'spell']) {
                    for (const [target, predicted] of [['  ', ' '], ['', 'cá'], ['cá', ' '], [null, 'cá']]) {
                        await invoke(model, target, { label_name: predicted, is_match: true }, null, mode);
                    }
                }
            }
        });
    } finally {
        global.fetch = originalFetch;
        labels.clear();
    }
});
