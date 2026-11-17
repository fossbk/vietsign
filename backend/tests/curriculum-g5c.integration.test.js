const test=require('node:test'),assert=require('node:assert/strict'),mysql=require('mysql2/promise');
const {randomBytes,randomUUID}=require('node:crypto'),{performance}=require('node:perf_hooks');

test('G5C: scoped reads, paired performance measurements and class/editor acceptance', {skip:!process.env.CURRICULUM_TEST_DB_URL},async t=>{
 const url=new URL(process.env.CURRICULUM_TEST_DB_URL);
 assert.equal(url.pathname,'/curriculum_g1_test');assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
 // Reuse the guarded G5B seed: all data are synthetic, never customer packages.
 const name=`curriculum_g5b_test_${randomBytes(6).toString('hex')}`;
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password});
 await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);await admin.end();url.pathname='/'+name;
 const db=mysql.createPool({uri:url.toString(),multipleStatements:true,connectionLimit:6,charset:'utf8mb4'});
 let queries=0,returnedRows=0;
 const proxy={getConnection:()=>db.getConnection()};
 for(const method of ['execute','query'])proxy[method]=async(...args)=>{queries++;const result=await db[method](...args);if(Array.isArray(result[0]))returnedRows+=result[0].length;return result;};
 const dbPath=require.resolve('../src/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:proxy};
 process.env.JWT_SECRET='g5c-synthetic-only';
 const service=require('../src/features/curriculum/services/curriculum.services'),learning=require('../src/features/curriculum/services/curriculumLearning.service'),editor=require('../src/features/curriculum/services/curriculumEditor.service'),attempts=require('../src/features/curriculum/services/curriculumAttempt.service'),reviews=require('../src/features/curriculum/services/curriculumReview.service'),c=require('../src/features/curriculum/services/curriculumContent.service');
 // G5B detail algorithm: all-lesson projection followed by a second per-lesson read.
 // Unscoped getLessons/activityStates remain the same for this baseline comparison.
 async function beforeDetail(code,userId){const lesson=(await service.getLessons({userId})).find(l=>l.lesson_code===code);return lesson?{...lesson,activities:await service.activityStates(userId,lesson.lesson_id)}:null;}
 async function inventory(){const [tables]=await db.query('SHOW TABLES');const result={};for(const row of tables){const table=Object.values(row)[0];assert.match(table,/^[a-z_]+$/);const [rows]=await db.query(`SELECT * FROM \`${table}\``),[[ddl]]=await db.query(`SHOW CREATE TABLE \`${table}\``);result[table]={rows:rows.map(c.hash).sort(),schema:c.hash(ddl['Create Table'])};}return result;}
 const fill=async a=>{for(const task of a.config.tasks){const id=randomUUID();await db.execute('INSERT INTO curriculum_upload(upload_id,user_id,attempt_id,task_id,object_key,mime_type,byte_size) VALUES(?,3,?,?,?,?,12)',[id,a.attemptId,task.id,`curriculum-practice/${id}.webm`,'video/webm']);await attempts.answer(3,a.attemptId,{eventId:randomUUID(),taskId:task.id,uploadId:id});}await attempts.submit(3,a.attemptId,{idempotencyKey:randomUUID()});return attempts.get(3,a.attemptId);};
 try{
  await require('./helpers/curriculumG5bFixture.cjs').seed(db);
  await t.test('all ten lesson responses match the old algorithm for admins, teachers and students',async()=>{
   const old=await inventory();
   for(const user of [1,2,3,4])for(let i=1;i<=10;i++){const code=`L1.BT.${String(i).padStart(2,'0')}`,actual=await service.getLessonByCode(code,user);assert.deepEqual(actual,await beforeDetail(code,user));assert.ok(actual.activities.every(a=>a.activity_level==='T'));if(user===3)assert.ok(actual.activities.every(a=>a.draft_version_id===null&&!a.can_preview));}
   for(const code of ['L1.BT.99','l1.bt.01','L1.BT.01 ',"L1.BT.01' OR 1=1 --",'',undefined])assert.equal(await service.getLessonByCode(code,1),null);
   assert.deepEqual(await service.getLessons({level:'L2',userId:1}),[]);
   assert.deepEqual(await inventory(),old);
  });
  await t.test('role revocation, publication checksum, media readiness and progress remain live and user-specific',async()=>{
   const [[act]]=await db.query("SELECT * FROM curriculum_activity WHERE activity_code='L1.BT.01.T01'"),[[asset]]=await db.query('SELECT * FROM curriculum_asset ORDER BY asset_id LIMIT 1');
   await db.execute("UPDATE curriculum_asset SET verification_status='verified' WHERE asset_id=?",[asset.asset_id]);await db.execute("UPDATE curriculum_content_item SET approval_status='approved' WHERE item_id=?",[asset.item_id]);
   const config={runtime_version:2,game_type:'FlipCardViewer',title:'Synthetic published view',source_refs:[{fixture:'isolated G5C'}],asset_ids:[asset.asset_id],rounds:[{id:'r'}],tasks:[{id:'view',roundId:'r',kind:'view',prompt:{type:'image',content:asset.playable_url}}],policy:{status:'approved',completion:'viewed_all',max_retries:null,star_thresholds:null}};
   c.validate(config,true);const [[next]]=await db.execute('SELECT MAX(version_number)+1 n FROM curriculum_activity_version WHERE activity_id=?',[act.activity_id]);
   const [created]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,?,?,'published',?)",[act.activity_id,next.n,c.hash(config),JSON.stringify(config)]);
   await db.execute("UPDATE curriculum_lesson SET content_status='ready' WHERE lesson_id=?",[act.lesson_id]);
   const attempt=await attempts.start(3,act.activity_id,{requestId:'published-view'});await attempts.answer(3,attempt.attemptId,{eventId:randomUUID(),taskId:'view',action:'view'});await attempts.submit(3,attempt.attemptId,{idempotencyKey:'finish-view'});
   const unchanged=await inventory();for(const user of [1,2,3])assert.deepEqual(await service.getLessonByCode('L1.BT.01',user),await beforeDetail('L1.BT.01',user));assert.deepEqual(await inventory(),unchanged);
   assert.equal((await service.getLessonByCode('L1.BT.01',3)).completed_activities,1);assert.equal((await service.getLessonByCode('L1.BT.01',2)).completed_activities,0);
   await db.execute("UPDATE curriculum_asset SET verification_status='unverified' WHERE asset_id=?",[asset.asset_id]);assert.equal((await service.getLessonByCode('L1.BT.01',3)).published_activities,0);await db.execute("UPDATE curriculum_asset SET verification_status='verified' WHERE asset_id=?",[asset.asset_id]);
   await db.execute('UPDATE curriculum_activity_version SET content_hash=? WHERE version_id=?',['0'.repeat(64),created.insertId]);assert.equal((await service.getLessonByCode('L1.BT.01',3)).published_activities,0);await db.execute('UPDATE curriculum_activity_version SET content_hash=? WHERE version_id=?',[c.hash(config),created.insertId]);
   await db.query("UPDATE user SET code='STUDENT' WHERE user_id=2");assert.ok((await service.getLessonByCode('L1.BT.01',2)).activities.every(a=>!a.can_preview&&a.draft_version_id===null));await db.query("UPDATE user SET code='TEACHER' WHERE user_id=2");
   // Restore draft-only measurement workload; no application data is involved.
   await db.execute("UPDATE curriculum_activity_version SET publication_status='archived' WHERE version_id=?",[created.insertId]);await db.execute("UPDATE curriculum_lesson SET content_status='drafting' WHERE lesson_id=?",[act.lesson_id]);
  });
  await t.test('class assignment → submit → review → edit new draft → scoped retake → resume keeps the original snapshot',async()=>{
   const [[activity]]=await db.query("SELECT * FROM curriculum_activity WHERE activity_code='L1.GROUP.B01-B03.H.G1'");
   const practice=await reviews.createPractice(2,{classId:1,activityId:activity.activity_id,speaker:'Speaker A',requestId:'class-chain'});
   let parent=await reviews.startPractice(3,practice.practice_id,{requestId:'class-start'});assert.equal(parent.config.tasks.length,3);parent=await fill(parent);
   for(const [i,item]of parent.recording.items.entries())await reviews.write(2,parent.attemptId,{requestId:randomUUID(),taskId:item.taskId,uploadId:item.uploadId,verdict:i?'accepted':'needs_revision',comment:i?'':'Repeat first turn',expectedReviewId:0});
   const detail=await editor.detail(1,activity.activity_id),body={requestId:randomUUID(),reason:'Synthetic editorial update during class review',action:'edit',baseVersionId:detail.head.versionId,baseHash:detail.head.hash,config:{...detail.config,instruction:'New draft instruction'},bindings:{}},report=await editor.review(1,activity.activity_id,body);
   const saved=await editor.save(1,activity.activity_id,{...body,reviewHash:report.reviewHash,reviewToken:report.reviewToken});assert.notEqual(saved.versionId,parent.versionId);
   const [[frozenRow]]=await db.execute('SELECT * FROM curriculum_attempt WHERE attempt_id=?',[parent.attemptId]);
   const frozenParent=await attempts.get(3,parent.attemptId),childRow=await reviews.resubmit(3,parent.attemptId,{requestId:'scoped-retake'}),child=await attempts.get(3,childRow.attempt_id);
   assert.equal(child.versionId,parent.versionId);assert.equal(child.config.compound.practiceSpeaker,'Speaker A');assert.equal(child.config.compound.units.length,5);assert.deepEqual(child.config.tasks.map(x=>x.id),['G1:u1']);
   const baseline=await inventory(),progress=await learning.overview(3);assert.equal(progress.resume.attemptId,child.attemptId);assert.equal(progress.resume.scope,'class');assert.equal(progress.resume.required,1);assert.equal(progress.summary.officialCompleted,0);assert.deepEqual(await inventory(),baseline);
   const done=await fill(child);await reviews.write(2,done.attemptId,{requestId:randomUUID(),taskId:done.recording.items[0].taskId,uploadId:done.recording.items[0].uploadId,verdict:'accepted',comment:'',expectedReviewId:0});
   const currentParent=await attempts.get(3,parent.attemptId);assert.deepEqual(currentParent.config,frozenParent.config);assert.deepEqual(currentParent.answers,frozenParent.answers);assert.deepEqual(currentParent.review.items,frozenParent.review.items);
   assert.deepEqual((await db.execute('SELECT * FROM curriculum_attempt WHERE attempt_id=?',[parent.attemptId]))[0][0],frozenRow);assert.equal(done.result.aiStatus,'not_requested');assert.equal(done.result.isCompleted,0);
   const latest=await editor.detail(1,activity.activity_id);assert.equal(latest.version.status,'draft');assert.ok(latest.config.blocked_by_decisions.includes('D07'));
   const [[jobs]]=await db.query('SELECT COUNT(*) n FROM curriculum_ai_job');assert.equal(jobs.n,0);
  });
  await t.test('paired warm measurements preserve every table and identical response hashes',async()=>{
   const baseline=await inventory(),report={method:'20 alternating-order paired warm sequential service calls; synthetic 10 lessons/84 activities plus class history; excludes HTTP/browser; nearest-rank p95',cases:{}};
   const cases={lessonB1:[()=>beforeDetail('L1.BT.01',1),()=>service.getLessonByCode('L1.BT.01',1)],lessonB10:[()=>beforeDetail('L1.BT.10',1),()=>service.getLessonByCode('L1.BT.10',1)],catalog:[()=>service.getCatalog(1),()=>service.getCatalog(1)],classOverview:[()=>learning.overview(3),()=>learning.overview(3)]};
   const measure=async run=>{queries=0;returnedRows=0;const start=performance.now(),value=await run(),ms=performance.now()-start;if(value?.generatedAt)delete value.generatedAt;return {ms,queries,returnedRows,hash:c.hash(value)};};
   const summarize=raw=>{const sorted=raw.map(s=>s.ms).sort((a,b)=>a-b);return {medianMs:(sorted[9]+sorted[10])/2,p95Ms:sorted[18],queries:raw[0].queries,returnedRows:raw[0].returnedRows,outputHash:raw[0].hash,raw};};
   for(const [key,runs]of Object.entries(cases)){
    for(const run of runs)await run();const samples=[[],[]];for(let i=0;i<20;i++)for(const side of i%2?[1,0]:[0,1])samples[side].push(await measure(runs[side]));
    const before=summarize(samples[0]),after=summarize(samples[1]);assert.ok([...samples[0],...samples[1]].every(s=>s.hash===before.outputHash));
    if(key.startsWith('lesson')){assert.equal(before.queries,5);assert.equal(after.queries,3);assert.ok(after.returnedRows<before.returnedRows);}else assert.equal(before.queries,after.queries);
    report.cases[key]={before,after};
   }
   assert.deepEqual(await inventory(),baseline);t.diagnostic('G5C_MEASUREMENT '+JSON.stringify(report));
  });
 }finally{await db.query(`DROP DATABASE \`${name}\``);await db.end();}
});
