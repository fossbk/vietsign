const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mysql=require('mysql2/promise');
const {randomBytes}=require('node:crypto');
const {buildA:build}=require('./fixtures/g3-import-bundles');
const importer=require('../src/features/curriculum/services/curriculumImport.service');
const content=require('../src/features/curriculum/services/curriculumContent.service');
test('G3A import: diff, atomicity, IDs/history, idempotency, drafts and rollback', {skip:!process.env.CURRICULUM_TEST_DB_URL},async t=>{
 const url=new URL(process.env.CURRICULUM_TEST_DB_URL);assert.equal(url.pathname,'/curriculum_g1_test');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
 const name=`curriculum_g3a_test_${randomBytes(6).toString('hex')}`;
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password});await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);await admin.end();url.pathname=`/${name}`;
 const db=mysql.createPool({uri:url.toString(),multipleStatements:true,connectionLimit:4,charset:'utf8mb4',timezone:'Z'});
 const dbPath=require.resolve('../src/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 const attempts=require('../src/features/curriculum/services/curriculumAttempt.service');
 const bundle=build();let baseline,reviewed,applied;
 const conn=await db.getConnection();
 try{
  await db.query("CREATE TABLE user(user_id BIGINT PRIMARY KEY,code VARCHAR(30),is_deleted TINYINT DEFAULT 0);INSERT INTO user VALUES(1,'STUDENT',0),(2,'TEACHER',0)");
  const migration=file=>fs.readFileSync(path.resolve(__dirname,'../../database/migrations',file),'utf8');
  await db.query(migration('20260918_add_curriculum_activities_and_games.sql'));await db.query(migration('20261011_add_curriculum_video_ai_queue.sql'));await db.query(migration('20261109_curriculum_m1.sql'));
  for(const [i,l]of bundle.lessons.entries())await db.execute("INSERT INTO curriculum_lesson(lesson_id,lesson_code,level_code,topic_code,title,description,content_status) VALUES(?,?,? ,?,'Old title','Old description','drafting')",[101+i,l.lesson_code,'L1','BT']);
  for(const [i,a]of bundle.activities.entries())await db.execute("INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,instruction,game_config) VALUES(?,?,?,?, 'Old activity','Old instruction',JSON_OBJECT('legacy',true))",[1001+i,101+Number(a.lesson_code.slice(-2))-1,a.activity_code,a.game_type]);
  const old={runtime_version:1,game_type:'FlipCardViewer',legacy:true,policy:{completion:'viewed_all',star_thresholds:null,max_retries:null},tasks:[{id:'old-task',kind:'view',prompt:{type:'text',content:'Old snapshot'}}]};
  const [version]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(1001,1,?,'draft',?)",[content.hash(old),JSON.stringify(old)]);
  await db.execute("INSERT INTO curriculum_attempt(attempt_id,user_id,activity_id,version_id,request_id,is_preview,snapshot) VALUES('00000000-0000-4000-8000-000000000001',2,1001,?,'old-request',1,?)",[version.insertId,JSON.stringify(content.snapshot(old))]);
  await db.query("INSERT INTO curriculum_media(activity_id,media_code,media_type,source_url) VALUES(1001,'OLD','image','/legacy.png');INSERT INTO curriculum_game_progress(activity_id,user_id,game_type,score,stars,is_completed) VALUES(1001,1,'FlipCardViewer',75,2,1)");
  baseline=await importer.readState(conn);
  await t.test('CLI snapshot is read-only and produces a checksum matching the importer state',async()=>{
   const os=require('node:os'),{spawnSync}=require('node:child_process');
   const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vietsign-g3-snapshot-'));
   try{
    const out=path.join(folder,'snapshot.json'),history=await importer.historyFingerprint(conn);
    const run=spawnSync(process.execPath,[path.resolve(__dirname,'../src/scripts/curriculum-import.cjs'),'snapshot','--out',out],{encoding:'utf8',env:{...process.env,CURRICULUM_IMPORT_DB_URL:url.toString()}});
    assert.equal(run.status,0,run.stderr);
    const {snapshot_hash,...snapshot}=JSON.parse(fs.readFileSync(out,'utf8'));
    assert.equal(snapshot.target.db,name);assert.equal(snapshot.state_hash,importer.hash(baseline));assert.equal(snapshot_hash,importer.hash(snapshot));
    assert.equal(importer.hash(await importer.readState(conn)),importer.hash(baseline));assert.deepEqual(await importer.historyFingerprint(conn),history);
   }finally{assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('vietsign-g3-snapshot-'));fs.rmSync(folder,{recursive:true,force:true});}
  });
  await t.test('dry-run is read-only and proposes 33 drafts without replacing IDs',async()=>{
   reviewed=importer.plan(bundle,baseline);assert.equal(reviewed.summary.versionsInserted,33);assert.equal(reviewed.summary.published,0);assert.equal(reviewed.summary.legacyMediaChanged,0);assert.equal((await importer.readState(conn)).items.length,0);assert.deepEqual(reviewed.preserved.activity_ids,baseline.activities.map(a=>a.activity_id));
  });
  await t.test('changed DB content invalidates a reviewed diff before writing',async()=>{
   await db.query("UPDATE curriculum_activity SET title='Concurrent edit' WHERE activity_id=1001");
   await assert.rejects(()=>importer.apply(conn,bundle,reviewed),/changed since diff/);
   assert.equal((await importer.readState(conn)).items.length,0);await db.query("UPDATE curriculum_activity SET title='Old activity' WHERE activity_id=1001");reviewed=importer.plan(bundle,await importer.readState(conn));
  });
  await t.test('failed version insert rolls back all items, assets and metadata',async()=>{
   const before=await importer.readState(conn);await db.query("CREATE TRIGGER reject_g3a BEFORE INSERT ON curriculum_activity_version FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='G3A fixture rejection'");
   await assert.rejects(()=>importer.apply(conn,bundle,reviewed),/fixture rejection/);await db.query('DROP TRIGGER reject_g3a');assert.equal(importer.hash(await importer.readState(conn)),importer.hash(before));
  });
  await t.test('apply keeps legacy history and immutable versions, creates only draft content',async()=>{
   applied=await importer.apply(conn,bundle,reviewed);assert.equal(applied.insertedItems.length,2);assert.equal(applied.insertedVersions.length,33);assert.deepEqual(applied.historyBefore,applied.historyAfter);
   const after=await importer.readState(conn);assert.equal(after.lessons.length,5);assert.equal(after.activities.length,33);assert.equal(after.versions.filter(v=>v.publication_status==='published').length,0);assert.equal(importer.hash(after.versions[0]),importer.hash(baseline.versions[0]));assert.deepEqual(after.activities.map(a=>a.activity_id),baseline.activities.map(a=>a.activity_id));
  });
  let preview;
  await t.test('teacher opens imported draft; student blocked; old request restores original snapshot',async()=>{
   await assert.rejects(()=>attempts.start(1,1001,{requestId:'blocked-student'}),e=>e.status===403);
   preview=await attempts.start(2,1001,{requestId:'new-source'});assert.equal(preview.isPreview,true);assert.equal(preview.config.runtime_version,2);assert.equal(preview.config.tasks.length,1);assert.ok(preview.config.tasks.every(t=>!('correct' in t)));
   const oldAttempt=await attempts.start(2,1001,{requestId:'old-request'});assert.equal(oldAttempt.config.runtime_version,1);assert.equal(oldAttempt.config.tasks[0].prompt.content,'Old snapshot');
  });
  await t.test('second import reuses items/assets and all 33 versions without writes',async()=>{
   const state=await importer.readState(conn),next=importer.plan(bundle,state);assert.equal(next.summary.itemsInserted,0);assert.equal(next.summary.assetsInserted,0);assert.equal(next.summary.versionsInserted,0);assert.equal(next.summary.versionsReused,33);
   const repeat=await importer.apply(conn,bundle,next);assert.equal(repeat.insertedVersions.length,0);assert.equal(importer.hash(await importer.readState(conn)),importer.hash(state));
  });
  await t.test('an older package cannot silently replace metadata while a newer draft stays active',async()=>{
   const state=await importer.readState(conn),current=state.versions.filter(v=>v.activity_id===1001).at(-1),next={...current.config,instruction:'A later editorial change'};
   const [created]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(1001,?,?,'draft',?)",[current.version_number+1,content.hash(next),JSON.stringify(next)]);
   try{assert.throws(()=>importer.plan(bundle,{...state,versions:[...state.versions,{version_id:created.insertId,activity_id:1001,version_number:current.version_number+1,content_hash:content.hash(next),publication_status:'draft',config:next}]}),/newer draft/);
    const withNew=await importer.readState(conn);await assert.rejects(()=>importer.rollback(conn,applied),/Content changed after import/);assert.equal(importer.hash(await importer.readState(conn)),importer.hash(withNew));}
   finally{await db.execute('DELETE FROM curriculum_activity_version WHERE version_id=?',[created.insertId]);}
  });
  await t.test('rollback archives imported versions and retains all attempts, assets and history',async()=>{
   const before=await importer.historyFingerprint(conn),result=await importer.rollback(conn,applied);assert.equal(result.archivedVersions,33);assert.deepEqual(await importer.historyFingerprint(conn),before);
   assert.equal((await attempts.get(2,preview.attemptId)).versionId,preview.versionId);
   const state=await importer.readState(conn);assert.equal(state.items.length,2);assert.equal(state.versions.filter(v=>v.publication_status==='archived').length,33);assert.equal(state.activities[0].title,'Old activity');assert.equal(state.versions[0].publication_status,'draft');
  });
 }finally{conn.release();await db.query(`DROP DATABASE \`${name}\``);await db.end();}
});
