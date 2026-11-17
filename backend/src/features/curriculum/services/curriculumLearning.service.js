// G5A is a read model over existing snapshots/events. No migration or history writes.
const db=require('../../../db'),c=require('./curriculumContent.service'),reviews=require('./curriculumReview.service'),groups=require('./curriculumGroup.service'),access=require('./curriculumAccess.service'),rounds=require('./curriculumRounds.service');
const groupCodes=['L1.GROUP.B01-B03','L1.GROUP.B04-B06','L1.GROUP.B07-B08','L1.GROUP.B09-B10'];
const newest=(a,b)=>b.touchedAt.localeCompare(a.touchedAt)||b.startedAt.localeCompare(a.startedAt)||String(b.attemptId||'').localeCompare(String(a.attemptId||''));
const stamp=value=>value instanceof Date?value.toISOString():String(value||'');
const priority=p=>p.status==='needs_revision'?0:p.isResubmission&&['not_started','in_progress','ready_to_submit'].includes(p.status)?1:['in_progress','ready_to_submit'].includes(p.status)?2:p.status==='not_started'?3:99;
function progress(attempt,answers,review,official=false){
 const snapshot=attempt.snapshot,tasks=snapshot.tasks,recording=tasks.some(t=>t.kind==='recording'),done=t=>snapshot.runtime_version===2?rounds.terminal(snapshot,t,answers):answers.some(a=>a.task_id===t.id&&(t.kind==='choice'||c.parse(a.response).correct===true||c.parse(a.response).terminal===true||c.parse(a.response).reviewStatus==='pending_review'));
 const finished=tasks.filter(done),available=snapshot.runtime_version===2?new Set(rounds.roundState(snapshot,answers).filter(r=>r.available).map(r=>r.id)):null;
 const next=tasks.find(t=>!done(t)&&!t.blockedReason&&(!available||available.has(t.roundId)));
 let status=answers.length?'in_progress':'not_started';
 if(attempt.status==='open'&&finished.length===tasks.length)status='ready_to_submit';
 if(attempt.status==='finalized')status=snapshot.game_type==='FlipCardViewer'?'viewed':official?'completed':recording?review?.scope==='class'?review.status==='reviewed'?'reviewed':review.status==='needs_revision'?'needs_revision':'pending_review':'submitted':'practiced';
 return {attemptId:attempt.attempt_id,versionId:attempt.version_id,isPreview:!!attempt.is_preview,status,required:tasks.length,done:finished.length,viewed:tasks.filter(t=>t.kind==='view'&&done(t)).length,submitted:tasks.filter(t=>t.kind==='recording'&&done(t)).length,nextTaskId:next?.id||null,nextTaskLabel:next&&['view','recording'].includes(next.kind)?next.label||null:null,readyToSubmit:attempt.status==='open'&&finished.length===tasks.length,waitingD08:review?.status==='waiting_D08',canResubmit:!!review?.canResubmit,isResubmission:!!review?.parentAttemptId,officialCompleted:official,touchedAt:stamp(attempt.finalized_at||attempt.started_at),startedAt:stamp(attempt.started_at),href:`/curriculum/attempts/${attempt.attempt_id}`};
}
function currentAttempt(attempts,links,reviewRows){
 const byId=new Map(attempts.map(a=>[a.attempt_id,a])),linkById=new Map(links.map(l=>[l.attempt_id,l]));
 const latest=new Map();for(const r of reviewRows)latest.set(`${r.attempt_id}:${r.task_id}`,r);
 const valid=link=>{const needed=[...latest.values()].filter(r=>r.attempt_id===link.parent_attempt_id&&r.verdict==='needs_revision').map(r=>({taskId:r.task_id,reviewId:r.review_id})).sort((a,b)=>a.taskId.localeCompare(b.taskId));return c.hash(needed)===link.scope_hash;};
 // DATETIME has second precision: prefer the newer version, then recorded work, on ties.
 const order=(a,b)=>stamp(b.started_at).localeCompare(stamp(a.started_at))||Number(b.version_id)-Number(a.version_id)||Number(b.last_answer_id||0)-Number(a.last_answer_id||0)||b.attempt_id.localeCompare(a.attempt_id);
 const sorted=rows=>rows.sort(order);
 const leaves=sorted(attempts.filter(a=>!linkById.has(a.attempt_id))).map(root=>{let current=root;const visited=new Set();while(!visited.has(current.attempt_id)){visited.add(current.attempt_id);const children=sorted(links.filter(l=>l.parent_attempt_id===current.attempt_id&&valid(l)).map(l=>byId.get(l.attempt_id)).filter(Boolean));if(!children.length)break;current=children[0];}const needs=current.practice_id&&[...latest.values()].some(r=>r.attempt_id===current.attempt_id&&r.verdict==='needs_revision'),redo=current.practice_id&&linkById.has(current.attempt_id)&&current.status==='open';return {root,current,rank:needs?0:redo?1:2};});
 leaves.sort((a,b)=>a.rank-b.rank||order(a.root,b.root));return leaves[0]?.current||null;
}
function counts(rows){const statuses={};for(const r of rows)statuses[r.progress?.status||'not_started']=(statuses[r.progress?.status||'not_started']||0)+1;return {total:rows.length,attempted:rows.filter(r=>r.attempted).length,officialCompleted:rows.filter(r=>r.officialCompleted).length,statuses};}
function recommendation(practices,personal){
 const classChoices=practices.filter(p=>p.progress&&priority(p.progress)<99).sort((a,b)=>priority(a.progress)-priority(b.progress)||newest(a.progress,b.progress));
 if(classChoices.length){const p=classChoices[0];return {scope:'class',title:p.title,className:p.class_name,practiceId:p.practice_id,...p.progress};}
 const self=personal.filter(p=>['not_started','in_progress','ready_to_submit'].includes(p.progress.status)).sort((a,b)=>newest(a.progress,b.progress))[0];return self?{scope:'self_study',title:self.title,...self.progress}:null;
}
async function overview(userId){
 const role=await access.role(userId);if(!role)c.fail('Tài khoản không còn hoạt động',403);
 const m2=await reviews.available(),m3=await groups.available(),preview=['teacher','admin','super_admin'].includes(role);
 const [catalog]=await db.query(`SELECT a.activity_id,a.activity_code,a.activity_level,a.title,l.lesson_code,l.level_code,l.topic_code ${m3?',ga.group_code':''} FROM curriculum_activity a JOIN curriculum_lesson l ON l.lesson_id=a.lesson_id ${m3?'LEFT JOIN curriculum_group_activity ga ON ga.activity_id=a.activity_id':''} WHERE a.is_active=1 AND l.is_active=1 AND (a.activity_code REGEXP '^L1[.]BT[.](0[1-9]|10)[.]T[0-9][0-9]$' ${m3?`OR ga.group_code IN (${groupCodes.map(()=>'?').join(',')})`:''}) ORDER BY l.display_order,a.display_order`,m3?groupCodes:[]);
 const allowed=new Set(catalog.map(a=>a.activity_id));
 const [rawAttempts]=await db.execute(`SELECT a.* ${m2?',ac.practice_id':',NULL practice_id'} FROM curriculum_attempt a ${m2?'LEFT JOIN curriculum_attempt_class ac ON ac.attempt_id=a.attempt_id':''} WHERE a.user_id=? ORDER BY a.started_at,a.attempt_id`,[userId]);
 const attempts=rawAttempts.filter(a=>allowed.has(a.activity_id)).map(a=>({...a,snapshot:c.parse(a.snapshot),result:c.parse(a.result)}));
 const [allAnswers]=await db.execute('SELECT e.* FROM curriculum_attempt_answer e JOIN curriculum_attempt a ON a.attempt_id=e.attempt_id WHERE a.user_id=? ORDER BY e.answer_id',[userId]);
 const links=m2?(await db.execute('SELECT r.* FROM curriculum_resubmission r JOIN curriculum_attempt a ON a.attempt_id=r.attempt_id WHERE a.user_id=?',[userId]))[0]:[];
 const reviewRows=m2?(await db.execute('SELECT r.* FROM curriculum_item_review r JOIN curriculum_attempt a ON a.attempt_id=r.attempt_id WHERE a.user_id=? ORDER BY r.review_id',[userId]))[0]:[];
 const answersById=new Map();for(const a of allAnswers){if(!answersById.has(a.attempt_id))answersById.set(a.attempt_id,[]);answersById.get(a.attempt_id).push(a);}
 for(const a of attempts)a.last_answer_id=answersById.get(a.attempt_id)?.at(-1)?.answer_id||0;
 const states=await require('./curriculum.services').activityStates(userId,undefined,true),official=new Set(states.filter(s=>s.readiness==='ready'&&s.is_completed).map(s=>s.activity_id));
 const toProgress=async a=>{const events=answersById.get(a.attempt_id)||[],r=await reviews.projection(db,a),p=progress(a,events,r,official.has(a.activity_id)&&!a.is_preview&&a.version_id===states.find(s=>s.activity_id===a.activity_id)?.version_id&&!!a.result?.isCompleted);p.touchedAt=[p.touchedAt,...events.map(e=>stamp(e.created_at)),...reviewRows.filter(r=>r.attempt_id===a.attempt_id).map(r=>stamp(r.created_at))].sort().at(-1);return p;};
 const practices=m2&&['student','teacher','admin','super_admin'].includes(role)?(await reviews.practices(userId)).filter(p=>allowed.has(p.activity_id)):[];
 for(const p of practices){p.progress=null;if(role!=='student')continue;const current=currentAttempt(attempts.filter(a=>a.practice_id===p.practice_id),links,reviewRows);if(current)p.progress=await toProgress(current);else{
  const [versions]=await db.execute('SELECT config,content_hash FROM curriculum_activity_version WHERE version_id=? AND activity_id=?',[p.version_id,p.activity_id]);if(!versions[0])continue;let config=c.parse(versions[0].config);if(c.hash(config)!==versions[0].content_hash)c.fail('Phiên bản thực hành đã thay đổi tại chỗ',409);config=await groups.scopedConfig(db,p.practice_id,config);
  p.progress={...progress({attempt_id:'',version_id:p.version_id,snapshot:config,status:'open',is_preview:1,started_at:p.created_at},[],null),attemptId:null,href:`/curriculum/class-practice/${p.practice_id}`};
 }}
 const personal=[];for(const a of catalog){const current=currentAttempt(attempts.filter(t=>t.activity_id===a.activity_id&&!t.practice_id),[],[]);if(current&&(preview||!current.is_preview))personal.push({...a,progress:await toProgress(current)});}
 const activities=catalog.map(a=>{const assigned=practices.filter(p=>p.activity_id===a.activity_id&&p.progress).sort((a,b)=>priority(a.progress)-priority(b.progress)||newest(a.progress,b.progress)),own=personal.find(p=>p.activity_id===a.activity_id);return {activityId:a.activity_id,activityCode:a.activity_code,level:a.activity_level,lessonCode:a.activity_level==='T'?a.lesson_code:null,groupCode:a.group_code||null,title:a.title,attempted:attempts.some(t=>t.activity_id===a.activity_id),officialCompleted:official.has(a.activity_id),progress:assigned[0]?.progress||own?.progress||null};});
 const lessons=[...new Set(catalog.filter(a=>a.activity_level==='T').map(a=>a.lesson_code))].map(code=>({lessonCode:code,...counts(activities.filter(a=>a.lessonCode===code))}));
 const groupList=m3?await groups.list(userId):[],groupSummary=groupList.map(g=>({...g,...counts(activities.filter(a=>a.groupCode===g.group_code))}));
 return {scope:'B1-B10',role,generatedAt:new Date().toISOString(),summary:counts(activities),lessons,groups:groupSummary,activities,practices,resume:recommendation(practices,personal)};
}
module.exports={overview,progress,currentAttempt,counts,recommendation};
