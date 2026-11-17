"use client";
import React,{useState} from 'react';
import Image from 'next/image';
import {CurriculumActivity,CurriculumAttempt} from '@/domain/entities/Curriculum';
import {useCurriculumAttempt,taskDone} from './useCurriculumAttempt';
import {BucketBoard,button,FlipCards,MatchingBoard,MemoryBoard,QuizTask,SequenceTask,TaskSteps} from './GameViews';
import {LearningItemRenderer} from './LearningItemRenderer';
import {Recorder} from './Recorder';
import {CompoundLearning} from './CompoundLearning';
import {RecordingBoard} from './RecordingBoard';
import {FeedbackPanel} from './FeedbackPanel';
export interface AttemptGameProps {activityCode:string;activity?:CurriculumActivity;classPracticeId?:string;initialAttemptId?:string;onComplete?:()=>void}
type Runtime=ReturnType<typeof useCurriculumAttempt>;
export function AttemptGame(props:AttemptGameProps){
 const runtime=useCurriculumAttempt(props);
 if(!runtime.attempt)return <div className="space-y-4 p-8 text-center" role="status">{runtime.busy?'Đang tải phiên làm bài…':<><p role="alert">{runtime.error}</p><button type="button" className={button} onClick={()=>void runtime.reload()}>Thử lại</button></>}</div>;
 return <AttemptSession key={runtime.attempt.attemptId} runtime={runtime} attempt={runtime.attempt}/>;
}
function AttemptSession({runtime,attempt}:{runtime:Runtime;attempt:CurriculumAttempt}){
 const rounds=attempt.config.rounds||[{id:'legacy',title:'Lượt 1',available:true,complete:attempt.config.tasks.every(t=>taskDone(attempt,t)),solved:false}];
 const [roundId,setRoundId]=useState(()=>rounds.find(r=>r.available&&!r.complete)?.id||rounds[0].id);
 const round=rounds.find(r=>r.id===roundId)||rounds[0];const index=rounds.indexOf(round);const tasks=attempt.config.tasks.filter(t=>(t.roundId||'legacy')===round.id);
 const answered=attempt.config.tasks.filter(t=>taskDone(attempt,t)).length;
 const allDone=answered===attempt.config.tasks.length;const {busy,send}=runtime;
 const props={attempt,tasks,busy,send};const game=attempt.config.game_type;const last=attempt.answers.at(-1);
 let view:React.ReactNode;
 if(game==='VideoPracticeRecorder'&&attempt.recording)view=<RecordingBoard {...props} busy={busy||runtime.pendingOperation} fixture={false}/>;
 else if(game==='FlipCardViewer')view=<FlipCards {...props}/>;
 else if(game==='LineMatchingGame'||game==='JigsawPuzzleGame'||game==='MemoryCardGame'&&tasks[0].kind==='pair')view=<MatchingBoard {...props}/>;
 else if(game==='BucketDropGame')view=<BucketBoard {...props}/>;
 else if(game==='MemoryCardGame'&&tasks[0].kind==='memory')view=<MemoryBoard attempt={attempt} task={tasks[0]} busy={busy} send={send}/>;
 else view=<TaskSteps {...props}>{task=>task.kind==='sequence'?<SequenceTask key={task.id} attempt={attempt} task={task} busy={busy} send={send}/>:task.kind==='recording'?<div className="space-y-4"><LearningItemRenderer value={task.prompt}/>{task.sample&&<LearningItemRenderer value={task.sample}/>}<Recorder key={`${attempt.attemptId}:${task.id}`} attemptId={attempt.attemptId} task={task} disabled={busy||taskDone(attempt,task)} onUpload={async uploadId=>{await send(task,{uploadId});}}/></div>:<QuizTask key={task.id} attempt={attempt} task={task} busy={busy} send={send}/>}</TaskSteps>;
 return <section className="mx-auto max-w-5xl space-y-5 text-gray-900" aria-label="Hoạt động ký hiệu">
  <header className="space-y-3 text-center">{attempt.config.icon&&<Image unoptimized width={72} height={72} src={attempt.config.icon} alt="Biểu tượng hoạt động" className="mx-auto h-16 w-16 object-contain"/>}<h2 className="text-2xl font-black">{runtime.title}</h2>{attempt.config.instruction&&<p className="whitespace-pre-line text-sm text-gray-600">{attempt.config.instruction}</p>}</header>
  {attempt.isPreview&&<p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Xem thử nội dung đang biên soạn. Kết quả thử được lưu riêng.</p>}
  {attempt.config.compound&&<CompoundLearning content={attempt.config.compound} taskIds={attempt.config.tasks.map(t=>t.id)}/>}
  {runtime.updateAvailable&&<div role="status" className="rounded-xl border border-blue-300 bg-blue-50 p-4"><p>Đã có nội dung nháp mới. Lượt đang mở vẫn giữ phiên bản cũ.</p><button type="button" className={`${button} mt-2`} disabled={busy} onClick={()=>void runtime.restart()}>Bắt đầu lượt với nội dung mới</button></div>}
  <FeedbackPanel attempt={attempt} reload={()=>runtime.reload()}/>
  {runtime.error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800"><p>{runtime.error}</p><button type="button" className={`${button} mt-2`} disabled={busy} onClick={()=>void runtime.retry()}>Thử lại thao tác</button></div>}
  {busy&&<p role="status" className="text-sm">Đang lưu thao tác…</p>}
  {attempt.result?<div className="space-y-5 rounded-2xl border bg-white p-7 text-center">
   <h3 className="text-2xl font-bold">{attempt.review?.status==='reviewed'?'Đã nhận xét đủ các mục':attempt.review?.status==='needs_revision'?'Có mục cần làm lại':attempt.review?.status==='resubmitted'?'Đã có lần nộp lại':attempt.result.reviewStatus==='pending_review'?'Đã nộp, đang chờ nhận xét':attempt.result.reviewStatus==='viewed_all'?'Đã xem đủ các thẻ':attempt.result.isCompleted?'Đã đạt yêu cầu':'Đã lưu lượt làm bài'}</h3>
   {attempt.result.reviewStatus==='assessed'&&<p className="text-xl">Điểm: {attempt.result.score}</p>}
   {attempt.result.firstCorrect!==undefined&&game==='ChoiceQuizGame'&&<p>Đúng ngay lần đầu: {attempt.result.firstCorrect}/{attempt.result.required} mục. Kết quả sau thử lại được lưu riêng.</p>}
   {game==='MemoryCardGame'&&<p>Số lượt lật: {attempt.result.moves}</p>}
   {attempt.result.stars>0&&<p aria-label={`${attempt.result.stars} sao`} className="text-3xl">{'⭐'.repeat(attempt.result.stars)}</p>}
   {attempt.recording&&<RecordingBoard attempt={attempt} tasks={attempt.config.tasks} busy={busy} send={send} fixture={false}/>}
   {runtime.canRestart&&<button type="button" className={button} disabled={busy} onClick={()=>void runtime.restart()}>Chơi lượt mới</button>}
  </div>:<>
   <div className="space-y-2"><p className="font-bold" aria-label="Tiến độ hoạt động">Đã làm {answered}/{attempt.config.tasks.length} mục · Lượt {index+1}/{rounds.length}</p><progress aria-label="Tiến độ các mục" value={answered} max={attempt.config.tasks.length} className="h-3 w-full accent-emerald-600"/></div>
   <nav aria-label="Các lượt chơi" className="flex flex-wrap gap-2">{rounds.map((r,i)=><button type="button" key={r.id} className={`${button} ${r.id===round.id?'bg-primary-100 ring-2 ring-primary-500':''}`} disabled={busy||!r.available} aria-current={r.id===round.id?'step':undefined} onClick={()=>setRoundId(r.id)}>{r.complete?'✓ ':!r.available?'🔒 ':''}Lượt {i+1} · {r.title}</button>)}</nav>
   <div key={`${attempt.attemptId}:${round.id}`} className="rounded-2xl border bg-white p-3 sm:p-5">{view}</div>
   {last?.correct===true&&<p role="status" className="font-bold text-emerald-700">✓ {last.eventKind==='view'?'Đã ghi nhận xem thẻ. Đây là tiến độ xem, chưa phải đánh giá kỹ năng.':'Đúng rồi!'}</p>}
   {last?.correct===false&&<p role="status" className="font-bold text-amber-800">{last.exhausted?'Đã hết lượt thử cho mục này.':'Chưa đúng, hãy thử lại.'}</p>}
   <div className="flex flex-wrap justify-between gap-3">
    {runtime.canRestart&&<button type="button" className={button} disabled={busy} onClick={()=>void runtime.restart()}>Bắt đầu lượt làm mới</button>}
    {index<rounds.length-1&&<button type="button" className={button} disabled={busy||!round.complete||!rounds[index+1].available} onClick={()=>setRoundId(rounds[index+1].id)}>Sang lượt tiếp theo →</button>}
   </div>
   <button type="button" className={`${button} w-full bg-primary-50`} disabled={busy||!allDone} onClick={()=>void runtime.submit()}>Lưu kết quả hoạt động</button>
  </>}
 </section>;
}
