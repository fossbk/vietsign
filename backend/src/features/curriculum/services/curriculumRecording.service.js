// G4A projects immutable recording events; no teacher decisions or AI grades are written.
const c=require('./curriculumContent.service');
const data=row=>c.parse(row.payload)||{};
const history=(answers,taskId)=>answers.filter(a=>a.task_id===taskId&&data(a).uploadId);
function grade(config,task,input,answers){
 const prior=history(answers,task.id),latest=prior.at(-1),previous=latest?data(latest).uploadId:null;
 if((input.replacesUploadId||null)!==previous)c.fail('Video của mục đã thay đổi. Hãy tải lại phiên trước khi nộp bản thay thế.',409);
 if(prior.some(a=>data(a).uploadId===input.uploadId))c.fail('Video này đã được nộp; hãy dùng lại Event ID hoặc quay bản mới.',409);
 // Keep the original round checks while allowing an explicit replacement before finalization.
 const feedback=c.grade(config,task,input,answers.filter(a=>a.task_id!==task.id));
 return {...feedback,eventKind:'recording_submit',uploadId:input.uploadId,replacesUploadId:previous,revision:prior.length+1};
}
function state(attempt,answers){
 const tasks=attempt.snapshot.tasks.filter(t=>t.kind==='recording');if(!tasks.length)return undefined;
 const items=tasks.map(task=>{const events=history(answers,task.id),latest=events.at(-1);return {
  taskId:task.id,label:task.label||task.id,roundId:task.roundId,
  status:latest?(attempt.status==='finalized'?'pending_review':'submitted'):'not_submitted',
  uploadId:latest?data(latest).uploadId:null,revision:events.length,
  history:events.map((event,index)=>({eventId:event.event_id,uploadId:data(event).uploadId,revision:index+1,submittedAt:event.created_at instanceof Date?event.created_at.toISOString():event.created_at||null})),
 };});
 return {required:tasks.length,submitted:items.filter(i=>i.uploadId).length,missingTaskIds:items.filter(i=>!i.uploadId).map(i=>i.taskId),status:attempt.status==='finalized'?'pending_review':'in_progress',aiStatus:'not_requested',items};
}
module.exports={grade,state};
