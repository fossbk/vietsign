// Append-only B6–B10 importer. Every pre-existing content row and history row is protected.
const base = require('./curriculumImport.service');
const content = require('./curriculumContent.service');
const rounds = require('./curriculumRounds.service');
const {hash,readState,historyFingerprint,resolveConfig}=base;
const fail=message=>{throw new Error(message);};
const inScope=code=>/^L1\.BT\.(?:0[6-9]|10)(?:\.T\d\d)?$/.test(code);
const pick=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]??null]));
const lessonFields=['level_code','topic_code','title','description','content_status','display_order'];
const activityFields=['activity_level','game_type','title','instruction','display_order'];
const itemFields=['item_type','label','sense','source_refs','approval_status'];
const assetFields=['item_id','role','provider','lookup_url','playable_url','verification_status','source_refs'];
const keys={lessons:'lesson_id',activities:'activity_id',items:'item_id',assets:'asset_id',versions:'version_id'};
const itemData=i=>({item_type:i.kind,label:i.label,sense:i.sense??null,source_refs:i.source_refs,approval_status:'draft'});
function fingerprints(state,selection){
 return Object.fromEntries(Object.entries(keys).map(([table,key])=>{
  const ids=selection?.[table]?.ids||state[table].map(row=>row[key]),wanted=new Set(ids),rows=state[table].filter(row=>wanted.has(row[key]));
  return [table,{ids,rows:rows.length,sha256:hash(rows)}];
 }));
}
function validateBundle(bundle){
 base.validateCommon(bundle,'G3B');
 const {package_hash,...body}=bundle;if(hash(body)!==package_hash)fail('Package checksum mismatch');
 if(bundle.phase!=='G3B'||bundle.publication_status!=='draft'||bundle.lessons.length!==5||bundle.activities.length!==35)fail('Only the G3B B6–B10 draft package is allowed');
 const expectedLessons=Array.from({length:5},(_,i)=>`L1.BT.${String(i+6).padStart(2,'0')}`),expected=expectedLessons.flatMap(l=>Array.from({length:7},(_,i)=>`${l}.T0${i+1}`));
 if(hash(bundle.lessons.map(l=>l.lesson_code).sort())!==hash(expectedLessons)||hash(bundle.activities.map(a=>a.activity_code).sort())!==hash(expected.sort()))fail('G3B scope differs from the 5 lessons / 35 source activities');
 if(bundle.depends_on?.phase!=='G3A'||!/^[a-f0-9]{64}$/.test(bundle.depends_on.package_hash))fail('Missing G3A dependency fingerprint');
 const items=new Set(bundle.items.map(i=>i.item_id)),assets=new Set(bundle.assets.map(a=>a.asset_id));if(items.size!==bundle.items.length||assets.size!==bundle.assets.length)fail('Duplicate source item/asset IDs');
 for(const item of bundle.items)if(item.reuse_from&&!(item.reuse_from==='G3A'&&item.kind==='activity_icon'&&item.item_id.startsWith('G3A-ICON-')))fail('Only the existing G3A icons may be reused by this package');
 for(const asset of bundle.assets){
  if(!items.has(asset.item_id))fail('Asset references an unknown item');
  const reused=asset.reuse_from==='G3A'&&asset.role==='activity_icon'&&asset.item_id.startsWith('G3A-ICON-');
  if(asset.reuse_from&&!reused)fail('Only G3A icon assets may be reused');
  if(asset.playable_url&&!(reused?/^\/curriculum-media\/g3a\/[a-f0-9]{20}\.webp$/:/^\/curriculum-media\/g3b\/[a-f0-9]{20}\.webp$/).test(asset.playable_url))fail('Only supplied pictures may be playable in G3B');
  if(asset.source_refs.some(ref=>ref.path&&(!reused&&!ref.path.startsWith('HÌNH ẢNH MINH HỌA/LỚP 1/BÀI 6/'))))fail('New G3B images must come from the supplied B6 directory');
 }
 for(const activity of bundle.activities){
  if(!inScope(activity.lesson_code)||!activity.activity_code.startsWith(activity.lesson_code+'.T')||activity.publication_status!=='draft'||activity.config.sourcePackage?.phase!=='G3B'||activity.config.fixture_only||activity.config.example_only||activity.config.policy.status!=='requires_D05'||!activity.config.blocked_by_decisions.includes('D03'))fail('Invalid G3B draft provenance');
  if(activity.config.asset_ids.some(id=>!assets.has(id)))fail('Unknown activity asset');
  if(rounds.presentations(activity.config).some(p=>p.technicalSample||/technical-sample|curriculum-g2-fixtures/.test(p.content||'')))fail('G2 fixtures must not become G3B content');
  rounds.validate(activity.config);
 }
 return bundle;
}
function findAsset(state,desired){
 const rows=state.assets.filter(a=>a.item_id===desired.item_id&&a.role===desired.role&&a.provider===desired.provider&&(a.lookup_url??null)===(desired.lookup_url??null)&&(a.playable_url??null)===(desired.playable_url??null));
 if(rows.length>1)fail(`Ambiguous existing asset ${desired.asset_id}`);
 if(rows[0]&&hash(pick(rows[0],assetFields))!==hash(pick(desired,assetFields)))fail(`Existing asset differs: ${desired.asset_id}`);
 if(desired.reuse_from&&!rows[0])fail(`Missing G3A asset dependency ${desired.asset_id}`);return rows[0];
}
function plan(bundle,state,dependency){
 if(!dependency||dependency.phase!=='G3A'||dependency.package_hash!==bundle.depends_on?.package_hash)fail('Exact G3A dependency package required');
 const dependencyPlan=base.plan(dependency,state);
 if(dependencyPlan.summary.versionsReused!==33||dependencyPlan.summary.lessonsUpdated||dependencyPlan.summary.activitiesUpdated||dependencyPlan.summary.itemsInserted||dependencyPlan.summary.assetsInserted)fail('G3A dependency is not fully present and unchanged in this DB');
 validateBundle(bundle);const lessons=[],activities=[],items=[],assets=[],versions=[],assetIds=new Map();
 for(const desired of bundle.lessons){
  const rows=state.lessons.filter(l=>l.lesson_code===desired.lesson_code);if(rows.length>1)fail('Duplicate lesson code');const old=rows[0];
  if(old&&(!old.is_active||hash(pick(old,lessonFields))!==hash(pick(desired,lessonFields))))fail(`Existing lesson differs; refusing overwrite: ${desired.lesson_code}`);
  lessons.push({code:desired.lesson_code,id:old?.lesson_id??null,action:old?'reuse':'insert',after:pick(desired,lessonFields)});
 }
 for(const desired of bundle.items){
  const old=state.items.find(i=>i.item_id===desired.item_id),data=itemData(desired);
  if(old){const actual=pick(old,itemFields);if(old.approval_status==='approved')actual.approval_status='draft';if(hash(actual)!==hash(data))fail(`Existing item differs; refusing overwrite: ${desired.item_id}`);}
  if(desired.reuse_from&&!old)fail(`Missing G3A item dependency ${desired.item_id}`);
  items.push({id:desired.item_id,action:old?'reuse':'insert'});
 }
 for(const desired of bundle.assets){const old=findAsset(state,desired);assetIds.set(desired.asset_id,old?.asset_id??`new:${desired.asset_id}`);assets.push({key:desired.asset_id,id:old?.asset_id??null,action:old?'reuse':'insert',item_id:desired.item_id,role:desired.role,url:desired.playable_url||desired.lookup_url,verification_status:desired.verification_status});}
 for(const desired of bundle.activities){
  const rows=state.activities.filter(a=>a.activity_code===desired.activity_code);if(rows.length>1)fail('Duplicate activity code');const old=rows[0],lesson=lessons.find(l=>l.code===desired.lesson_code);
  if(old&&(!old.is_active||old.lesson_id!==lesson.id||hash(pick(old,activityFields))!==hash(pick(desired,activityFields))))fail(`Existing activity differs; refusing overwrite: ${desired.activity_code}`);
  const prior=old?state.versions.filter(v=>v.activity_id===old.activity_id):[],digest=content.hash(resolveConfig(desired.config,assetIds)),same=prior.find(v=>v.content_hash===digest);
  if(prior.length&&(!same||same.publication_status!=='draft'||content.hash(same.config)!==digest||prior.some(v=>v.version_number>same.version_number)))fail(`Existing version conflicts with G3B: ${desired.activity_code}`);
  activities.push({code:desired.activity_code,id:old?.activity_id??null,lesson_code:desired.lesson_code,action:old?'reuse':'insert',after:pick(desired,activityFields)});
  versions.push({code:desired.activity_code,activity_id:old?.activity_id??null,version_id:same?.version_id??null,action:same?'reuse':'insert',next_version:1,logical_config_hash:content.hash(desired.config)});
 }
 const result={phase:'G3B',package_hash:bundle.package_hash,state_hash:hash(state),lessons,activities,items,assets,versions,summary:{lessonsInserted:lessons.filter(x=>x.action==='insert').length,activitiesInserted:activities.filter(x=>x.action==='insert').length,itemsInserted:items.filter(x=>x.action==='insert').length,assetsInserted:assets.filter(x=>x.action==='insert').length,versionsInserted:versions.filter(x=>x.action==='insert').length,versionsReused:versions.filter(x=>x.action==='reuse').length,existingRowsUpdated:0,published:0,legacyMediaChanged:0},preservedContent:fingerprints(state),unmapped_images:bundle.unmapped_images};
 result.plan_hash=hash(result);return result;
}
async function apply(db,bundle,reviewed,dependency){
 const {plan_hash,...unsigned}=reviewed;if(hash(unsigned)!==plan_hash||reviewed.package_hash!==bundle.package_hash)fail('Reviewed plan checksum/package mismatch');
 const [[lock]]=await db.query("SELECT GET_LOCK('curriculum_content_import',10) acquired");if(lock.acquired!==1)fail('Another G3B import is running');
 try{
  await db.beginTransaction();const before=await readState(db,true);
  if(hash(before)!==reviewed.state_hash)fail('DB content changed since diff review; regenerate and inspect diff');
  const actual=plan(bundle,before,dependency);if(actual.plan_hash!==plan_hash)fail('DB content changed since diff review; regenerate and inspect diff');
  const history=await historyFingerprint(db),assetIds=new Map(),lessonIds=new Map(),activityIds=new Map(),insertedItems=[],insertedAssets=[],insertedLessons=[],insertedActivities=[],insertedVersions=[];
  for(const desired of bundle.items)if(!before.items.some(i=>i.item_id===desired.item_id)){const row=itemData(desired);await db.execute('INSERT INTO curriculum_content_item(item_id,item_type,label,sense,source_refs,approval_status) VALUES(?,?,?,?,?,?)',[desired.item_id,row.item_type,row.label,row.sense,JSON.stringify(row.source_refs),'draft']);insertedItems.push(desired.item_id);}
  for(const desired of bundle.assets){let row=findAsset(before,desired);if(!row){const [created]=await db.execute('INSERT INTO curriculum_asset(item_id,role,provider,lookup_url,playable_url,verification_status,source_refs) VALUES(?,?,?,?,?,?,?)',[desired.item_id,desired.role,desired.provider,desired.lookup_url,desired.playable_url,desired.verification_status,JSON.stringify(desired.source_refs)]);row={asset_id:created.insertId};insertedAssets.push(row.asset_id);}assetIds.set(desired.asset_id,row.asset_id);}
  for(const desired of bundle.lessons){const planned=actual.lessons.find(l=>l.code===desired.lesson_code);let id=planned.id;if(planned.action==='insert'){const [created]=await db.execute('INSERT INTO curriculum_lesson(lesson_code,level_code,topic_code,title,description,content_status,display_order) VALUES(?,?,?,?,?,?,?)',[desired.lesson_code,...lessonFields.map(k=>desired[k])]);id=created.insertId;insertedLessons.push({id,code:desired.lesson_code,after:planned.after});}lessonIds.set(desired.lesson_code,id);}
  for(const desired of bundle.activities){const planned=actual.activities.find(a=>a.code===desired.activity_code);let id=planned.id;if(planned.action==='insert'){const [created]=await db.execute("INSERT INTO curriculum_activity(lesson_id,activity_code,activity_level,game_type,title,instruction,display_order,game_config) VALUES(?,?,?,?,?,?,?,JSON_OBJECT('managed_by','versioned_draft','sourcePackage','G3B'))",[lessonIds.get(desired.lesson_code),desired.activity_code,...activityFields.map(k=>desired[k])]);id=created.insertId;insertedActivities.push({id,code:desired.activity_code,lesson_id:lessonIds.get(desired.lesson_code),after:planned.after});}activityIds.set(desired.activity_code,id);}
  for(const desired of bundle.activities){const planned=actual.versions.find(v=>v.code===desired.activity_code);if(planned.action==='reuse')continue;const config=resolveConfig(desired.config,assetIds),digest=content.hash(config),id=activityIds.get(desired.activity_code);const [created]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,1,?,'draft',?)",[id,digest,JSON.stringify(config)]);insertedVersions.push({version_id:created.insertId,activity_id:id,code:desired.activity_code,content_hash:digest});}
  const after=await readState(db),afterHistory=await historyFingerprint(db),preserved=fingerprints(after,actual.preservedContent);
  if(hash(preserved)!==hash(actual.preservedContent))fail('Pre-existing content changed; refusing import');if(hash(history)!==hash(afterHistory))fail('Legacy media/history changed; refusing import');
  const report={phase:'G3B',package_hash:bundle.package_hash,reviewed_plan_hash:plan_hash,before_state_hash:hash(before),after_state_hash:hash(after),insertedItems,insertedAssets,insertedLessons,insertedActivities,insertedVersions,preservedContentBefore:actual.preservedContent,preservedContentAfter:preserved,historyBefore:history,historyAfter:afterHistory,oldVersionsPreserved:before.versions.length,published:0};
  report.report_hash=hash(report);await db.commit();return report;
 }catch(e){await db.rollback();throw e;}finally{await db.query("SELECT RELEASE_LOCK('curriculum_content_import')");}
}
async function rollback(db,report){
 const {report_hash,...unsigned}=report||{};if(report?.phase!=='G3B'||!report_hash||hash(unsigned)!==report_hash)fail('Invalid G3B import report checksum');const [[lock]]=await db.query("SELECT GET_LOCK('curriculum_content_import',10) acquired");if(lock.acquired!==1)fail('Another import is running');
 try{
  await db.beginTransaction();const before=await readState(db,true),history=await historyFingerprint(db);
  if(hash(before)!==report.after_state_hash)fail('Content changed after import; refusing automatic rollback');
  if(hash(fingerprints(before,report.preservedContentBefore))!==hash(report.preservedContentBefore))fail('Protected content changed since G3B import');
  for(const record of report.insertedActivities){const row=before.activities.find(a=>a.activity_id===record.id);if(!row||!inScope(row.activity_code)||row.activity_code!==record.code||!row.is_active||hash(pick(row,activityFields))!==hash(record.after))fail('Activity changed after G3B import');}
  for(const record of report.insertedLessons){const row=before.lessons.find(l=>l.lesson_id===record.id);if(!row||!inScope(row.lesson_code)||row.lesson_code!==record.code||!row.is_active||hash(pick(row,lessonFields))!==hash(record.after))fail('Lesson changed after G3B import');}
  for(const record of report.insertedVersions){const row=before.versions.find(v=>v.version_id===record.version_id);if(!row||row.activity_id!==record.activity_id||row.publication_status!=='draft'||row.content_hash!==record.content_hash||content.hash(row.config)!==row.content_hash||before.versions.some(v=>v.activity_id===row.activity_id&&v.version_number>row.version_number))fail('Version changed after G3B import');await db.execute("UPDATE curriculum_activity_version SET publication_status='archived' WHERE version_id=?",[row.version_id]);}
  for(const record of report.insertedActivities)await db.execute('UPDATE curriculum_activity SET is_active=0 WHERE activity_id=?',[record.id]);
  for(const record of report.insertedLessons)await db.execute('UPDATE curriculum_lesson SET is_active=0 WHERE lesson_id=?',[record.id]);
  if(hash(await historyFingerprint(db))!==hash(history))fail('History changed during rollback');await db.commit();return {phase:'G3B',status:'new_content_deactivated_versions_archived',historyPreserved:true,existingContentPreserved:true,itemsAndAssetsRetained:true};
 }catch(e){await db.rollback();throw e;}finally{await db.query("SELECT RELEASE_LOCK('curriculum_content_import')");}
}
module.exports={validateBundle,plan,apply,rollback,readState,historyFingerprint,hash,fingerprints,resolveConfig};
