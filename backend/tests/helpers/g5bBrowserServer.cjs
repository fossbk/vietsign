// Disposable service for browser tests. Never loads application .env or connects to its DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const mysql=require('mysql2/promise'),jwt=require('jsonwebtoken'),express=require('express');
async function main(){
 const url=new URL(process.env.CURRICULUM_TEST_DB_URL);
 assert.equal(url.pathname,'/curriculum_g1_test');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.port,'33129');
 const name='curriculum_g5b_browser_'+randomBytes(6).toString('hex');
 const admin=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:url.username,password:url.password});
 await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);await admin.end();url.pathname='/'+name;
 const db=mysql.createPool({uri:url.toString(),multipleStatements:true,connectionLimit:6,charset:'utf8mb4'}),dbPath=require.resolve('../../src/db');
 require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 Object.assign(process.env,{JWT_SECRET:randomBytes(32).toString('hex'),CURRICULUM_AI_WORKER_ENABLED:'false',MINIO_ENDPOINT:'127.0.0.1',MINIO_PORT:'33130',MINIO_ACCESS_KEY:'fixture-only',MINIO_SECRET_KEY:'fixture-only',MINIO_USE_SSL:'false'});
 let server;
 const clean=async()=>{if(server)await new Promise(resolve=>server.close(resolve));await db.query(`DROP DATABASE \`${name}\``);await db.end();};
 try{
  await require('./curriculumG5bFixture.cjs').seed(db);
  const users=[{id:1,code:'ADMIN',name:'Editor Admin'},{id:2,code:'TEACHER',name:'Teacher'},{id:3,code:'STUDENT',name:'Student'},{id:4,code:'OTHER_ADMIN',name:'Second Admin'}].map(u=>({...u,token:jwt.sign({user_id:u.id,code:u.code==='OTHER_ADMIN'?'ADMIN':u.code},process.env.JWT_SECRET,{expiresIn:'1h'}),profile:{user_id:u.id,id:u.id,name:u.name,code:u.code==='OTHER_ADMIN'?'ADMIN':u.code,email:'synthetic@example.invalid'}}));
  const file=path.resolve(__dirname,'../../../frontend/test-results/g5b-fixture.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({users}));
  const app=express();app.use(express.json({limit:'600kb'}));app.use('/curriculum',require('../../src/features/curriculum/routes/curriculum.routes'));app.get('/fixture-health',(_,res)=>res.json({ready:true}));
  server=app.listen(33132,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(stopping)return;stopping=true;void clean().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});});
  console.log('Synthetic editor backend ready on 33132.');
 }catch(e){await clean();throw e;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
