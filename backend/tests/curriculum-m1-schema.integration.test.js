// Schema-only integration test: deliberately imports no application services.
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const testUrl = process.env.CURRICULUM_M1_SCHEMA_TEST_URL;
const migration = name => fs.readFileSync(path.resolve(__dirname, '../../database/migrations', name), 'utf8');
const m1 = '20261109_curriculum_m1.sql';

test('M1 schema preserves legacy data and supports both old writes and versioned records', {
    skip: !testUrl,
}, async t => {
    const url = new URL(testUrl);
    assert.equal(url.protocol, 'mysql:');
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Use a local disposable MySQL server');
    assert.equal(url.pathname, '/curriculum_m1_schema_test', 'Use the dedicated test URL marker');
    assert.equal(url.search, '', 'Connection overrides are not allowed');
    // Never select, reset or drop the database named in the URL. Create our own.
    const database = `curriculum_m1_schema_test_${randomBytes(8).toString('hex')}`;
    const connection = await mysql.createConnection({
        host: url.hostname, port: Number(url.port || 3306),
        user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
        multipleStatements: true, charset: 'utf8mb4',
    });
    let created = false;
    const rows = async (sql, params = []) => (await connection.query(sql, params))[0];
    const count = async table => Number((await rows(`SELECT COUNT(*) n FROM \`${table}\``))[0].n);
    const legacyTables = ['user', 'curriculum_lesson', 'curriculum_activity', 'curriculum_media',
        'curriculum_game_progress', 'curriculum_user_activity_summary', 'curriculum_ai_job'];
    const newTables = ['curriculum_content_item', 'curriculum_asset', 'curriculum_activity_version',
        'curriculum_attempt', 'curriculum_attempt_answer', 'curriculum_upload'];
    const snapshot = async tables => {
        const result = {};
        for (const table of tables) result[table] = await rows(`SELECT * FROM \`${table}\` ORDER BY 1`);
        return result;
    };
    try {
        await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        created = true;
        await connection.changeUser({ database });
        await connection.query('CREATE TABLE user (user_id BIGINT PRIMARY KEY, is_deleted TINYINT DEFAULT 0) ENGINE=InnoDB');
        await connection.query(migration('20260918_add_curriculum_activities_and_games.sql'));
        await connection.query(migration('20261011_add_curriculum_video_ai_queue.sql'));
        await connection.query(`
            INSERT INTO user VALUES (1,0);
            INSERT INTO curriculum_lesson (lesson_id,lesson_code,level_code,topic_code,title,content_status)
                VALUES (1,'L1.BT.01','L1','BT','M1 synthetic lesson','ready');
            INSERT INTO curriculum_activity (activity_id,lesson_id,activity_code,game_type,title,game_config)
                VALUES (1,1,'L1.BT.01.T01','ChoiceQuizGame','M1 synthetic quiz',JSON_OBJECT('questions',JSON_ARRAY()));
            INSERT INTO curriculum_media (activity_id,media_code,media_type,source_url)
                VALUES (1,'fixture.image','image','/fixture-only/example.png');
            INSERT INTO curriculum_game_progress
                (activity_id,user_id,game_type,score,stars,is_completed,teacher_feedback,game_result_details,ai_status,ai_confidence)
                VALUES (1,1,'ChoiceQuizGame',90,3,1,'Bài cũ: cà, cá, đ',JSON_OBJECT('legacy',true),'completed',0.9);
            INSERT INTO curriculum_user_activity_summary
                (user_id,activity_id,best_score,best_stars,last_progress_id,is_completed)
                VALUES (1,1,90,3,1,1);
            INSERT INTO curriculum_ai_job (progress_id,activity_id,user_id,video_url,status)
                VALUES (1,1,1,'/uploads/curriculum-practice/fixture.webm','completed');
        `);
        const before = await snapshot(legacyTables);
        await connection.query(migration(m1));

        await t.test('all legacy columns and rows survive; new structures start empty', async () => {
            for (const table of legacyTables) {
                const columns = Object.keys(before[table][0]).map(name => `\`${name}\``).join(',');
                assert.deepEqual(await rows(`SELECT ${columns} FROM \`${table}\` ORDER BY 1`), before[table], table);
            }
            const [progress] = await rows('SELECT attempt_id,version_id,result_source,review_status FROM curriculum_game_progress');
            assert.deepEqual(progress, { attempt_id: null, version_id: null,
                result_source: 'legacy_unverified', review_status: 'legacy_unverified' });
            for (const table of newTables) assert.equal(await count(table), 0, table);
            const engines = await rows(`SELECT ENGINE FROM information_schema.TABLES
                WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?)`, [database, newTables]);
            assert.equal(engines.length, 6);
            assert.ok(engines.every(row => row.ENGINE === 'InnoDB'));
        });

        await t.test('legacy history insert and summary upsert remain compatible', async () => {
            // Same explicit-column writes used by the pre-G1 submit endpoint.
            await connection.beginTransaction();
            try {
                const [insert] = await connection.execute(`INSERT INTO curriculum_game_progress
                    (activity_id,user_id,game_type,score,stars,duration_seconds,is_completed,
                     submission_video_url,teacher_feedback,game_result_details,played_at)
                    VALUES (?,?,?,?,?,?,?,?,NULL,?,NOW())`,
                [1,1,'ChoiceQuizGame',80,2,12,1,null,JSON.stringify({ fixture: true })]);
                await connection.execute(`INSERT INTO curriculum_user_activity_summary
                    (user_id,activity_id,best_score,best_stars,total_attempts,last_progress_id,is_completed,last_played_at)
                    VALUES (?,?,?,?,1,?,?,NOW()) ON DUPLICATE KEY UPDATE
                    best_score=GREATEST(best_score,VALUES(best_score)),
                    best_stars=GREATEST(best_stars,VALUES(best_stars)),total_attempts=total_attempts+1,
                    last_progress_id=VALUES(last_progress_id),is_completed=GREATEST(is_completed,VALUES(is_completed)),
                    last_played_at=NOW()`, [1,1,80,2,insert.insertId,1]);
                await connection.commit();
                const [summary] = await rows('SELECT * FROM curriculum_user_activity_summary');
                assert.equal(summary.total_attempts, 2);
                assert.equal(Number(summary.best_score), 90);
                assert.equal(summary.last_progress_id, insert.insertId);
                assert.equal(await count('curriculum_game_progress'), 2, 'Multiple NULL attempt IDs are permitted');
                const [progress] = await rows('SELECT * FROM curriculum_game_progress WHERE progress_id=?', [insert.insertId]);
                assert.equal(progress.result_source, 'legacy_unverified');
                assert.equal(progress.review_status, 'legacy_unverified');
                assert.equal(progress.attempt_id, null);
                assert.equal(progress.version_id, null);
            } catch (error) {
                await connection.rollback();
                throw error;
            }
        });

        await t.test('new content and assets default to unapproved; version defaults to draft', async () => {
            await connection.execute(`INSERT INTO curriculum_content_item (item_id,item_type,label,source_refs)
                VALUES ('fixture-ca','word','cà',JSON_ARRAY())`);
            await connection.query(`INSERT INTO curriculum_asset (item_id,role,provider,source_refs)
                VALUES ('fixture-ca','illustration','fixture',JSON_ARRAY())`);
            await connection.execute(`INSERT INTO curriculum_activity_version (activity_id,version_number,content_hash,config)
                VALUES (1,1,?,?)`, ['a'.repeat(64), JSON.stringify({ fixture: true })]);
            assert.equal((await rows('SELECT approval_status FROM curriculum_content_item'))[0].approval_status, 'draft');
            assert.equal((await rows('SELECT verification_status FROM curriculum_asset'))[0].verification_status, 'unverified');
            assert.equal((await rows('SELECT publication_status FROM curriculum_activity_version'))[0].publication_status, 'draft');
            assert.equal((await rows("SELECT COUNT(*) n FROM curriculum_activity_version WHERE publication_status='published'"))[0].n, 0);
            await assert.rejects(connection.execute(`INSERT INTO curriculum_activity_version
                (activity_id,version_number,content_hash,config) VALUES (1,1,?,JSON_OBJECT())`, ['b'.repeat(64)]),
            { code: 'ER_DUP_ENTRY' });
            await assert.rejects(connection.execute(`INSERT INTO curriculum_activity_version
                (activity_id,version_number,content_hash,config) VALUES (1,2,?,JSON_OBJECT())`, ['a'.repeat(64)]),
            { code: 'ER_DUP_ENTRY' });
        });

        await t.test('attempt requests, answer events and results enforce uniqueness', async () => {
            const [{ version_id: versionId }] = await rows('SELECT version_id FROM curriculum_activity_version');
            await connection.execute(`INSERT INTO curriculum_attempt
                (attempt_id,user_id,activity_id,version_id,request_id,snapshot) VALUES ('fixture-attempt',1,1,?,'request-1',JSON_OBJECT())`, [versionId]);
            await assert.rejects(connection.execute(`INSERT INTO curriculum_attempt
                (attempt_id,user_id,activity_id,version_id,request_id,snapshot) VALUES ('another-attempt',1,1,?,'request-1',JSON_OBJECT())`, [versionId]),
            { code: 'ER_DUP_ENTRY' });
            await connection.query(`INSERT INTO curriculum_attempt_answer (attempt_id,event_id,task_id,payload,response)
                VALUES ('fixture-attempt','event-1','task-1',JSON_OBJECT(),JSON_OBJECT())`);
            await assert.rejects(connection.query(`INSERT INTO curriculum_attempt_answer (attempt_id,event_id,task_id,payload,response)
                VALUES ('fixture-attempt','event-1','task-1',JSON_OBJECT(),JSON_OBJECT())`), { code: 'ER_DUP_ENTRY' });
            const resultSql = `INSERT INTO curriculum_game_progress
                (activity_id,user_id,game_type,attempt_id,version_id,result_source,review_status)
                VALUES (1,1,'ChoiceQuizGame','fixture-attempt',?,'preview','pending_review')`;
            await connection.execute(resultSql, [versionId]);
            await assert.rejects(connection.execute(resultSql, [versionId]), { code: 'ER_DUP_ENTRY' });
        });

        await t.test('foreign keys reject orphan assets and uploads and protect referenced versions', async () => {
            await assert.rejects(connection.query(`INSERT INTO curriculum_asset (item_id,role,provider,source_refs)
                VALUES ('missing','illustration','fixture',JSON_ARRAY())`), { code: 'ER_NO_REFERENCED_ROW_2' });
            await assert.rejects(connection.query(`INSERT INTO curriculum_upload
                (upload_id,user_id,attempt_id,task_id,object_key,mime_type,byte_size)
                VALUES ('fixture-upload',1,'missing','task-1','fixture.webm','video/webm',10)`),
            { code: 'ER_NO_REFERENCED_ROW_2' });
            await assert.rejects(connection.query('DELETE FROM curriculum_activity_version'), { code: 'ER_ROW_IS_REFERENCED_2' });
        });

        await t.test('direct replay fails without altering existing records; M1 requires a migration journal', async () => {
            const tables = [...legacyTables, ...newTables];
            const saved = await snapshot(tables);
            await assert.rejects(connection.query(migration(m1)), { code: 'ER_DUP_FIELDNAME' });
            assert.deepEqual(await snapshot(tables), saved);
        });
    } finally {
        try {
            // Identifier generated above, never derived from the URL or user data.
            if (created) await connection.query(`DROP DATABASE \`${database}\``);
        } finally {
            await connection.end();
        }
    }
});
