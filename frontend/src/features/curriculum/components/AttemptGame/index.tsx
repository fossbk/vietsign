"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import Model,{AttemptEvent,AttemptTask,CurriculumActivity,CurriculumAttempt,TaskPresentation} from '@/domain/entities/Curriculum';
import {VideoPlayer} from '@/shared/components/common/VideoPlayer';

interface Saved {requestId:string;attemptId?:string;pending?:AttemptEvent;finalize?:string}
interface Props {activityCode:string;activity?:CurriculumActivity;onComplete?:()=>void}
const button='min-h-11 rounded-xl border px-4 py-2 font-semibold disabled:opacity-50';
const message=(e:unknown)=>{const error=e as {response?:{data?:{message?:string}};message?:string};return error.response?.data?.message||error.message||'Không kết nối được. Hãy thử lại.';};
function userKey(){const user=JSON.parse(localStorage.getItem('user')||'null');return String(user?.user_id||user?.id||'session');}
function stored(key:string):Saved|null {
  try {const value=JSON.parse(sessionStorage.getItem(key)||'null');return value&&typeof value.requestId==='string'?value:null;}catch{return null;}
}
function Media({value}:{value:TaskPresentation}){
  if(value.type==='text')return <p className="whitespace-pre-line text-xl font-bold">{value.content}</p>;
  if(value.type==='image')return <Image unoptimized width={400} height={280} src={value.content} alt={value.label||'Hình minh họa'} className="mx-auto h-52 max-w-full object-contain"/>;
  return <VideoPlayer videoUrl={value.content} title={value.label} autoPlay={false} loop={false}/>;
}

export function AttemptGame({activityCode,activity,onComplete}:Props){
  const [attempt,setAttempt]=useState<CurriculumAttempt|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  const generation=useRef(0),lock=useRef(false),key=useRef(''),owner=useRef('');
  const save=useCallback((state:Saved)=>sessionStorage.setItem(key.current,JSON.stringify(state)),[]);
  const load=useCallback(async(fresh=false)=>{
    const run=++generation.current;setBusy(true);setError('');setAttempt(null);
    try {
      owner.current=userKey();
      const meta=activity||await Model.getActivityByCode(activityCode);
      if(run!==generation.current)return;
      key.current=`curriculum:g1:${owner.current}:${meta.activity_id}`;
      const state=(!fresh&&stored(key.current))||{requestId:crypto.randomUUID()};save(state);
      let next=state.attemptId?await Model.getAttempt(state.attemptId):await Model.startAttempt(meta.activity_id,state.requestId);
      state.attemptId=next.attemptId;save(state);
      try {
        if(state.pending){await Model.answerAttempt(next.attemptId,state.pending);delete state.pending;save(state);next=await Model.getAttempt(next.attemptId);}
        if(state.finalize){await Model.submitAttempt(next.attemptId,state.finalize);delete state.finalize;save(state);next=await Model.getAttempt(next.attemptId);}
      }catch(e){
        const status=(e as {response?:{status:number}}).response?.status;
        if(status&&[400,403,404,409,422].includes(status)){delete state.pending;delete state.finalize;save(state);}
        throw e;
      }
      if(run===generation.current)setAttempt(next);
    }catch(e){if(run===generation.current)setError(message(e));}
    finally{if(run===generation.current)setBusy(false);}
  },[activity,activityCode,save]);
  useEffect(()=>{const requests=generation;void load();return()=>{requests.current++;};},[load]);
  const operate=async(fn:(state:Saved)=>Promise<void>)=>{
    if(lock.current||!attempt)return;lock.current=true;setBusy(true);setError('');const run=generation.current;
    try{
      if(owner.current!==userKey())throw new Error('Tài khoản đã thay đổi. Hãy tải lại trang.');
      const state=stored(key.current);if(!state||state.attemptId!==attempt.attemptId)throw new Error('Phiên lưu đã thay đổi. Hãy tải lại trang.');
      if(state.pending||state.finalize)throw new Error('Có thao tác đang chờ lưu. Hãy chọn Thử lại thao tác.');
      await fn(state);
      const next=await Model.getAttempt(attempt.attemptId);
      if(run===generation.current){setAttempt(next);if(next.result?.isCompleted)onComplete?.();}
    }catch(e){
      const status=(e as {response?:{status:number}}).response?.status;
      if(status&&[400,403,404,409,422].includes(status)){const state=stored(key.current);if(state){delete state.pending;delete state.finalize;save(state);}}
      if(run===generation.current)setError(message(e));
    }finally{lock.current=false;if(run===generation.current)setBusy(false);}
  };
  const send=(task:AttemptTask,input:Omit<AttemptEvent,'eventId'|'taskId'>)=>operate(async state=>{
    const event={...input,eventId:crypto.randomUUID(),taskId:task.id};state.pending=event;save(state);
    await Model.answerAttempt(attempt!.attemptId,event);delete state.pending;save(state);
  });
  if(!attempt)return <div className="space-y-3 p-8 text-center">{busy?<p role="status">Đang tải phiên làm bài…</p>:<><p role="alert">{error}</p><button className={button} onClick={()=>void load()}>Thử lại</button></>}</div>;
  const done=attempt.config.tasks.filter(t=>attempt.answers.some(a=>a.taskId===t.id)).length;
  return <section className="space-y-5 p-4" aria-label="Hoạt động ký hiệu">
    <h2 className="text-2xl font-bold">{activity?.title||'Hoạt động ký hiệu'}</h2>
    {attempt.isPreview&&<p role="note" className="rounded-xl bg-amber-50 p-4">Xem thử nội dung đang biên soạn. Kết quả thử không tính vào tiến độ học.</p>}
    {error&&<div role="alert"><p>{error}</p><button className={button} disabled={busy} onClick={()=>void load()}>Thử lại thao tác</button></div>}
    {busy&&<p role="status">Đang lưu thao tác…</p>}
    <p role="status">Đã làm {done}/{attempt.config.tasks.length} mục</p>
    <div className="space-y-6">{attempt.config.tasks.map((task,index)=>{
      const answers=attempt.answers.filter(a=>a.taskId===task.id),last=answers.at(-1);
      const exhausted=attempt.config.policy.max_retries!==null&&answers.length>attempt.config.policy.max_retries;
      const finished=!!attempt.result||answers.some(a=>a.correct===true)||task.kind==='recording'&&answers.length>0||attempt.config.game_type==='ChoiceQuizGame'&&answers.length>0||exhausted;
      return <article key={task.id} className="space-y-4 rounded-xl border bg-white p-4">
        <h3 className="font-bold">Mục {index+1}{task.label?`: ${task.label}`:''}</h3><Media value={task.prompt}/>
        {last&&<p role="status">{last.reviewStatus==='pending_review'?'Đã nhận video, chờ nhận xét':task.kind==='view'?'Đã xem':last.correct?'Đúng rồi':exhausted?'Đã hết lượt thử':'Chưa đúng'}</p>}
        {task.kind==='view'?<button className={button} disabled={busy||finished} onClick={()=>void send(task,{action:'view'})}>Đã xem thẻ</button>
          :task.kind==='recording'?(!finished&&<Recorder key={`${attempt.attemptId}:${task.id}`} attemptId={attempt.attemptId} task={task} disabled={busy||!!error} onUpload={uploadId=>send(task,{uploadId})}/>)
          :task.kind==='sequence'?<Sequence key={`${attempt.attemptId}:${task.id}`} task={task} disabled={busy||finished} send={choiceIds=>send(task,{choiceIds})}/>
          :<div className="grid gap-3 sm:grid-cols-2">{task.options?.map(option=><div key={option.id} className="space-y-2 rounded-xl border p-3"><Media value={option.presentation}/><button className={button} disabled={busy||finished} onClick={()=>void send(task,{choiceIds:[option.id]})}>Chọn {option.presentation.label|| (option.presentation.type==='text'?option.presentation.content:'đáp án này')}</button></div>)}</div>}
      </article>;
    })}</div>
    {attempt.result?<div role="status" className="space-y-3 rounded-xl bg-emerald-50 p-4"><p>{attempt.result.reviewStatus==='pending_review'?'Đã nộp, chờ nhận xét':attempt.result.reviewStatus==='viewed_all'?'Đã xem đủ thẻ':attempt.result.isCompleted?'Đã đạt yêu cầu':'Đã lưu lượt làm bài'}</p>
      {attempt.result.reviewStatus==='assessed'&&<p>Điểm: {attempt.result.score} · Sao: {attempt.result.stars}</p>}
      <button className={button} disabled={busy} onClick={()=>void load(true)}>Bắt đầu lượt mới</button></div>
      :<button className={button} disabled={busy||done!==attempt.config.tasks.length||!!error} onClick={()=>void operate(async state=>{state.finalize=`submit_${attempt.attemptId}`;save(state);await Model.submitAttempt(attempt.attemptId,state.finalize);delete state.finalize;save(state);})}>Lưu kết quả hoạt động</button>}
  </section>;
}

function Sequence({task,disabled,send}:{task:AttemptTask;disabled:boolean;send:(ids:string[])=>Promise<void>}){
  const initial=()=>task.options!.map((_,i)=>task.fixedOptions?.[i]||'');
  const [order,setOrder]=useState(initial);const next=order.findIndex(id=>!id);
  return <div className="space-y-3"><ol className="space-y-2">{order.map((id,i)=><li key={i}>{i+1}. {task.options?.find(o=>o.id===id)?.presentation.content||'Chưa chọn'}{task.fixedOptions?.[i]?' (cố định)':''}</li>)}</ol>
    <div className="flex flex-wrap gap-2">{task.options?.filter(o=>!order.includes(o.id)).map(o=><button className={button} key={o.id} disabled={disabled||next<0} onClick={()=>setOrder(a=>a.map((id,i)=>i===next?o.id:id))}>{o.presentation.label||o.presentation.content}</button>)}</div>
    <button className={button} disabled={disabled} onClick={()=>setOrder(initial())}>Xếp lại</button> <button className={button} disabled={disabled||next>=0} onClick={()=>void send(order)}>Kiểm tra thứ tự</button></div>;
}

function Recorder({attemptId,task,disabled,onUpload}:{attemptId:string;task:AttemptTask;disabled:boolean;onUpload:(id:string)=>Promise<void>}){
  const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[error,setError]=useState(''),[opening,setOpening]=useState(false),[recording,setRecording]=useState(false),[uploading,setUploading]=useState(false);
  const video=useRef<HTMLVideoElement>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),active=useRef(true),lock=useRef(false),uploadRequest=useRef(''),uploaded=useRef<string|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
  useEffect(()=>{if(!file)return;const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
  const choose=(value:File)=>{setFile(value);uploadRequest.current=crypto.randomUUID();uploaded.current=null;setError('');};
  const start=async()=>{
    if(lock.current)return;lock.current=true;setOpening(true);setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Camera cần HTTPS hoặc localhost và trình duyệt hỗ trợ quay video. Bạn cũng có thể chọn file.');
      const media=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      if(!active.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;if(video.current)video.current.srcObject=media;
      const mime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      const r=new MediaRecorder(media,{...(mime?{mimeType:mime}:{})});recorder.current=r;const chunks:Blob[]=[];let size=0;
      r.ondataavailable=e=>{chunks.push(e.data);size+=e.data.size;if(size>10*1024*1024&&r.state==='recording')r.stop();};
      r.onstop=()=>{media.getTracks().forEach(t=>t.stop());if(active.current){setRecording(false);choose(new File(chunks,r.mimeType.includes('mp4')?'practice.mp4':'practice.webm',{type:r.mimeType}));}};
      r.onerror=()=>{media.getTracks().forEach(t=>t.stop());if(active.current){setRecording(false);setError('Không quay được video. Hãy thử lại.');}};
      r.start(250);setRecording(true);
    }catch(e){stream.current?.getTracks().forEach(t=>t.stop());if(active.current)setError(message(e));}
    finally{lock.current=false;if(active.current)setOpening(false);}
  };
  const upload=async()=>{
    if(lock.current||!file)return;lock.current=true;setUploading(true);setError('');
    try{
      if(!file.size||file.size>10*1024*1024)throw new Error('Video cần có nội dung và không vượt quá 10 MB.');
      if(!uploaded.current)uploaded.current=(await Model.uploadAttemptVideo(attemptId,task.id,file,uploadRequest.current)).uploadId;
      if(active.current)await onUpload(uploaded.current);
    }catch(e){if(active.current)setError(message(e));}
    finally{lock.current=false;if(active.current)setUploading(false);}
  };
  return <div className="space-y-3"><p>Video WebM hoặc MP4, tối đa 10 MB. Video chưa nộp chỉ được giữ khi trang còn mở.</p>
    <video ref={video} title="Camera xem trước" autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-gray-900"/>
    <button className={button} disabled={disabled||opening||uploading} onClick={()=>{if(recording)recorder.current?.stop();else void start();}}>{opening?'Đang mở camera…':recording?'Dừng quay':'Quay video'}</button>
    <label className="block">Hoặc chọn video<input aria-label={`Video cho ${task.label||task.id}`} type="file" accept="video/webm,video/mp4" disabled={disabled||recording||opening||uploading} onChange={e=>{if(e.target.files?.[0])choose(e.target.files[0]);}}/></label>
    {file&&!recording&&<><video key={url} title="Video đã chọn" src={url} controls playsInline className="aspect-video w-full"/><button className={button} disabled={disabled||opening||uploading} onClick={()=>void upload()}>{uploading?'Đang tải…':'Nộp video cho mục này'}</button></>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
