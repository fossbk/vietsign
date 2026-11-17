"use client";
import {useState} from 'react';
import {CurriculumAttempt} from '@/domain/entities/Curriculum';
import {GameProps,button} from './GameViews';
import {RecordingTask,SubmittedRecording} from './RecordingTask';
import {LearningItemRenderer} from './LearningItemRenderer';
export function RecordingBoard({attempt,tasks,busy,send,fixture}:{attempt:CurriculumAttempt;fixture:boolean}&GameProps){
 const [selected,setSelected]=useState(()=>tasks.find(t=>!attempt.recording?.items.find(i=>i.taskId===t.id)?.uploadId)?.id||tasks[0].id);
 const task=tasks.find(t=>t.id===selected)||tasks[0],submission=attempt.recording?.items.find(i=>i.taskId===task.id),finalized=attempt.status==='finalized';
 return <div className="space-y-4"><nav aria-label="Các mục thực hành" className="flex flex-wrap gap-2">{tasks.map(t=>{const item=attempt.recording?.items.find(i=>i.taskId===t.id);return <button type="button" key={t.id} className={button} disabled={busy} aria-current={t.id===task.id?'step':undefined} onClick={()=>setSelected(t.id)}>Mục {t.label||t.id} · {item?.uploadId?'Đã nộp':'Chưa nộp'}</button>;})}</nav>
  <LearningItemRenderer value={task.prompt}/>{task.sample&&<LearningItemRenderer value={task.sample}/>}
  {task.blockedReason?<p role="note" className="rounded-xl bg-amber-50 p-3">{task.blockedReason}</p>:finalized?<SubmittedRecording key={task.id} attemptId={attempt.attemptId} submission={submission}/>:<RecordingTask key={`${attempt.attemptId}:${task.id}`} attemptId={attempt.attemptId} task={task} disabled={busy} fixture={fixture} send={send} submission={submission}/>}
 </div>;
}
