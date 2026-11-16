"use client";
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {TaskPresentation} from '@/domain/entities/Curriculum';
import {CurriculumMediaPlayer as VideoPlayer} from './CurriculumMediaPlayer';
export function LearningItemRenderer({value,replayToken=0,hint=false,compact=false,controls=true}:{value:TaskPresentation;replayToken?:number;hint?:boolean;compact?:boolean;controls?:boolean}){
 const [zoom,setZoom]=useState(false),[angle,setAngle]=useState(0),[failedSource,setFailedSource]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(zoom)dialog.current?.showModal();},[zoom]);
 if(value.missing||(!value.content&&!['mixed','counting'].includes(value.type)))return <div role="status" className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">Chưa có {value.role==='hand_image'?'ảnh bàn tay':value.type==='video'?'video mẫu':'ảnh minh họa'}{value.label?` cho ${value.label}`:''}.</div>;
 if(value.type==='mixed')return <div className="space-y-3">{value.parts?.map((p,i)=><LearningItemRenderer key={i} value={p} compact={compact} controls={controls}/>)}</div>;
 if(value.type==='text')return <span className={`${compact?'text-xl':'text-3xl'} whitespace-pre-wrap font-bold`}>{value.content}</span>;
 if(value.type==='counting')return <div role="img" aria-label={`${value.count} chấm`} className="mx-auto grid max-w-xs gap-2" style={{gridTemplateColumns:`repeat(${Math.ceil((value.count||1)/(value.rows||1))},minmax(0,1fr))`}}>{value.objects?.map(o=><span key={o.id} aria-hidden="true" className="text-center text-2xl">●</span>)}</div>;
 const base=angle>0?value.angles?.[angle-1]||value:value;
 const current=hint&&base.highlightVideo?base.highlightVideo:base;
 const content=()=>current.type==='image'?(failedSource===current.content?<p role="alert" className="rounded-xl bg-amber-50 p-4">Không tải được ảnh {current.label||value.label}. {controls&&<button type="button" className="min-h-11 underline" onClick={()=>setFailedSource('')}>Tải lại ảnh</button>}</p>:<Image unoptimized width={640} height={640} src={current.content!} alt={current.label||value.label||'Tranh minh họa'} onError={()=>setFailedSource(current.content!)} className={`${compact?'h-28':'h-52'} mx-auto w-full object-contain`}/>):<VideoPlayer videoUrl={current.content!} title={current.label} autoPlay={false} showControls={controls} provider="file" playbackRate={hint?0.5:1} replayToken={replayToken}/>;
 return <div className="space-y-2">
  {value.technicalSample&&<p className="rounded bg-slate-100 p-2 text-xs font-semibold">Video kỹ thuật thử trình phát · không phải mẫu ký hiệu</p>}
  {!zoom&&content()}
  {controls&&<div className="flex flex-wrap items-center gap-2">
   <button type="button" aria-label={`Phóng to ${value.label||'học liệu'}`} onClick={()=>setZoom(true)} className="min-h-11 rounded-lg border px-3 text-sm focus-visible:outline-2">＋ Phóng to</button>
   {value.type==='video'&&<button type="button" disabled={!value.angles?.length} onClick={()=>setAngle(i=>(i+1)%((value.angles?.length||0)+1))} className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50">{value.angles?.length?(angle?'Góc chính':'Đổi góc quay'):'Chưa có góc quay khác'}</button>}
  </div>}
  {hint&&!base.highlightVideo&&value.type==='video'&&<p role="status" className="text-sm text-amber-800">Đang xem chậm 0.5×. Chưa có video khoanh vùng ngón tay cho mục này.</p>}
  {zoom&&<dialog ref={dialog} onCancel={()=>setZoom(false)} onClose={()=>setZoom(false)} aria-label={`Phóng to ${value.label||'học liệu'}`} className="fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,900px)] overflow-auto rounded-2xl bg-white p-5 text-gray-900 shadow-2xl backdrop:bg-black/70">
   <button autoFocus type="button" onClick={()=>{dialog.current?.close();setZoom(false);}} className="mb-4 min-h-11 rounded-xl border px-4">Đóng phóng to</button><div className="[&_img]:h-[60vh]">{content()}</div>
  </dialog>}
 </div>;
}

export function CountingPrompt({value,countedIds,onCount,disabled}:{value:TaskPresentation;countedIds:string[];onCount:(id:string)=>void;disabled:boolean}){
 const objects=value.objects||[];const cols=Math.ceil(objects.length/(value.rows||1));
 const button=(object:typeof objects[number],index:number)=>{
  const counted=countedIds.indexOf(object.id);return <button type="button" key={object.id} aria-label={`Đếm vật ${index+1}${counted>=0?' · đã đếm':''}`} aria-pressed={counted>=0} disabled={disabled||counted>=0} onClick={()=>onCount(object.id)} style={value.background?{position:'absolute',left:`${object.x!*100}%`,top:`${object.y!*100}%`,transform:'translate(-50%,-50%)'}:undefined} className={`relative min-h-12 min-w-12 rounded-xl border-2 p-2 focus-visible:outline-4 ${counted>=0?'border-emerald-600 bg-emerald-50':'border-gray-300 bg-white/90 hover:border-primary-500'}`}>
   {!value.background&&<LearningItemRenderer value={object.presentation} compact controls={false}/>}{counted>=0&&<span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 font-black text-white">{counted+1}</span>}
  </button>;
 };
 return <div className="space-y-3"><p className="font-semibold">Chạm từng vật để đếm. Mỗi vật chỉ được tính một lần.</p>
  <div className={value.background?'relative':`grid gap-2`} style={value.background?undefined:{gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`}}>
   {value.background&&<LearningItemRenderer value={value.background}/>} {objects.map(button)}
  </div><p role="status" aria-label="Tiến độ đếm" className="font-bold text-primary-800">Đã đếm: {countedIds.length}</p>
 </div>;
}
