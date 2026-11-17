const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const a=require('../src/features/curriculum/services/curriculumImport.service');
const b=require('../src/features/curriculum/services/curriculumG3bImport.service');
const {buildA,buildB,seal}=require('./fixtures/g3-import-bundles');
const cli=path.resolve(__dirname,'../src/scripts/curriculum-import.cjs');
function stateFor(bundle){return {lessons:bundle.lessons.map((l,i)=>({...l,lesson_id:i+1,is_active:1})),activities:bundle.activities.map((act,i)=>({...act,activity_id:i+1,lesson_id:bundle.lessons.findIndex(l=>l.lesson_code===act.lesson_code)+1,is_active:1})),items:[],assets:[],versions:[]};}

test('import bundles reject duplicate lessons, wrong ownership/game/source, publishing and media not in their asset refs',()=>{
 for(const edit of [p=>p.lessons[1].lesson_code=p.lessons[0].lesson_code,p=>p.activities[0].lesson_code='L1.BT.02',p=>p.activities[0].game_type='ChoiceQuizGame',p=>p.activities[0].config.sourcePackage.workbook_sha256='2'.repeat(64),p=>p.lessons[0].content_status='ready',p=>p.activities[0].publication_status='published',p=>p.activities[0].config.tasks[0].prompt.content='/unknown.webp',p=>p.items[0].approval_status='approved']){
  const bundle=buildA();edit(bundle);assert.throws(()=>a.validateBundle(seal(bundle)));
 }
 const corrupt=buildA();corrupt.lessons[0].title='Changed without checksum';assert.throws(()=>a.validateBundle(corrupt),/checksum/);
});
test('G3B requires the exact dependency package and actually imported G3A content',()=>{
 const first=buildA(),next=buildB(),state=stateFor(first);
 assert.throws(()=>b.plan(next,state),/dependency package/);
 const changed=structuredClone(first);changed.lessons[0].title='Other dependency';assert.throws(()=>b.plan(next,state,seal(changed)),/dependency package/);
 assert.throws(()=>b.plan(next,state,first),/not fully present/);
});
test('rollback rejects corrupted reports before acquiring a lock or writing',async()=>{
 const db={query(){throw new Error('DB must not be accessed');}};
 await assert.rejects(()=>a.rollback(db,{phase:'G3A'}),/checksum/);
 await assert.rejects(()=>b.rollback(db,{phase:'G3B'}),/checksum/);
});
test('offline CLI validates and creates a target-bound diff without opening the DB or overwriting files',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vietsign-g3-tooling-'));
 try{
  const bundle=buildA(),state=stateFor(bundle),target={db:'synthetic',server_uuid:'synthetic-server'};
  const body={schema_version:1,target,state,state_hash:a.hash(state)};
  const pack=path.join(folder,'package.json'),snapshot=path.join(folder,'state.json'),out=path.join(folder,'diff.json');
  fs.writeFileSync(pack,JSON.stringify(bundle));fs.writeFileSync(snapshot,JSON.stringify({...body,snapshot_hash:a.hash(body)}));
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,CURRICULUM_IMPORT_DB_URL:'mysql://invalid:invalid@127.0.0.1:1/never_connect'}});
  let result=run('validate','--package',pack);assert.equal(result.status,0,result.stderr);
  result=run('plan','--package',pack,'--state',snapshot,'--out',out);assert.equal(result.status,0,result.stderr);
  const diff=JSON.parse(fs.readFileSync(out,'utf8'));assert.deepEqual(diff.target,target);assert.equal(diff.plan.summary.versionsInserted,33);assert.equal(diff.plan.summary.published,0);
  const original=fs.readFileSync(out);result=run('plan','--package',pack,'--state',snapshot,'--out',out);assert.notEqual(result.status,0);assert.deepEqual(fs.readFileSync(out),original);
  result=run('apply','--package',pack);assert.notEqual(result.status,0);assert.match(result.stderr,/Unsupported command/);
  body.target.db='wrong';fs.writeFileSync(snapshot,JSON.stringify({...body,snapshot_hash:'bad'}));result=run('plan','--package',pack,'--state',snapshot,'--out',path.join(folder,'other.json'));assert.notEqual(result.status,0);assert.match(result.stderr,/snapshot checksum/);
 }finally{assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('vietsign-g3-tooling-'));fs.rmSync(folder,{recursive:true,force:true});}
});
