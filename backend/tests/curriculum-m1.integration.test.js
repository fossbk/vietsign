const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mysql=require('mysql2/promise');
const testUrl=process.env.CURRICULUM_TEST_DB_URL;

test('M1: isolated MySQL migration, scoring, concurrency, access and compatibility', {skip:!testUrl}, async t=>{
 const url=new URL(testUrl);
 assert.equal(url.pathname,'/curriculum_g1_test','Only the disposable G1 test database is allowed');
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password,multipleStatements:true});
 const fixtureDb=`curriculum_g1_test_${require('node:crypto').randomBytes(6).toString('hex')}`;
 await admin.query(`CREATE DATABASE \`${fixtureDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
 await admin.end();
 url.pathname=`/${fixtureDb}`;
 const db=mysql.createPool({uri:url.toString(),connectionLimit:8,multipleStatements:true,charset:'utf8mb4'});
 const dbPath=require.resolve('../src/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 const svc=require('../src/features/curriculum/services/curriculum.services');
 const attempt=svc.attempts;
 const content=require('../src/features/curriculum/services/curriculumContent.service');
 const access=require('../src/features/curriculum/services/curriculumAccess.service');
 try {
  const [existing]=await db.query('SHOW TABLES');assert.equal(existing.length,0,'Use an empty disposable database');
  await db.query(`CREATE TABLE user(user_id BIGINT PRIMARY KEY,code VARCHAR(30),is_deleted TINYINT DEFAULT 0);
   INSERT INTO user VALUES(1,'STUDENT',0),(2,'STUDENT',0),(3,'TEACHER',0),(4,'TEACHER',0),(5,'ADMIN',0);
   CREATE TABLE class_room(class_room_id BIGINT PRIMARY KEY,is_active TINYINT);
   CREATE TABLE class_student(class_room_id BIGINT,user_id BIGINT,status VARCHAR(20));
   CREATE TABLE class_teacher(class_room_id BIGINT,user_id BIGINT);
   INSERT INTO class_room VALUES(1,1),(2,1);INSERT INTO class_student VALUES(1,1,'ACTIVE'),(2,2,'ACTIVE');
   INSERT INTO class_teacher VALUES(1,3),(2,4);`);
  const migration=f=>fs.readFileSync(path.resolve(__dirname,'../../database/migrations',f),'utf8');
  await db.query(migration('20260918_add_curriculum_activities_and_games.sql'));
  await db.query(migration('20261011_add_curriculum_video_ai_queue.sql'));
  await db.query("INSERT INTO curriculum_lesson(lesson_id,lesson_code,level_code,topic_code,title,content_status) VALUES(1,'L1.BT.01','L1','BT','G1 fixture','ready')");
  await db.query("INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,game_config) VALUES(1,1,'L1.BT.01.T01','ChoiceQuizGame','Quiz',?)",[JSON.stringify({questions:[{id:1,promptType:'text',promptContent:'ca',options:[{id:1,text:'ca',isCorrect:true},{id:2,text:'cà',isCorrect:false}]}]})]);
  await db.query("INSERT INTO curriculum_game_progress(activity_id,user_id,game_type,score,stars,is_completed) VALUES(1,1,'ChoiceQuizGame',100,3,1)");
  await db.query(migration('20261109_curriculum_m1.sql'));
  await t.test('migration preserves legacy row, marks it unverified',async()=>{
   const [[r]]=await db.query('SELECT * FROM curriculum_game_progress WHERE progress_id=1');assert.equal(r.result_source,'legacy_unverified');assert.equal(Number(r.score),100);assert.equal(r.attempt_id,null);
   const p=await svc.getUserProgressByLesson(1,'L1.BT.01');assert.equal(p[0].best_score,null);
  });
  await t.test('draft cannot be entered by student, teacher preview is not completion',async()=>{
   await assert.rejects(()=>svc.getActivityByCode('L1.BT.01.T01',1),e=>e.status===403);
   await assert.rejects(()=>attempt.start(1,1,{requestId:'draft'}),e=>e.status===403);
   const a=await attempt.start(3,1,{requestId:'preview'});assert.equal(a.isPreview,true);
   const q=a.config.tasks[0];assert.equal('correct' in q,false);assert.ok(q.options.every(o=>!('isCorrect' in o)));
   await attempt.answer(3,a.attemptId,{eventId:'answer',taskId:q.id,choiceIds:[q.options.find(o=>o.presentation.content==='ca').id]});
   const r=await attempt.submit(3,a.attemptId,{idempotencyKey:'preview_submit'});assert.equal(r.isCompleted,0);assert.equal(r.resultSource,'preview');
  });
  const config={runtime_version:1,game_type:'ChoiceQuizGame',source_refs:[{sheet:'fixture',cell:'D1'}],asset_ids:[1],
   policy:{completion:'score',pass_score:100,star_thresholds:[50,80,100],max_retries:0,ai_enabled:false},
   tasks:[{id:'q1',kind:'choice',prompt:{type:'image',content:'/fixture/ca.webp'},options:[{id:'a',presentation:{type:'text',content:'ca'}},{id:'b',presentation:{type:'text',content:'cà'}}],correct:['a']}]};
  await db.query("INSERT INTO curriculum_content_item VALUES('ca','word','ca',NULL,JSON_ARRAY(),'approved')");
  await db.query("INSERT INTO curriculum_asset(asset_id,item_id,role,provider,playable_url,verification_status,source_refs) VALUES(1,'ca','illustration','local','/fixture/ca.webp','verified',JSON_ARRAY())");
  await db.query("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(1,2,?,'published',?)",[content.hash(config),JSON.stringify(config)]);
  await t.test('concurrent start replays same snapshot; answer IDs/order remain stable',async()=>{
   const [a,b]=await Promise.all([attempt.start(1,1,{requestId:'same'}),attempt.start(1,1,{requestId:'same'})]);assert.equal(a.attemptId,b.attemptId);assert.deepEqual(a.config,b.config);
   assert.notEqual(a.config.tasks[0].options[0].id,'a');
  });
  await t.test('server ignores forged score; same event replay safe; changed payload conflicts',async()=>{
   const a=await attempt.start(1,1,{requestId:'wrong'});const q=a.config.tasks[0];const wrong=q.options.find(o=>o.presentation.content==='cà').id;
   const event={eventId:'e1',taskId:q.id,choiceIds:[wrong],score:100,isCompleted:true};
   const [r1,r2]=await Promise.all([attempt.answer(1,a.attemptId,event),attempt.answer(1,a.attemptId,event)]);assert.deepEqual(r1,r2);assert.equal(r1.correct,false);
   await assert.rejects(()=>attempt.answer(1,a.attemptId,{...event,choiceIds:[q.options.find(o=>o.id!==wrong).id]}),e=>e.status===409);
   await assert.rejects(()=>attempt.answer(2,a.attemptId,event),e=>e.status===403);
   const r=await attempt.submit(1,a.attemptId,{idempotencyKey:'end',score:100,stars:3,isCompleted:true});assert.equal(r.score,0);assert.equal(r.isCompleted,0);
  });
  await t.test('concurrent finalize produces one history row/summary; different key conflicts',async()=>{
   const a=await attempt.start(1,1,{requestId:'correct'});const q=a.config.tasks[0];
   await assert.rejects(()=>attempt.submit(1,a.attemptId,{idempotencyKey:'end'}),e=>e.status===409);
   await assert.rejects(()=>attempt.answer(1,a.attemptId,{eventId:'bad',taskId:q.id,choiceIds:['foreign_option']}),e=>e.status===400);
   await attempt.answer(1,a.attemptId,{eventId:'correct',taskId:q.id,choiceIds:[q.options.find(o=>o.presentation.content==='ca').id]});
   const [a1,a2]=await Promise.all([attempt.submit(1,a.attemptId,{idempotencyKey:'end'}),attempt.submit(1,a.attemptId,{idempotencyKey:'end'})]);
   assert.deepEqual(a1,a2);assert.equal(a1.score,100);assert.equal(a1.stars,3);assert.equal(a1.isCompleted,1);
   const [[count]]=await db.query('SELECT COUNT(*) n FROM curriculum_game_progress WHERE attempt_id=?',[a.attemptId]);assert.equal(count.n,1);
   await assert.rejects(()=>attempt.submit(1,a.attemptId,{idempotencyKey:'different'}),e=>e.status===409);
   const restored=await attempt.get(1,a.attemptId);assert.deepEqual(restored.result,a1);
   const [[summary]]=await db.query('SELECT * FROM curriculum_user_activity_summary WHERE user_id=1 AND activity_id=1');assert.equal(Number(summary.best_score),100);assert.equal(summary.total_attempts,2);
  });
  await t.test('failure during progress write rolls back finalize and can retry',async()=>{
   const a=await attempt.start(1,1,{requestId:'rollback'});const q=a.config.tasks[0];await attempt.answer(1,a.attemptId,{eventId:'a',taskId:q.id,choiceIds:[q.options[0].id]});
   await db.query("CREATE TRIGGER fixture_reject BEFORE INSERT ON curriculum_game_progress FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture failure'");
   await assert.rejects(()=>attempt.submit(1,a.attemptId,{idempotencyKey:'end'}),/fixture failure/);
   assert.equal((await attempt.get(1,a.attemptId)).status,'open');await db.query('DROP TRIGGER fixture_reject');
   await attempt.submit(1,a.attemptId,{idempotencyKey:'end'});
  });
  await t.test('classes scope history, review, status; self-study teacher access denied',async()=>{
   await access.assertStudentAccess(3,1);await access.assertStudentAccess(5,2);await assert.rejects(()=>access.assertStudentAccess(3,2),e=>e.status===403);
   await assert.rejects(()=>access.assertStudentAccess(1,1,{feedback:true}),e=>e.status===403);
   await db.query("UPDATE class_student SET status='LEFT' WHERE user_id=1");await assert.rejects(()=>access.assertStudentAccess(3,1),e=>e.status===403);await db.query("UPDATE class_student SET status='ACTIVE' WHERE user_id=1");
   await assert.rejects(()=>svc.updateFeedback(1,'outside class',4),e=>e.status===403);await svc.updateFeedback(1,'good',3);
  });
  await t.test('read counts stable across accordion, key absent; old submit blocked',async()=>{
   const list=await svc.getLessons({userId:1});const detail=await svc.getLessonByCode('L1.BT.01',1);assert.equal(Number(list[0].total_activities),detail.activities.length);assert.equal(Number(list[0].published_activities),1);assert.equal(detail.activities[0].game_config,undefined);
   assert.equal((await svc.getActivityByCode('L1.BT.01.T01',1)).game_config,null);
   await assert.rejects(()=>svc.submitGameProgress(1,1,{score:100}),e=>e.status===410);
  });
  await t.test('invalid media cannot report readiness; a new content version needs new progress',async()=>{
   await db.query("UPDATE curriculum_asset SET verification_status='unverified' WHERE asset_id=1");
   assert.equal((await svc.getLessons({userId:1}))[0].published_activities,0);
   await assert.rejects(()=>svc.getActivityByCode('L1.BT.01.T01',1),e=>e.status===403);
   await db.query("UPDATE curriculum_asset SET verification_status='verified' WHERE asset_id=1");
   const next=JSON.parse(JSON.stringify(config));next.tasks[0].id='new_question';
   const [v]=await db.query("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(1,3,?,'published',?)",[content.hash(next),JSON.stringify(next)]);
   const progress=await svc.getUserProgressByLesson(1,'L1.BT.01');assert.equal(progress[0].best_score,null);assert.equal(progress[0].is_completed,null);
   await db.query("UPDATE curriculum_activity_version SET publication_status='draft' WHERE version_id=?",[v.insertId]);
  });
  await t.test('recording cannot attach other user/target upload; all targets required',async()=>{
   const cfg={runtime_version:1,game_type:'VideoPracticeRecorder',legacy:true,policy:{completion:'review',pass_score:null,star_thresholds:null,max_retries:null},tasks:[{id:'first',kind:'recording',label:'ca',prompt:{type:'text',content:'ca'}},{id:'second',kind:'recording',label:'cà',prompt:{type:'text',content:'cà'}}]};
   await db.query("INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,game_config) VALUES(2,1,'L1.BT.01.T02','VideoPracticeRecorder','Video',JSON_OBJECT())");
   // Draft fixture with two server targets; do not publish it.
   await db.query("INSERT INTO curriculum_media(activity_id,media_code,media_type,source_url) VALUES(2,'V01','video','/sample.webm'),(2,'V02','video','/sample2.webm')");
   const a=await attempt.start(3,2,{requestId:'record'});const first=a.config.tasks[0],second=a.config.tasks[1];
   await db.query("INSERT INTO curriculum_upload VALUES('fixture-upload',3,?,?,'curriculum-practice/fixture.webm','video/webm',100,NOW())",[a.attemptId,first.id]);
   await assert.rejects(()=>attempt.answer(3,a.attemptId,{eventId:'wrongtarget',taskId:second.id,uploadId:'fixture-upload',targetText:'ca'}),e=>e.status===403);
   const r=await attempt.answer(3,a.attemptId,{eventId:'record',taskId:first.id,uploadId:'fixture-upload'});assert.equal(r.correct,null);
   await assert.rejects(()=>attempt.submit(3,a.attemptId,{idempotencyKey:'end'}),e=>e.status===409);
  });
  await t.test('HTTP roles, video aliases, private storage, tickets and byte ranges', {skip:!process.env.CURRICULUM_TEST_MINIO_PORT}, async()=>{
   Object.assign(process.env,{MINIO_ENDPOINT:'127.0.0.1',MINIO_PORT:process.env.CURRICULUM_TEST_MINIO_PORT,MINIO_ACCESS_KEY:'g1testadmin',MINIO_SECRET_KEY:'g1-fixture-only',MINIO_BUCKET_NAME:`g1-test-${Date.now()}`,MINIO_USE_SSL:'false',JWT_SECRET:'g1-test-jwt-only'});
   const express=require('express');const jwt=require('jsonwebtoken');
   const storage=require('../src/utils/minio');await storage.initMinio();
   const bytes=Buffer.from([0x1a,0x45,0xdf,0xa3,1,2,3,4,5,6,7,8]);
   await storage.minioClient.putObject(storage.bucketName,'sample.webm',bytes,bytes.length,{'Content-Type':'video/webm'});
   await storage.minioClient.putObject(storage.bucketName,'curriculum-practice/legacy.webm',bytes,bytes.length,{'Content-Type':'video/webm'});
   await storage.minioClient.putObject(storage.practiceBucketName,'curriculum-practice/private.webm',bytes,bytes.length,{'Content-Type':'video/webm'});
   const raw=`http://127.0.0.1:${process.env.CURRICULUM_TEST_MINIO_PORT}`;
   assert.equal((await fetch(`${raw}/${storage.bucketName}/sample.webm`)).status,200,'public samples remain public');
   assert.equal((await fetch(`${raw}/${storage.bucketName}/curriculum-practice/legacy.webm`)).status,403,'legacy clips cannot bypass backend via MinIO');
   assert.equal((await fetch(`${raw}/${storage.practiceBucketName}/curriculum-practice/private.webm`)).status,403);
   await storage.minioClient.statObject(storage.bucketName,'curriculum-practice/legacy.webm');
   const video=require('../src/features/curriculum/services/curriculumVideo.service');
   const app=express();app.use(express.json());app.use('/curriculum',require('../src/features/curriculum/routes/curriculum.routes'));
   for(const prefix of ['/uploads','/upload/test-bucket','/test-bucket'])app.get(new RegExp(`^${prefix}/(.+)`),async(req,res)=>{try{await video.guardLegacy(req,res,req.params[0]);if(!res.headersSent)await video.stream(req,res,req.params[0]);}catch(e){if(!res.headersSent)res.status(e.status||500).end();}});
   const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
   const base=`http://127.0.0.1:${server.address().port}`;
   const token=id=>jwt.sign({user_id:id},process.env.JWT_SECRET,{expiresIn:'5m'});
   const request=(p,id,options={})=>fetch(`${base}${p}`,{...options,headers:{...(id?{Authorization:`Bearer ${token(id)}`}:{ }),'Content-Type':'application/json',...options.headers}});
   try{
    assert.equal((await request('/curriculum/lessons')).status,401);
    assert.equal((await request('/curriculum/users/2/progress?lessonCode=L1.BT.01',3)).status,403);
    assert.equal((await request('/curriculum/users/1/progress?lessonCode=L1.BT.01',3)).status,200);
    await db.execute("UPDATE curriculum_game_progress SET submission_video_url='/uploads/curriculum-practice/legacy.webm' WHERE progress_id=1");
    for(const prefix of ['/uploads','/upload/test-bucket','/test-bucket']){
     assert.equal((await request(`${prefix}/curriculum-practice/legacy.webm`)).status,401);
     assert.equal((await request(`${prefix}/curriculum-practice/legacy.webm`,4)).status,403);
     assert.equal((await request(`${prefix}/curriculum-practice/legacy.webm`,3)).status,200);
    }
    assert.equal((await request('/curriculum/submissions/1/video-ticket',4)).status,403);
    const tickets=await (await request('/curriculum/submissions/1/video-ticket',3)).json();const url=tickets.data[0].url;
    const range=await request(url,null,{headers:{Range:'bytes=2-5'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 2-5/12');assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(2,6));
    assert.equal((await request(url,null,{headers:{Range:'bytes=99-100'}})).status,416);
    assert.equal((await request('/curriculum/submissions/1/video?ticket=bad')).status,401);
    const expired=jwt.sign({purpose:'curriculum-video',user_id:3,submissionId:'1',uploadId:'legacy'},process.env.JWT_SECRET,{expiresIn:-1});assert.equal((await request(`/curriculum/submissions/1/video?ticket=${expired}`)).status,401);
    await db.execute('DELETE FROM class_teacher WHERE user_id=3');assert.equal((await request(url)).status,403);await db.execute('INSERT INTO class_teacher VALUES(1,3)');
    const a=await attempt.start(3,2,{requestId:'http_upload'});const task=a.config.tasks[0];const uploadUrl=`${base}/curriculum/attempts/${a.attemptId}/tasks/${task.id}/uploads`;
    const form=new FormData();form.append('file',new Blob([bytes],{type:'video/webm'}),'practice.webm');
    assert.equal((await fetch(uploadUrl,{method:'POST',headers:{Authorization:`Bearer ${token(4)}`},body:form})).status,403);
    const uploaded=await (await fetch(uploadUrl,{method:'POST',headers:{Authorization:`Bearer ${token(3)}`},body:form})).json();assert.ok(uploaded.data.uploadId);
    const [[stored]]=await db.execute('SELECT * FROM curriculum_upload WHERE upload_id=?',[uploaded.data.uploadId]);assert.equal(stored.user_id,3);assert.equal(stored.task_id,task.id);
   }finally{await new Promise(resolve=>server.close(resolve));}
  });
 }finally{await db.query(`DROP DATABASE \`${fixtureDb}\``);await db.end();}
});
