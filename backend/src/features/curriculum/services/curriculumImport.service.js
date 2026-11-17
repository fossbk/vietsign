// G3A content import only: no schema migration, publication or legacy-history rewrite.
const { createHash } = require('node:crypto');
const content = require('./curriculumContent.service');
const rounds = require('./curriculumRounds.service');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value instanceof Date ? value.toISOString() : value && typeof value === 'object' && !Buffer.isBuffer(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fail = message => { throw new Error(message); };
const scope = code => /^L1\.BT\.0[1-5](?:\.T\d\d)?$/.test(code);
const lessonFields = ['level_code','topic_code','title','description','content_status','display_order'];
const activityFields = ['activity_level','game_type','title','instruction','display_order'];
const itemFields = ['item_type','label','sense','source_refs','approval_status'];
const assetFields = ['item_id','role','provider','lookup_url','playable_url','verification_status','source_refs'];
const pick = (value, fields) => Object.fromEntries(fields.map(key => [key, value[key] ?? null]));
const jsonRow = row => Object.fromEntries(Object.entries(row).map(([key,value]) => [key, ['source_refs','config','game_config','snapshot','payload','response','result','game_result_details'].includes(key) && typeof value === 'string' ? JSON.parse(value) : value]));
const changed = (before, after) => hash(before) !== hash(after);
const itemData = item => ({ item_type:item.kind, label:item.label, sense:item.sense??null, source_refs:item.source_refs, approval_status:'draft' });
const assetData = asset => pick(asset,assetFields);
function validateCommon(bundle, phase) {
  if(!bundle||typeof bundle!=='object'||!['lessons','activities','items','assets'].every(k=>Array.isArray(bundle[k])))fail('Malformed import package');
  if(!bundle.source||!/^[a-f0-9]{64}$/.test(bundle.source.sha256)||typeof bundle.package_id!=='string'||!bundle.package_id)fail('Missing source/package identity');
  const lessonCodes=new Set(bundle.lessons.map(l=>l.lesson_code));
  if(lessonCodes.size!==bundle.lessons.length)fail('Duplicate lesson codes');
  for(const l of bundle.lessons)if(l.content_status!=='drafting'||l.level_code!=='L1'||l.topic_code!=='BT'||!l.title)fail('Lessons must stay drafting in L1/BT');
  for(const i of bundle.items)if(typeof i.item_id!=='string'||!i.item_id||i.item_id.length>80||!i.kind||!i.label||!Array.isArray(i.source_refs)||!i.source_refs.length||i.approval_status&&i.approval_status!=='draft')fail('Invalid draft item');
  for(const a of bundle.assets)if(typeof a.asset_id!=='string'||!a.asset_id||!a.role||!a.provider||!Array.isArray(a.source_refs)||!a.source_refs.length||a.approval_status&&a.approval_status!=='draft')fail('Invalid draft asset');
  for(const a of bundle.activities){
    const c=a.config;
    if(!lessonCodes.has(a.lesson_code)||!a.activity_code.startsWith(a.lesson_code+'.T')||a.activity_level!=='T'||!a.title||!c||c.runtime_version!==2||c.game_type!==a.game_type||c.sourcePackage?.phase!==phase||c.sourcePackage?.id!==bundle.package_id||c.sourcePackage?.activity_code!==a.activity_code||c.sourcePackage?.workbook_sha256!==bundle.source.sha256)fail('Activity/config/source identity mismatch');
    const declared=new Set(c.asset_ids);
    const urls=new Set(bundle.assets.filter(asset=>declared.has(asset.asset_id)).map(asset=>asset.playable_url).filter(Boolean));
    if(c.icon&&!urls.has(c.icon))fail('Config icon does not belong to a declared asset');
    for(const p of rounds.presentations(c))if(['image','video'].includes(p.type)&&!p.missing&&!urls.has(p.content))fail('Config media does not belong to a declared asset');
  }
}
function validateBundle(bundle) {
  validateCommon(bundle,'G3A');
  const { package_hash, ...body } = bundle;
  if (hash(body)!==package_hash) fail('Package checksum mismatch');
  if (bundle.phase!=='G3A'||bundle.publication_status!=='draft'||bundle.lessons.length!==5||bundle.activities.length!==33) fail('Only the G3A B1–B5 draft package is allowed');
  const expectedLessons=Array.from({length:5},(_,i)=>`L1.BT.0${i+1}`);
  if(hash(bundle.lessons.map(l=>l.lesson_code).sort())!==hash(expectedLessons))fail('Lesson scope differs from B1-B5');
  const expected = [6,7,6,7,7].flatMap((count, i) => Array.from({length:count},(_,n)=>`L1.BT.0${i+1}.T${String(n+1).padStart(2,'0')}`));
  if (hash([...expected].sort())!==hash(bundle.activities.map(a=>a.activity_code).sort())||bundle.lessons.some(l=>!scope(l.lesson_code))) fail('Activity scope differs from the 33 canonical B1–B5 codes');
  const items=new Set(bundle.items.map(i=>i.item_id)),assets=new Set(bundle.assets.map(a=>a.asset_id));
  if(items.size!==bundle.items.length||assets.size!==bundle.assets.length)fail('Duplicate item/asset keys');
  for(const asset of bundle.assets){
    if(!items.has(asset.item_id))fail('Asset has an unknown item');
    if(asset.playable_url&&!/^\/curriculum-media\/g3a\/[a-f0-9]{20}\.webp$/.test(asset.playable_url))fail('Only supplied G3A pictures may be playable in this package');
    if(asset.source_refs.some(ref=>ref.path&&/BÀI (?:[6-9]|10)\//.test(ref.path)||ref.path?.includes('10. nhóm số lượng 10.png')))fail('Out-of-scope or excluded picture');
  }
  for(const activity of bundle.activities){
    if(!scope(activity.lesson_code)||activity.publication_status!=='draft'||activity.config.fixture_only||activity.config.example_only||activity.config.sourcePackage?.phase!=='G3A'||activity.config.policy.status!=='requires_D05')fail('Invalid draft activity provenance');
    if(activity.config.asset_ids.some(id=>!assets.has(id)))fail('Config references an unknown asset');
    if(rounds.presentations(activity.config).some(p=>p.technicalSample||/curriculum-g2-fixtures|technical-sample/.test(p.content||'')))fail('G2 fixtures must never be imported as curriculum content');
    rounds.validate(activity.config);
  }
  return bundle;
}
async function readState(db, lock=false) {
  const state={};
  for(const [key,table,id]of [['lessons','curriculum_lesson','lesson_id'],['activities','curriculum_activity','activity_id'],['items','curriculum_content_item','item_id'],['assets','curriculum_asset','asset_id'],['versions','curriculum_activity_version','version_id']]){
    const [rows]=await db.query(`SELECT * FROM ${table} ORDER BY ${id}${lock?' FOR UPDATE':''}`);state[key]=rows.map(jsonRow);
  }
  return state;
}
function findAsset(state, desired) {
  const matches=state.assets.filter(a=>a.item_id===desired.item_id&&a.role===desired.role&&a.provider===desired.provider&&(a.lookup_url??null)===(desired.lookup_url??null)&&(a.playable_url??null)===(desired.playable_url??null));
  if(matches.length>1)fail(`Ambiguous existing asset ${desired.asset_id}`);
  if(matches.length&&changed(pick(matches[0],assetFields),assetData(desired)))fail(`Existing asset differs; refusing to overwrite ${desired.asset_id}`);
  return matches[0];
}
function resolveConfig(config, ids) {
  const result=structuredClone(config);result.asset_ids=result.asset_ids.map(key=>{if(!ids.has(key))fail(`Unresolved asset ${key}`);return ids.get(key);});
  return result;
}
function plan(bundle, state) {
  validateBundle(bundle);
  const lessons=[],activities=[],items=[],assets=[],versions=[],assetIds=new Map();
  for(const desired of bundle.lessons){
    const matches=state.lessons.filter(l=>l.lesson_code===desired.lesson_code);if(matches.length!==1)fail(`Existing lesson required to preserve IDs: ${desired.lesson_code}`);
    const existing=matches[0];if(!existing.is_active)fail(`Inactive lesson ${desired.lesson_code}`);
    lessons.push({code:desired.lesson_code,id:existing.lesson_id,action:changed(pick(existing,lessonFields),pick(desired,lessonFields))?'update':'unchanged',before:pick(existing,lessonFields),after:pick(desired,lessonFields)});
  }
  for(const desired of bundle.items){
    const existing=state.items.find(i=>i.item_id===desired.item_id),after=itemData(desired);
    if(existing){const comparable=pick(existing,itemFields);if(existing.approval_status==='approved')comparable.approval_status='draft';if(changed(comparable,after))fail(`Existing item differs; refusing to overwrite ${desired.item_id}`);}
    items.push({id:desired.item_id,action:existing?'reuse':'insert'});
  }
  for(const desired of bundle.assets){
    const existing=findAsset(state,desired);assetIds.set(desired.asset_id,existing?.asset_id??`new:${desired.asset_id}`);
    assets.push({key:desired.asset_id,id:existing?.asset_id??null,action:existing?'reuse':'insert',item_id:desired.item_id,role:desired.role,url:desired.playable_url||desired.lookup_url,verification_status:desired.verification_status});
  }
  for(const desired of bundle.activities){
    const matches=state.activities.filter(a=>a.activity_code===desired.activity_code);if(matches.length!==1)fail(`Existing activity required to preserve IDs: ${desired.activity_code}`);
    const existing=matches[0],lesson=lessons.find(l=>l.code===desired.lesson_code);
    if(existing.lesson_id!==lesson.id||!existing.is_active)fail(`Activity ownership/inactive conflict: ${desired.activity_code}`);
    const prior=state.versions.filter(v=>v.activity_id===existing.activity_id);
    if(prior.some(v=>v.publication_status==='published'))fail(`G3A will not alter a published activity: ${desired.activity_code}`);
    activities.push({code:desired.activity_code,id:existing.activity_id,lesson_id:existing.lesson_id,action:changed(pick(existing,activityFields),pick(desired,activityFields))?'update':'unchanged',before:pick(existing,activityFields),after:pick(desired,activityFields)});
    const config=resolveConfig(desired.config,assetIds),digest=content.hash(config),same=prior.find(v=>v.content_hash===digest);
    if(same&&(same.publication_status!=='draft'||content.hash(same.config)!==digest))fail(`Conflicting immutable version ${desired.activity_code}`);
    if(same&&prior.some(v=>v.publication_status==='draft'&&v.version_number>same.version_number))fail(`A newer draft exists for ${desired.activity_code}; use a reviewed rollback instead of silently reusing an older version`);
    versions.push({code:desired.activity_code,activity_id:existing.activity_id,action:same?'reuse':'insert',version_id:same?.version_id??null,next_version:Math.max(0,...prior.map(v=>v.version_number))+1,logical_config_hash:content.hash(desired.config)});
  }
  const result={phase:'G3A',package_hash:bundle.package_hash,state_hash:hash(state),lessons,activities,items,assets,versions,
    summary:{lessonsUpdated:lessons.filter(x=>x.action==='update').length,activitiesUpdated:activities.filter(x=>x.action==='update').length,itemsInserted:items.filter(x=>x.action==='insert').length,assetsInserted:assets.filter(x=>x.action==='insert').length,versionsInserted:versions.filter(x=>x.action==='insert').length,versionsReused:versions.filter(x=>x.action==='reuse').length,published:0,legacyMediaChanged:0},
    preserved:{lesson_ids:lessons.map(l=>l.id),activity_ids:activities.map(a=>a.id),existingVersions:state.versions.length},excluded:bundle.excluded};
  result.plan_hash=hash(result);return result;
}
const historyTables=['curriculum_media','curriculum_attempt','curriculum_attempt_answer','curriculum_upload','curriculum_game_progress','curriculum_user_activity_summary','curriculum_ai_job'];
async function historyFingerprint(db) {
  const out={};for(const table of historyTables){const [keys]=await db.query(`SHOW KEYS FROM ${table} WHERE Key_name='PRIMARY'`);const order=keys.sort((a,b)=>a.Seq_in_index-b.Seq_in_index).map(k=>`\`${k.Column_name}\``).join(',');const [rows]=await db.query(`SELECT * FROM ${table}${order?` ORDER BY ${order}`:''}`);out[table]={rows:rows.length,sha256:hash(rows.map(jsonRow))};}return out;
}
async function updateMetadata(db,table,idColumn,id,values,fields) {
  await db.execute(`UPDATE ${table} SET ${fields.map(field=>`\`${field}\`=?`).join(',')} WHERE ${idColumn}=?`,[...fields.map(field=>values[field]??null),id]);
}
async function apply(db,bundle,reviewed) {
  const {plan_hash,...unsigned}=reviewed;if(hash(unsigned)!==plan_hash)fail('Reviewed plan checksum mismatch');
  if(reviewed.package_hash!==bundle.package_hash)fail('Reviewed plan belongs to another package');
  const [[lock]]=await db.query("SELECT GET_LOCK('curriculum_content_import',10) acquired");if(lock.acquired!==1)fail('Another curriculum import is in progress');
  try{
    await db.beginTransaction();
    const before=await readState(db,true);
    if(hash(before)!==reviewed.state_hash)fail('DB content changed since diff review; regenerate and inspect the diff');
    const actual=plan(bundle,before);
    if(actual.plan_hash!==reviewed.plan_hash)fail('DB content changed since diff review; regenerate and inspect the diff');
    const history=await historyFingerprint(db),assetIds=new Map(),insertedItems=[],insertedAssets=[],insertedVersions=[];
    for(const desired of bundle.items)if(!before.items.some(i=>i.item_id===desired.item_id)){
      const row=itemData(desired);await db.execute('INSERT INTO curriculum_content_item(item_id,item_type,label,sense,source_refs,approval_status) VALUES(?,?,?,?,?,?)',[desired.item_id,row.item_type,row.label,row.sense,JSON.stringify(row.source_refs),'draft']);insertedItems.push(desired.item_id);
    }
    for(const desired of bundle.assets){
      let existing=findAsset(before,desired);
      if(!existing){const row=assetData(desired);const [insert]=await db.execute('INSERT INTO curriculum_asset(item_id,role,provider,lookup_url,playable_url,verification_status,source_refs) VALUES(?,?,?,?,?,?,?)',[row.item_id,row.role,row.provider,row.lookup_url,row.playable_url,row.verification_status,JSON.stringify(row.source_refs)]);existing={asset_id:insert.insertId};insertedAssets.push(insert.insertId);}
      assetIds.set(desired.asset_id,existing.asset_id);
    }
    for(const change of actual.lessons.filter(x=>x.action==='update'))await updateMetadata(db,'curriculum_lesson','lesson_id',change.id,change.after,lessonFields);
    for(const change of actual.activities.filter(x=>x.action==='update'))await updateMetadata(db,'curriculum_activity','activity_id',change.id,change.after,activityFields);
    for(const desired of bundle.activities){
      const activity=actual.activities.find(a=>a.code===desired.activity_code),config=resolveConfig(desired.config,assetIds),digest=content.hash(config);
      const existing=before.versions.find(v=>v.activity_id===activity.id&&v.content_hash===digest);
      if(existing){if(existing.publication_status!=='draft'||content.hash(existing.config)!==digest)fail('Conflicting version during apply');continue;}
      const number=actual.versions.find(v=>v.code===desired.activity_code).next_version;
      const [insert]=await db.execute("INSERT INTO curriculum_activity_version(activity_id,version_number,content_hash,publication_status,config) VALUES(?,?,?,'draft',?)",[activity.id,number,digest,JSON.stringify(config)]);
      insertedVersions.push({version_id:insert.insertId,activity_id:activity.id,content_hash:digest});
    }
    const after=await readState(db),afterHistory=await historyFingerprint(db);
    if(hash(history)!==hash(afterHistory))fail('Legacy media/history changed during import');
    for(const old of before.versions)if(hash(after.versions.find(v=>v.version_id===old.version_id))!==hash(old))fail('Existing immutable version changed');
    for(const old of before.activities){const current=after.activities.find(a=>a.activity_id===old.activity_id);if(!current||hash(current.game_config)!==hash(old.game_config))fail('Legacy activity ID/config changed');}
    const result={phase:'G3A',package_hash:bundle.package_hash,reviewed_plan_hash:reviewed.plan_hash,before_state_hash:hash(before),after_state_hash:hash(after),insertedItems,insertedAssets,insertedVersions,metadataBefore:{lessons:actual.lessons,activities:actual.activities},historyBefore:history,historyAfter:afterHistory,oldVersionsPreserved:before.versions.length,scope:'B1–B5 only',published:0};
    result.report_hash=hash(result);await db.commit();return result;
  }catch(e){await db.rollback();throw e;}
  finally{await db.query("SELECT RELEASE_LOCK('curriculum_content_import')");}
}
async function rollback(db,report) {
  const {report_hash,...unsigned}=report||{};
  if(report?.phase!=='G3A'||!report_hash||hash(unsigned)!==report_hash)fail('Invalid G3A import report checksum');
  const [[lock]]=await db.query("SELECT GET_LOCK('curriculum_content_import',10) acquired");if(lock.acquired!==1)fail('Another import is in progress');
  try{
    await db.beginTransaction();const state=await readState(db,true),history=await historyFingerprint(db);
    if(hash(state)!==report.after_state_hash)fail('Content changed after import; refusing automatic rollback');
    for(const [table,key,fields,changes]of [['curriculum_lesson','lesson_id',lessonFields,report.metadataBefore.lessons],['curriculum_activity','activity_id',activityFields,report.metadataBefore.activities]])for(const change of changes){
      const row=(table==='curriculum_lesson'?state.lessons:state.activities).find(r=>r[key]===change.id);
      if(!row||changed(pick(row,fields),change.after))fail('Metadata changed after import; refusing automatic rollback');
      if(change.action==='update')await updateMetadata(db,table,key,change.id,change.before,fields);
    }
    for(const imported of report.insertedVersions){
      const current=state.versions.find(v=>v.version_id===imported.version_id);
      if(!current||current.content_hash!==imported.content_hash||content.hash(current.config)!==current.content_hash||current.publication_status!=='draft'||state.versions.some(v=>v.activity_id===current.activity_id&&v.version_number>current.version_number))fail('Version changed after import; refusing automatic rollback');
      await db.execute("UPDATE curriculum_activity_version SET publication_status='archived' WHERE version_id=?",[current.version_id]);
    }
    const afterHistory=await historyFingerprint(db);if(hash(history)!==hash(afterHistory))fail('History changed during rollback');
    await db.commit();return {phase:'G3A',status:'metadata_restored_versions_archived',archivedVersions:report.insertedVersions.length,historyPreserved:true,itemsAndAssetsRetained:true};
  }catch(e){await db.rollback();throw e;}finally{await db.query("SELECT RELEASE_LOCK('curriculum_content_import')");}
}
module.exports={validateCommon,validateBundle,readState,plan,apply,rollback,historyFingerprint,hash,resolveConfig};
