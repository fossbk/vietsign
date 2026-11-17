const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const mysql=require('mysql2/promise');
const {randomBytes}=require('node:crypto');
const {buildA,buildB}=require('./fixtures/g3-import-bundles');
const g3a=require('../src/features/curriculum/services/curriculumImport.service'),g3b=require('../src/features/curriculum/services/curriculumG3bImport.service');
const content=require('../src/features/curriculum/services/curriculumContent.service');
test('G3B append-only import protects B1–B5/history, handles conflicts, repeat and rollback',{skip:!process.env.CURRICULUM_TEST_DB_URL},async t=>{
 const url=new URL(process.env.CURRICULUM_TEST_DB_URL);assert.equal(url.pathname,'/curriculum_g1_test');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));const name=`curriculum_g3b_test_${randomBytes(6).toString('hex')}`;
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password});await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);await admin.end();url.pathname=`/${name}`;
 const db=mysql.createPool({uri:url.toString(),multipleStatements:true,connectionLimit:4,charset:'utf8mb4',timezone:'Z'}),conn=await db.getConnection();
 const dbPath=require.resolve('../src/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};const attempts=require('../src/features/curriculum/services/curriculumAttempt.service');
 const a=buildA(),b=buildB();let reviewed,applied,baseline;
 try{
  await db.query("CREATE TABLE user(user_id BIGINT PRIMARY KEY,code VARCHAR(30),is_deleted TINYINT DEFAULT 0);INSERT INTO user VALUES(1,'STUDENT',0),(2,'TEACHER',0)");
  for(const file of ['20260918_add_curriculum_activities_and_games.sql','20261011_add_curriculum_video_ai_queue.sql','20261109_curriculum_m1.sql'])await db.query(fs.readFileSync(path.resolve(__dirname,'../../database/migrations',file),'utf8'));
  for(const [i,l]of a.lessons.entries())await db.execute("INSERT INTO curriculum_lesson(lesson_id,lesson_code,level_code,topic_code,title,content_status) VALUES(?,?,'L1','BT','Old title','drafting')",[301+i,l.lesson_code]);
  for(const [i,act]of a.activities.entries())await db.execute("INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,game_config) VALUES(?,?,?,?,'Old activity',JSON_OBJECT())",[3001+i,301+Number(act.lesson_code.slice(-2))-1,act.activity_code,act.game_type]);
  const old={runtime_version:1,game_type:'FlipCardViewer',legacy:true,policy:{completion:'viewed_all',max_retries:null,star_thresholds:null},tasks:[{id:'legacy',kind:'view',prompt:{type:'text',content:'Keep this old snapshot'}}]};
  const [v]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(3001,1,?,'draft',?)",[content.hash(old),JSON.stringify(old)]);
  await db.execute("INSERT INTO curriculum_attempt(attempt_id,user_id,activity_id,version_id,request_id,is_preview,snapshot) VALUES('00000000-0000-4000-8000-000000000003',2,3001,?,'old-request',1,?)",[v.insertId,JSON.stringify(content.snapshot(old))]);
  await db.query("INSERT INTO curriculum_media(activity_id,media_code,media_type,source_url) VALUES(3001,'OLD','image','/legacy.png');INSERT INTO curriculum_game_progress(activity_id,user_id,game_type,score,stars,is_completed) VALUES(3001,1,'FlipCardViewer',70,1,1)");
  await g3a.apply(conn,a,g3a.plan(a,await g3a.readState(conn)));baseline=await g3b.readState(conn);
  await t.test('dry-run adds only B6–B10 and reuses the synthetic icon row',async()=>{
   reviewed=g3b.plan(b,baseline,a);assert.equal(reviewed.summary.lessonsInserted,5);assert.equal(reviewed.summary.activitiesInserted,35);assert.equal(reviewed.summary.itemsInserted,1);assert.equal(reviewed.summary.assetsInserted,1);assert.equal(reviewed.summary.versionsInserted,35);assert.equal(reviewed.summary.existingRowsUpdated,0);assert.equal(g3b.hash(await g3b.readState(conn)),g3b.hash(baseline));
  });
  await t.test('conflicting dependencies and out-of-scope codes stop before writes',()=>{
   const changed=structuredClone(b);changed.items.find(i=>i.reuse_from).label='Wrong icon';const {package_hash,...body}=changed;changed.package_hash=g3b.hash(body);assert.throws(()=>g3b.plan(changed,baseline,a),/Existing item differs/);
   const outside=structuredClone(b);outside.lessons[0].lesson_code='L1.BT.01';const {package_hash:_,...rest}=outside;outside.package_hash=g3b.hash(rest);assert.throws(()=>g3b.plan(outside,baseline,a),/scope|identity mismatch/);
  });
  await t.test('stale reviewed diff never overwrites a concurrent B1 edit',async()=>{
   await db.query("UPDATE curriculum_lesson SET title='Concurrent B1 edit' WHERE lesson_id=301");await assert.rejects(()=>g3b.apply(conn,b,reviewed,a),/changed since diff/);assert.equal((await g3b.readState(conn)).lessons.length,5);await db.query('UPDATE curriculum_lesson SET title=? WHERE lesson_id=301',[a.lessons[0].title]);baseline=await g3b.readState(conn);reviewed=g3b.plan(b,baseline,a);
  });
  await t.test('a version-insert failure rolls back new lessons, activities, items and assets',async()=>{
   await db.query("CREATE TRIGGER reject_g3b BEFORE INSERT ON curriculum_activity_version FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='G3B fixture rejection'");await assert.rejects(()=>g3b.apply(conn,b,reviewed,a),/fixture rejection/);await db.query('DROP TRIGGER reject_g3b');assert.equal(g3b.hash(await g3b.readState(conn)),g3b.hash(baseline));
  });
  await t.test('apply creates 10/68 total and preserves every existing content/history row',async()=>{
   applied=await g3b.apply(conn,b,reviewed,a);assert.deepEqual(applied.preservedContentBefore,applied.preservedContentAfter);assert.deepEqual(applied.historyBefore,applied.historyAfter);const state=await g3b.readState(conn);assert.equal(state.lessons.length,10);assert.equal(state.activities.length,68);assert.equal(state.items.length,3);assert.equal(state.assets.length,3);assert.equal(applied.insertedVersions.length,35);assert.equal(state.versions.some(v=>v.publication_status==='published'),false);
  });
  let preview;
  await t.test('new teacher attempts read G3B, student is blocked and old request stays intact',async()=>{
   const record=applied.insertedActivities.find(a=>a.code==='L1.BT.06.T01');await assert.rejects(()=>attempts.start(1,record.id,{requestId:'student'}),e=>e.status===403);preview=await attempts.start(2,record.id,{requestId:'new-draft'});assert.equal(preview.config.runtime_version,2);assert.equal(preview.config.tasks.length,1);
   const oldAttempt=await attempts.start(2,3001,{requestId:'old-request'});assert.equal(oldAttempt.config.tasks[0].prompt.content,'Keep this old snapshot');
  });
  await t.test('second import is a no-op and cannot create duplicate IDs/versions',async()=>{
   const state=await g3b.readState(conn),next=g3b.plan(b,state,a);assert.equal(next.summary.lessonsInserted+next.summary.activitiesInserted+next.summary.itemsInserted+next.summary.assetsInserted+next.summary.versionsInserted,0);assert.equal(next.summary.versionsReused,35);const again=await g3b.apply(conn,b,next,a);assert.equal(again.insertedVersions.length,0);assert.equal(g3b.hash(await g3b.readState(conn)),g3b.hash(state));
  });
  await t.test('changed B6 metadata is a conflict, not an implicit update',async()=>{
   const record=applied.insertedActivities[0];const temporary=await db.getConnection();await temporary.beginTransaction();await temporary.execute("UPDATE curriculum_activity SET title='Another editorial change' WHERE activity_id=?",[record.id]);const changed=await g3b.readState(temporary);assert.throws(()=>g3b.plan(b,changed,a),/Existing activity differs/);await temporary.rollback();temporary.release();
  });
  await t.test('rollback refuses to hide a lesson containing content added after import',async()=>{
   const lesson=applied.insertedLessons[0];
   const [extra]=await db.execute("INSERT INTO curriculum_activity(lesson_id,activity_code,game_type,title,game_config) VALUES(?,'L1.BT.06.X99','FlipCardViewer','Later independent activity',JSON_OBJECT())",[lesson.id]);
   try{const before=await g3b.readState(conn);await assert.rejects(()=>g3b.rollback(conn,applied),/Content changed after import/);assert.equal(g3b.hash(await g3b.readState(conn)),g3b.hash(before));}
   finally{await db.execute('DELETE FROM curriculum_activity WHERE activity_id=?',[extra.insertId]);}
  });
  await t.test('rollback deactivates only new content, retaining B1–B5 and all snapshots',async()=>{
   const history=await g3b.historyFingerprint(conn),result=await g3b.rollback(conn,applied);assert.equal(result.existingContentPreserved,true);assert.deepEqual(await g3b.historyFingerprint(conn),history);const state=await g3b.readState(conn);assert.deepEqual(g3b.fingerprints(state,applied.preservedContentBefore),applied.preservedContentBefore);assert.equal(state.lessons.filter(l=>l.is_active).length,5);assert.equal(state.activities.filter(a=>a.is_active).length,33);assert.equal((await attempts.get(2,preview.attemptId)).versionId,preview.versionId);assert.equal(state.versions.filter(v=>v.publication_status==='archived').length,35);
  });
 }finally{conn.release();await db.query(`DROP DATABASE \`${name}\``);await db.end();}
});
