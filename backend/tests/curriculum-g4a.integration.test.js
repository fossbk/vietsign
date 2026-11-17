const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');const mysql=require('mysql2/promise');
test('G4A: durable per-item recordings, replacement history, ownership and disabled AI',{skip:!process.env.CURRICULUM_TEST_DB_URL||!process.env.CURRICULUM_TEST_MINIO_PORT},async t=>{
 const url=new URL(process.env.CURRICULUM_TEST_DB_URL);assert.equal(url.pathname,'/curriculum_g1_test');assert.ok(['127.0.0.1','localhost'].includes(url.hostname));const suffix=randomBytes(6).toString('hex'),name=`curriculum_g4a_test_${suffix}`;
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password});await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);await admin.end();url.pathname=`/${name}`;
 const db=mysql.createPool({uri:url.toString(),multipleStatements:true,connectionLimit:5,charset:'utf8mb4'}),dbPath=require.resolve('../src/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 Object.assign(process.env,{MINIO_ENDPOINT:'127.0.0.1',MINIO_PORT:process.env.CURRICULUM_TEST_MINIO_PORT,MINIO_ACCESS_KEY:'g1testadmin',MINIO_SECRET_KEY:'g1-fixture-only',MINIO_BUCKET_NAME:`g4a-test-${suffix}`,MINIO_USE_SSL:'false',JWT_SECRET:'g4a-test-jwt-only',CURRICULUM_AI_WORKER_ENABLED:'false'});
 const storage=require('../src/utils/minio'),attempts=require('../src/features/curriculum/services/curriculumAttempt.service'),c=require('../src/features/curriculum/services/curriculumContent.service');let server;
 const bytes=Buffer.from([0x1a,0x45,0xdf,0xa3,1,2,3,4,5,6,7,8]);let base,a,first,oldUpload,oldAnswer;
 const token=id=>require('jsonwebtoken').sign({user_id:id},process.env.JWT_SECRET,{expiresIn:'5m'});
 const json=async(p,id=3,body)=>{const r=await fetch(base+'/curriculum'+p,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token(id)}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 const upload=async(attempt,task,id=3,uploadId=randomUUID(),content=bytes)=>{const form=new FormData();form.append('file',new Blob([content],{type:'video/webm'}),'practice.webm');form.append('uploadRequestId',uploadId);const r=await fetch(`${base}/curriculum/attempts/${attempt}/tasks/${encodeURIComponent(task)}/uploads`,{method:'POST',headers:{Authorization:`Bearer ${token(id)}`},body:form});return {status:r.status,body:await r.json()};};
 const answer=(attempt,task,uploadId,extra={})=>attempts.answer(3,attempt,{eventId:randomUUID(),taskId:task,uploadId,...extra});
 try{
  await db.query("CREATE TABLE user(user_id BIGINT PRIMARY KEY,code VARCHAR(30),is_deleted TINYINT DEFAULT 0);INSERT INTO user VALUES(1,'STUDENT',0),(2,'STUDENT',0),(3,'TEACHER',0),(4,'TEACHER',0)");
  for(const file of ['20260918_add_curriculum_activities_and_games.sql','20261011_add_curriculum_video_ai_queue.sql','20261109_curriculum_m1.sql'])await db.query(fs.readFileSync(path.resolve(__dirname,'../../database/migrations',file),'utf8'));
  const sources=require('./fixtures/g4-recording-sources');assert.equal(sources.length,10);
  for(const [index,s]of sources.entries()){await db.execute("INSERT INTO curriculum_lesson(lesson_id,lesson_code,level_code,topic_code,title,content_status) VALUES(?,?,'L1','BT','G4A draft','drafting')",[index+1,s.lesson_code]);await db.execute("INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,game_config) VALUES(?,?,?,'VideoPracticeRecorder',?,JSON_OBJECT())",[index+1,index+1,s.activity_code,s.title]);await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,1,?,'draft',?)",[index+1,c.hash(s.config),JSON.stringify(s.config)]);}
  await storage.initMinio();const express=require('express'),app=express();app.use(express.json());app.use('/curriculum',require('../src/features/curriculum/routes/curriculum.routes'));server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;
  const [initialVersions]=await db.query('SELECT * FROM curriculum_activity_version ORDER BY version_id');const versionHash=c.hash(initialVersions);
  await t.test('all ten synthetic draft activities expose exact targets without altering versions',async()=>{
   for(let i=0;i<10;i++){const x=await attempts.start(3,i+1,{requestId:`real-draft-${i}`});assert.equal(x.recording.required,sources[i].config.tasks.length);assert.equal(x.recording.submitted,0);assert.equal(x.recording.aiStatus,'not_requested');assert.ok(x.isPreview);assert.equal(x.versionId,initialVersions[i].version_id);await assert.rejects(()=>attempts.start(1,i+1,{requestId:`denied-${i}`}),e=>e.status===403);if(i===0)a=x;}
   first=a.config.tasks[0];
  });
  await t.test('concurrent/retried upload creates one object; changed bytes, target and user fail',async()=>{
   const id=randomUUID(),results=await Promise.all([upload(a.attemptId,first.id,3,id),upload(a.attemptId,first.id,3,id)]);assert.ok(results.every(r=>r.status===201),JSON.stringify(results));oldUpload=id;const [[count]]=await db.execute('SELECT COUNT(*) n FROM curriculum_upload WHERE upload_id=?',[id]);assert.equal(count.n,1);
   assert.equal((await upload(a.attemptId,first.id,3,id,Buffer.concat([bytes.subarray(0,11),Buffer.from([9])]))).status,409);assert.equal((await upload(a.attemptId,a.config.tasks[1].id,3,id)).status,409);assert.equal((await upload(a.attemptId,first.id,4,id)).status,403);
  });
  await t.test('one clip cannot complete activity; replacement is explicit and append-only',async()=>{
   const event={eventId:randomUUID(),taskId:first.id,uploadId:oldUpload};const [r1,r2]=await Promise.all([attempts.answer(3,a.attemptId,event),attempts.answer(3,a.attemptId,event)]);assert.deepEqual(r1,r2);assert.equal(r1.revision,1);
   const [[row]]=await db.execute('SELECT * FROM curriculum_attempt_answer WHERE attempt_id=?',[a.attemptId]);oldAnswer=row;
   await assert.rejects(()=>attempts.submit(3,a.attemptId,{idempotencyKey:'partial'}),e=>e.status===409);
   const next=await upload(a.attemptId,first.id);assert.equal(next.status,201);const id=next.body.data.uploadId;
   await assert.rejects(()=>answer(a.attemptId,first.id,id),e=>e.status===409);const r=await answer(a.attemptId,first.id,id,{replacesUploadId:oldUpload});assert.equal(r.revision,2);assert.equal(r.correct,null);assert.equal(r.replacesUploadId,oldUpload);
   await assert.rejects(()=>answer(a.attemptId,first.id,oldUpload,{replacesUploadId:id}),e=>e.status===409);
   const restored=await attempts.get(3,a.attemptId);assert.equal(restored.recording.submitted,1);assert.equal(restored.recording.items.find(i=>i.taskId===first.id).history.length,2);
   const [[preserved]]=await db.execute('SELECT * FROM curriculum_attempt_answer WHERE answer_id=?',[oldAnswer.answer_id]);assert.deepEqual(preserved,oldAnswer);
  });
  await t.test('SQL upload failure removes orphan object; failed answer can retry same upload',async()=>{
   const id=randomUUID();await db.query("CREATE TRIGGER reject_g4a_upload BEFORE INSERT ON curriculum_upload FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='upload fixture failure'");assert.equal((await upload(a.attemptId,a.config.tasks[1].id,3,id)).status,500);await db.query('DROP TRIGGER reject_g4a_upload');await assert.rejects(()=>storage.minioClient.statObject(storage.practiceBucketName,`curriculum-practice/${id}.webm`));
   const u=await upload(a.attemptId,a.config.tasks[1].id);await db.query("CREATE TRIGGER reject_g4a_answer BEFORE INSERT ON curriculum_attempt_answer FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='answer fixture failure'");await assert.rejects(()=>answer(a.attemptId,a.config.tasks[1].id,u.body.data.uploadId),/fixture failure/);await db.query('DROP TRIGGER reject_g4a_answer');assert.equal((await answer(a.attemptId,a.config.tasks[1].id,u.body.data.uploadId)).revision,1);
  });
  await t.test('owner can replay old/current clip with range; foreign user and anonymous storage cannot',async()=>{
   assert.equal((await json(`/attempts/${a.attemptId}/uploads/${oldUpload}/video-ticket`,4)).status,403);const result=await json(`/attempts/${a.attemptId}/uploads/${oldUpload}/video-ticket`);assert.equal(result.status,200);assert.ok(!JSON.stringify(result).includes('object_key'));
   const r=await fetch(base+result.body.data.url,{headers:{Range:'bytes=2-5'}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(2,6));assert.equal((await fetch(`${base}/curriculum/recording-uploads/${oldUpload}/video`)).status,401);
   assert.equal((await fetch(`http://127.0.0.1:${process.env.CURRICULUM_TEST_MINIO_PORT}/${storage.practiceBucketName}/curriculum-practice/${oldUpload}.webm`)).status,403);
  });
  await t.test('all required targets across B1–B10 finalize once as preview/pending, without AI or official summary',async()=>{
   for(let i=0;i<10;i++){let x=await attempts.start(3,i+1,{requestId:`real-draft-${i}`});for(const item of x.recording.items.filter(item=>!item.uploadId)){const u=await upload(x.attemptId,item.taskId);assert.equal(u.status,201);await answer(x.attemptId,item.taskId,u.body.data.uploadId);}x=await attempts.get(3,x.attemptId);assert.equal(x.recording.missingTaskIds.length,0);
    const [one,two]=await Promise.all([attempts.submit(3,x.attemptId,{idempotencyKey:'final'}),attempts.submit(3,x.attemptId,{idempotencyKey:'final'})]);assert.deepEqual(one,two);assert.equal(one.score,0);assert.equal(one.stars,0);assert.equal(one.isCompleted,0);assert.equal(one.resultSource,'preview');assert.equal(one.aiStatus,'not_requested');assert.equal(one.recording.status,'pending_review');assert.equal((await attempts.get(3,x.attemptId)).recording.items.every(item=>item.status==='pending_review'),true);
   }
   const [[jobs]]=await db.query('SELECT COUNT(*) n FROM curriculum_ai_job');assert.equal(jobs.n,0);const [[summaries]]=await db.query('SELECT COUNT(*) n FROM curriculum_user_activity_summary');assert.equal(summaries.n,0);const [versions]=await db.query('SELECT * FROM curriculum_activity_version ORDER BY version_id');assert.equal(c.hash(versions),versionHash);
  });
  await t.test('finalized attempt blocks new clips/replacements but replays acknowledged operations',async()=>{
   assert.equal((await upload(a.attemptId,first.id)).status,409);assert.equal((await upload(a.attemptId,first.id,3,oldUpload)).status,201);assert.deepEqual(await attempts.answer(3,a.attemptId,{eventId:oldAnswer.event_id,...c.parse(oldAnswer.payload)}),c.parse(oldAnswer.response));await assert.rejects(()=>answer(a.attemptId,first.id,oldUpload),e=>e.status===409);
   const tickets=await json(`/submissions/${(await attempts.get(3,a.attemptId)).result.progressId}/video-ticket`);assert.equal(tickets.status,200);assert.equal(tickets.body.data.length,a.config.tasks.length);assert.equal(tickets.body.data.some(t=>t.uploadId===oldUpload),false);
  });
 }finally{if(server)await new Promise(r=>server.close(r));const [uploads]=await db.query('SELECT object_key FROM curriculum_upload').catch(()=>[[]]);for(const u of uploads)await storage.minioClient.removeObject(storage.practiceBucketName,u.object_key).catch(()=>{});await db.query(`DROP DATABASE \`${name}\``);await db.end();}
});
