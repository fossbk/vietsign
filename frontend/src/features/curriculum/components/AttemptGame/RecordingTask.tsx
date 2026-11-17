"use client";
import {useEffect,useRef,useState} from 'react';
import Model,{AttemptTask,RecordingSubmission} from '@/domain/entities/Curriculum';
import {API_BASE_URL} from '@/core/config/api';
import {button,Send} from './GameViews';
import {errorMessage} from './useCurriculumAttempt';
import {CurriculumMediaPlayer as VideoPlayer} from './CurriculumMediaPlayer';
import {draftKey,readDraft,saveDraft,removeDraft,RecordingDraft} from './recordingDrafts';

export function SubmittedRecording({attemptId,submission}:{attemptId:string;submission?:RecordingSubmission}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 if(!submission?.uploadId)return null;
 return <div className="space-y-3 rounded-xl border border-emerald-300 p-3"><p role="status">{submission.status==='pending_review'?'Chờ nhận xét':'Đã nộp video'} · Bản {submission.revision}</p>
  <div className="flex flex-wrap gap-2">{submission.history.map(h=><button type="button" key={h.uploadId} className={button} onClick={()=>{setError('');void Model.getRecordingVideoTicket(attemptId,h.uploadId).then(v=>setUrl(new URL(v.url,API_BASE_URL).href)).catch(e=>setError(errorMessage(e)));}}>Xem video bản {h.revision}</button>)}</div>
  {error&&<p role="alert">{error}</p>}{url&&<VideoPlayer key={url} videoUrl={url} title={`Video đã nộp cho ${submission.label}`} provider="file" autoPlay={false} loop={false}/>}</div>;
}
export function RecordingTask({attemptId,task,disabled,fixture,send,submission}:{attemptId:string;task:AttemptTask;disabled:boolean;fixture:boolean;send:Send;submission?:RecordingSubmission}){
 const [draft,setDraft]=useState<RecordingDraft|null>(null),[url,setUrl]=useState(''),[recording,setRecording]=useState(false),[opening,setOpening]=useState(false),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[seconds,setSeconds]=useState(0),[restoring,setRestoring]=useState(!fixture),[saving,setSaving]=useState(false);
 const live=useRef<HTMLVideoElement>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),active=useRef(true),lock=useRef(false),current=useRef<RecordingDraft|null>(null);
 const maxSeconds=Math.min(task.recording?.maxSeconds||30,120),maxBytes=Math.min(task.recording?.maxBytes||10485760,10485760);
 useEffect(()=>{active.current=true;return()=>{active.current=false;if(timer.current)clearInterval(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>{if(fixture)return;let mounted=true;
  void readDraft(attemptId,task.id).then(async d=>{const storedId=d?.uploadedId||d?.uploadRequestId;if(d&&submission?.history.some(h=>h.uploadId===storedId)){await removeDraft(attemptId,task.id);d=undefined;}if(mounted){current.current=d||null;setDraft(d||null);}}).catch(()=>{if(mounted)setError('Không đọc được bộ nhớ video nháp. Hãy kiểm tra quyền lưu trữ của trình duyệt.');}).finally(()=>{if(mounted)setRestoring(false);});
  return()=>{mounted=false;};
 },[attemptId,task.id,fixture,submission?.uploadId]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!draft){setUrl('');return;}const next=URL.createObjectURL(draft.blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[draft]);
 const persist=async(d:RecordingDraft)=>{current.current=d;if(active.current){setDraft(d);setSaving(true);}try{if(!fixture)await saveDraft(d);}catch{if(active.current)setError('Chưa lưu được video nháp trên thiết bị. Hãy giữ trang này mở và thử nộp lại.');}finally{if(active.current)setSaving(false);}};
 const discard=async()=>{if(!fixture)await removeDraft(attemptId,task.id);current.current=null;setDraft(null);setError('');};
 const start=async()=>{
  if(lock.current)return;lock.current=true;setOpening(true);setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Trình duyệt này chưa hỗ trợ quay video. Hãy dùng trình duyệt có MediaRecorder trên HTTPS hoặc localhost.');
   const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
   if(!active.current){s.getTracks().forEach(t=>t.stop());return;}
   stream.current=s;if(live.current)live.current.srcObject=s;
   const mime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
   const r=new MediaRecorder(s,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:250000});recorder.current=r;const chunks:Blob[]=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=()=>{s.getTracks().forEach(t=>t.stop());if(timer.current)clearInterval(timer.current);if(active.current){setRecording(false);const blob=new Blob(chunks,{type:r.mimeType});if(!blob.size){setError('Video trống. Hãy quay lại.');return;}void persist({key:draftKey(attemptId,task.id),attemptId,taskId:task.id,uploadRequestId:crypto.randomUUID(),replacesUploadId:submission?.uploadId||undefined,blob,createdAt:Date.now()});}};
   r.onerror=()=>{s.getTracks().forEach(t=>t.stop());if(timer.current)clearInterval(timer.current);if(active.current){setRecording(false);setError('Không quay được video. Hãy thử lại.');}};
   r.start(250);setSeconds(0);setRecording(true);const started=Date.now();
   timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);if(active.current)setSeconds(elapsed);if(elapsed>=maxSeconds&&r.state==='recording')r.stop();},250);
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());if(active.current)setError(errorMessage(e));}
  finally{lock.current=false;if(active.current)setOpening(false);}
 };
 const upload=async()=>{
  let d=current.current;if(!d||lock.current)return;lock.current=true;setUploading(true);setError('');
  try{
   if(d.blob.size>maxBytes)throw new Error(`Video quá lớn. Giới hạn ${Math.floor(maxBytes/1024/1024)} MB, hãy quay lại.`);
   if(!d.uploadedId){const result=await Model.uploadAttemptVideo(attemptId,task.id,new File([d.blob],d.blob.type.includes('mp4')?'practice.mp4':'practice.webm',{type:d.blob.type}),d.uploadRequestId);d={...d,uploadedId:result.uploadId};await persist(d);}
   if(active.current){const feedback=await send(task,{uploadId:d.uploadedId,replacesUploadId:d.replacesUploadId});if(feedback){await discard();}}
  }catch(e){if(active.current)setError(errorMessage(e));}
  finally{lock.current=false;if(active.current)setUploading(false);}
 };
 return <div className="space-y-4"><p className="font-bold">Mục tiêu quay: {task.label||task.id}</p><SubmittedRecording attemptId={attemptId} submission={submission}/>
  <p>Quay tối đa {maxSeconds} giây · tối đa {Math.floor(maxBytes/1024/1024)} MB.</p>
  {restoring&&<p role="status">Đang khôi phục video nháp…</p>}
  <video ref={live} title="Camera xem trước" autoPlay muted playsInline className="aspect-video w-full rounded-2xl bg-gray-900 object-contain"/>
  {recording&&<p role="status">Đang quay {seconds} giây</p>}{url&&!recording&&<VideoPlayer title={`Video đã quay cho ${task.label||task.id}`} videoUrl={url} autoPlay={false} loop={false} provider="file"/>}
  {draft&&!recording&&!fixture&&<p role="status">{saving?'Đang lưu video nháp…':draft.uploadedId?'Video đã tải lên, chưa ghi nhận nộp mục.':'Có video nháp trên thiết bị, chưa nộp.'}</p>}
  {submission?.uploadId&&!draft&&<p>Bạn có thể quay bản thay thế trước khi lưu kết quả hoạt động. Bản cũ vẫn được giữ.</p>}
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={disabled||opening||uploading||restoring||saving} onClick={()=>{if(recording)recorder.current?.stop();else void start();}}>{opening?'Đang mở camera…':recording?'Dừng quay':draft||submission?.uploadId?'Quay lại mục này':'Quay video'}</button>
  {draft&&!recording&&<><button type="button" className={button} disabled={disabled||opening||uploading||saving} onClick={()=>void upload()}>{uploading?'Đang tải…':submission?.uploadId?'Nộp video thay thế':'Nộp video cho mục này'}</button><button type="button" className={button} disabled={uploading||disabled||saving} onClick={()=>void discard().catch(e=>setError(errorMessage(e)))}>Bỏ video nháp của mục này</button></>}</div>
 </div>;
}
