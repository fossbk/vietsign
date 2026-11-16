"use client";
import {useEffect,useRef,useState} from "react";
import Model,{AttemptTask} from "@/domain/entities/Curriculum";
import {button} from "./GameViews";
import {errorMessage as message} from "./useCurriculumAttempt";
export function Recorder({attemptId,task,disabled,onUpload}:{attemptId:string;task:AttemptTask;disabled:boolean;onUpload:(id:string)=>Promise<void>}){
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
