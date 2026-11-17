// Synthetic packages only. The caller must supply a disposable test database.
const fs=require('node:fs'),path=require('node:path');
async function seed(db){
 const [[database]]=await db.query('SELECT DATABASE() name');
 if(!/^curriculum_g5b_(test|browser)_[a-f0-9]+$/.test(database.name))throw Error('Disposable G5B database required');
 await db.query("CREATE TABLE user(user_id BIGINT PRIMARY KEY,code VARCHAR(30),name VARCHAR(255),is_deleted TINYINT DEFAULT 0);INSERT INTO user VALUES(1,'ADMIN','Editor Admin',0),(2,'TEACHER','Teacher',0),(3,'STUDENT','Student',0),(4,'ADMIN','Second Admin',0);CREATE TABLE class_room(class_room_id BIGINT PRIMARY KEY,content VARCHAR(100),is_active TINYINT);INSERT INTO class_room VALUES(1,'Fixture class',1);CREATE TABLE class_teacher(class_room_id BIGINT,user_id BIGINT,PRIMARY KEY(class_room_id,user_id));INSERT INTO class_teacher VALUES(1,2);CREATE TABLE class_student(class_room_id BIGINT,user_id BIGINT,status VARCHAR(20),PRIMARY KEY(class_room_id,user_id));INSERT INTO class_student VALUES(1,3,'ACTIVE')");
 const migrate=file=>db.query(fs.readFileSync(path.resolve(__dirname,'../../../database/migrations',file),'utf8'));
 for(const file of ['20260918_add_curriculum_activities_and_games.sql','20261011_add_curriculum_video_ai_queue.sql','20261109_curriculum_m1.sql'])await migrate(file);
 const {buildA,buildB}=require('../fixtures/g3-import-bundles'),a=buildA(),b=buildB(),bundle=require('../fixtures/g4c-group-bundle').build(),first=require('../../src/features/curriculum/services/curriculumImport.service'),second=require('../../src/features/curriculum/services/curriculumG3bImport.service'),group=require('../../src/features/curriculum/services/curriculumGroupImport.service'),c=require('../../src/features/curriculum/services/curriculumContent.service');
 for(const [i,l]of a.lessons.entries())await db.execute("INSERT INTO curriculum_lesson(lesson_id,lesson_code,level_code,topic_code,title,content_status) VALUES(?,?,'L1','BT','Original fixture','drafting')",[i+1,l.lesson_code]);
 for(const [i,act]of a.activities.entries()){
  await db.execute('INSERT INTO curriculum_activity(activity_id,lesson_id,activity_code,game_type,title,game_config) VALUES(?,?,?,?,?,JSON_OBJECT())',[i+1,Number(act.lesson_code.slice(-2)),act.activity_code,act.game_type,act.title]);
  if(i<12){const config=structuredClone(act.config);delete config.sourcePackage;config.asset_ids=[];config.tasks[0].prompt={type:'text',content:'Legacy fixture'};config.title='Legacy fixture';await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,1,?,'draft',?)",[i+1,c.hash(config),JSON.stringify(config)]);}
 }
 const conn=await db.getConnection();try{
  await first.apply(conn,a,first.plan(a,await first.readState(conn)));
  await second.apply(conn,b,second.plan(b,await second.readState(conn),a),a);
  for(const file of ['20261109_curriculum_m2.sql','20261109_curriculum_m3.sql'])await migrate(file);
  await group.apply(conn,bundle,group.plan(bundle,await second.readState(conn),await group.groupState(conn)));
  // Preserve imported versions; add a technical recording snapshot for each lesson.
  for(const act of require('../fixtures/g4-recording-sources')){
   const [[row]]=await db.execute('SELECT a.activity_id,MAX(v.version_number)+1 n FROM curriculum_activity a JOIN curriculum_activity_version v ON a.activity_id=v.activity_id WHERE a.activity_code=? GROUP BY a.activity_id',[act.activity_code]);
   await db.execute("UPDATE curriculum_activity SET game_type='VideoPracticeRecorder' WHERE activity_id=?",[row.activity_id]);
   await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,?,?,'draft',?)",[row.activity_id,row.n,c.hash(act.config),JSON.stringify(act.config)]);
  }
  await migrate('20261109_curriculum_m4.sql');
 }finally{conn.release();}
 return {migrate};
}
module.exports={seed};
