"use client";
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AttemptEvent,AttemptFeedback,AttemptTask,CurriculumAttempt} from '@/domain/entities/Curriculum';
import {CountingPrompt,LearningItemRenderer} from './LearningItemRenderer';
import {taskDone} from './useCurriculumAttempt';

export type Answer=AttemptFeedback&{eventId:string;taskId:string};
export type Send=(task:AttemptTask,input:Omit<AttemptEvent,'eventId'|'taskId'>)=>Promise<AttemptFeedback|undefined>;
export interface GameProps {attempt:CurriculumAttempt;tasks:AttemptTask[];busy:boolean;send:Send}
export const button='min-h-12 rounded-xl border-2 border-primary-300 bg-white px-4 py-3 font-bold transition-colors hover:bg-primary-50 focus-visible:outline-4 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
const latest=(a:CurriculumAttempt,id:string)=>a.answers.filter(r=>r.taskId===id).at(-1);

/** Mouse drag, touch drag and keyboard tap-to-place share one target action. */
export function TransferButton({label,disabled,onSelect,onDrop,onDragBegin,dragValue,children}:{label:string;disabled:boolean;onSelect:()=>void;onDrop:(id:string)=>void;onDragBegin?:()=>void;dragValue?:string;children?:React.ReactNode}){
 const gesture=useRef<{x:number;y:number;dragged:boolean}|null>(null);
 return <button type="button" aria-label={label} disabled={disabled} draggable={!disabled} onDragStart={e=>{e.dataTransfer.setData('text/plain',label);if(dragValue)e.dataTransfer.setData('application/vietsign-transfer',dragValue);(onDragBegin||onSelect)();}} onPointerDown={e=>{if(e.pointerType==='touch'){gesture.current={x:e.clientX,y:e.clientY,dragged:false};e.currentTarget.setPointerCapture(e.pointerId);}}}
  onPointerMove={e=>{if(gesture.current&&Math.hypot(e.clientX-gesture.current.x,e.clientY-gesture.current.y)>8)gesture.current.dragged=true;}}
  onPointerCancel={()=>{gesture.current=null;}}
  onPointerUp={e=>{const g=gesture.current;if(g?.dragged){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-drop-id]');if(target?.dataset.dropId)onDrop(target.dataset.dropId);e.preventDefault();}}}
  onClick={()=>{if(!gesture.current?.dragged)onSelect();gesture.current=null;}}
  className={`${button} touch-none`}>{children||label}</button>;
}
export function FlipCards({attempt,tasks,busy,send}:GameProps){
 const [open,setOpen]=useState<Set<string>>(new Set());
 return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tasks.map(t=><article key={t.id} className={`space-y-3 rounded-2xl border-2 bg-white p-4 ${taskDone(attempt,t)?'border-emerald-500':'border-gray-200'}`}>
  <h3 className="font-bold">{t.label||t.id}{taskDone(attempt,t)?' · ✓ Đã xem':''}</h3>
  {open.has(t.id)?<LearningItemRenderer value={t.sample||t.prompt}/>:<LearningItemRenderer value={t.prompt}/>}
  <button type="button" className={`${button} w-full`} disabled={busy} onClick={()=>{
   const opening=!open.has(t.id);setOpen(prev=>{const next=new Set(prev);if(opening)next.add(t.id);else next.delete(t.id);return next;});
   if(opening&&!taskDone(attempt,t)&&!t.sample?.missing)void send(t,{action:'view'});
  }}>{open.has(t.id)?'Úp thẻ':`Lật thẻ ${t.label||t.id}`}</button>
 </article>)}</div>;
}
export function MatchingBoard({attempt,tasks,busy,send}:GameProps){
 const [selected,setSelected]=useState<string|null>(null);const box=useRef<HTMLDivElement>(null);const left=useRef<Record<string,HTMLElement|null>>({}),right=useRef<Record<string,HTMLElement|null>>({});
 const [lines,setLines]=useState<Array<{key:string;d:string}>>([]);const puzzle=attempt.config.game_type==='JigsawPuzzleGame';
 const options=tasks[0]?.options||[];const solved=tasks.filter(t=>taskDone(attempt,t));const selectedTask=tasks.find(t=>t.id===selected);
 const matches=solved.map(t=>({task:t,answer:attempt.answers.filter(a=>a.taskId===t.id&&a.correct).at(-1)}));
 const used=new Set(matches.flatMap(m=>m.answer?.choiceIds||[]));
 const key=matches.map(m=>`${m.task.id}:${m.answer?.choiceIds?.[0]}`).join('|');
 useLayoutEffect(()=>{
  const container=box.current;if(!container||puzzle)return;
  const update=()=>{const outer=container.getBoundingClientRect();setLines(tasks.flatMap(t=>{
   const answer=attempt.answers.filter(a=>a.taskId===t.id&&a.correct).at(-1);const target=answer?.choiceIds?.[0];if(!target)return [];
   const l=left.current[t.id]?.getBoundingClientRect(),r=right.current[target]?.getBoundingClientRect();if(!l||!r)return [];
   return [{key:t.id,d:`M ${l.right-outer.left} ${l.top+l.height/2-outer.top} C ${outer.width/2} ${l.top+l.height/2-outer.top}, ${outer.width/2} ${r.top+r.height/2-outer.top}, ${r.left-outer.left} ${r.top+r.height/2-outer.top}`}];
  }));};update();const observer=new ResizeObserver(update);observer.observe(container);return()=>observer.disconnect();
 // Position the verified links again when their target IDs or board size change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,puzzle]);
 const connect=async(t:AttemptTask,id:string)=>{const result=await send(t,{choiceIds:[id]});if(result)setSelected(null);};
 return <div className="space-y-4">
  <p>{puzzle?'Chọn hoặc kéo một mảnh hình sang mảnh từ tương ứng. Ghép sai, mảnh vẫn ở vị trí cũ.':'Chọn một thẻ bên trái rồi chọn thẻ tương ứng bên phải.'}</p>
  <div ref={box} className="relative grid grid-cols-2 gap-x-5 gap-y-4 md:gap-x-14">
   {!puzzle&&<svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">{lines.map(l=><path key={l.key} d={l.d} fill="none" stroke="#059669" strokeWidth="3"/>)}</svg>}
   <div className="space-y-3">{tasks.map(t=><article ref={el=>{left.current[t.id]=el;}} key={t.id} className={`relative space-y-2 border-2 bg-white p-3 ${puzzle?'rounded-l-3xl border-dashed':'rounded-xl'} ${selected===t.id?'border-primary-600 ring-2 ring-primary-200':taskDone(attempt,t)?'border-emerald-600 bg-emerald-50':'border-gray-200'}`}>
    {puzzle&&<span aria-hidden="true" className={`absolute -right-3 top-1/2 h-6 w-6 rounded-full border-2 border-dashed ${taskDone(attempt,t)?'border-emerald-600 bg-emerald-50':'border-gray-300 bg-white'}`}/>}
    <LearningItemRenderer value={t.prompt} compact/>
    {puzzle&&taskDone(attempt,t)&&<p className="rounded-r-2xl bg-emerald-100 p-3 font-bold">✓ Hai mảnh đã ghép: {options.find(o=>o.id===matches.find(m=>m.task.id===t.id)?.answer?.choiceIds?.[0])?.presentation.content||t.label}</p>}
    <TransferButton label={`Chọn vế trái ${t.label||t.id}`} dragValue={t.id} disabled={busy||taskDone(attempt,t)} onDragBegin={()=>{}} onSelect={()=>setSelected(t.id)} onDrop={id=>{void connect(t,id);}}>{taskDone(attempt,t)?'✓ Đã ghép':selected===t.id?'Đang chọn':'Chọn / kéo mảnh'}</TransferButton>
   </article>)}</div>
   <div className="space-y-3">{options.map(o=><article ref={el=>{right.current[o.id]=el;}} key={o.id} data-drop-id={o.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const source=tasks.find(t=>t.id===e.dataTransfer.getData('application/vietsign-transfer'))||selectedTask;if(source&&!used.has(o.id)&&!taskDone(attempt,source))void connect(source,o.id);}} className={`space-y-2 border-2 bg-white p-3 ${puzzle?'rounded-r-3xl border-dashed':'rounded-xl'} ${used.has(o.id)?'border-emerald-600 bg-emerald-50':'border-gray-200'}`}>
    <LearningItemRenderer value={o.presentation} compact/>
    <button type="button" className={button} disabled={busy||used.has(o.id)} aria-disabled={!selectedTask||busy||used.has(o.id)} onClick={()=>{if(selectedTask)void connect(selectedTask,o.id);}} aria-label={`Ghép với ${o.presentation.label||o.presentation.content||'thẻ phải'}`}>{used.has(o.id)?'✓ Hai mảnh đã ghép':'Ghép vào đây'}</button>
   </article>)}</div>
  </div>
  {solved.length>0&&<p role="status">Đã ghép đúng {solved.length}/{tasks.length} cặp.</p>}
 </div>;
}
export function TaskSteps({attempt,tasks,busy,children}:GameProps&{children:(task:AttemptTask,index:number)=>React.ReactNode}){
 const [index,setIndex]=useState(()=>{const n=tasks.findIndex(t=>!taskDone(attempt,t));return n<0?0:n;});const current=tasks[index];
 return <div className="space-y-4"><p className="font-bold">Mục {index+1}/{tasks.length}</p>{children(current,index)}
  <div className="flex justify-between gap-3"><button type="button" className={button} disabled={busy||index===0} onClick={()=>setIndex(i=>i-1)}>← Mục trước</button>
  {index<tasks.length-1&&<button type="button" className={button} disabled={busy||!taskDone(attempt,current)} onClick={()=>setIndex(i=>i+1)}>Mục tiếp theo →</button>}</div>
 </div>;
}
export function QuizTask({attempt,task,busy,send}:Omit<GameProps,'tasks'>&{task:AttemptTask}){
 const [selected,setSelected]=useState<string|null>(null);const last=latest(attempt,task.id);const done=taskDone(attempt,task);const counted=[...new Set(attempt.answers.filter(a=>a.taskId===task.id).flatMap(a=>a.countedIds||[]))];
 const hint=last?.correct===false&&!done;const ready=!task.requireCount||counted.length===task.prompt.count;
 return <div className="space-y-5">
  {task.prompt.type==='counting'&&!task.prompt.missing?<CountingPrompt value={task.prompt} countedIds={counted} onCount={id=>{void send(task,{action:'count',objectId:id});}} disabled={busy||done}/>:<LearningItemRenderer value={task.prompt} hint={hint} replayToken={hint?(last?.tries||0):0}/>}
  <fieldset disabled={busy||done||!ready} className="grid gap-4 md:grid-cols-3"><legend className="mb-3 font-semibold">{ready?'Chọn đáp án phù hợp':'Đếm đủ các vật trước khi chọn đáp án'}</legend>
   {task.options?.map(o=><article key={o.id} className={`space-y-3 rounded-2xl border-2 bg-white p-3 ${last?.correctOptionIds?.includes(o.id)?'border-emerald-600':selected===o.id?'border-primary-600 ring-2 ring-primary-100':'border-gray-200'}`}>
    <LearningItemRenderer value={o.presentation} hint={hint&&last?.choiceIds?.includes(o.id)} replayToken={hint&&last?.choiceIds?.includes(o.id)?last.tries||0:0}/>
    <button type="button" aria-pressed={selected===o.id} aria-label={`Chọn đáp án ${o.presentation.label||o.presentation.content||o.id}`} className={`${button} w-full`} onClick={()=>setSelected(o.id)}>{last?.correctOptionIds?.includes(o.id)?'✓ Đáp án đúng':selected===o.id?'Đã chọn':'Chọn thẻ này'}</button>
   </article>)}
  </fieldset>
  {!done&&<button type="button" className={`${button} w-full`} disabled={busy||!selected||!ready} onClick={()=>{if(selected)void send(task,{choiceIds:[selected]});}}>Kiểm tra đáp án</button>}
  {last?.remainingTries!==undefined&&last.remainingTries!==null&&!done&&<p>Còn {last.remainingTries} lần chọn.</p>}
  {last?.exhausted&&<p role="status">Đã hết lượt chọn. Hãy xem đáp án được đánh dấu rồi tiếp tục.</p>}
 </div>;
}
export function SequenceTask({attempt,task,busy,send}:Omit<GameProps,'tasks'>&{task:AttemptTask}){
 const answers=attempt.answers.filter(a=>a.taskId===task.id);const last=answers.at(-1);
 const locked={...task.fixedOptions,...(task.keepCorrect?Object.assign({},...answers.map(a=>a.lockedOptions||{})):{})} as Record<number,string>;
 const draftKey=`curriculum:g2:draft:${attempt.attemptId}:${task.id}`;
 const [slots,setSlots]=useState<Array<string|null>>(()=>{
  let draft:Array<string|null>=[];try{const value=JSON.parse(sessionStorage.getItem(draftKey)||'[]');if(Array.isArray(value)&&value.length===task.options?.length&&value.every(id=>id===null||task.options?.some(o=>o.id===id))&&new Set(value.filter(Boolean)).size===value.filter(Boolean).length)draft=value;}catch{}
  return task.options?.map((_,i)=>locked[i]||draft[i]||last?.choiceIds?.[i]||null)||[];
 });const [selected,setSelected]=useState<string|null>(null);
 const done=taskDone(attempt,task);const place=(id:string,index?:number)=>{if(busy||done)return;setSlots(prev=>{const next=prev.map((old,i)=>locked[i]||old);const target=index??next.findIndex(v=>v===null);if(target<0||locked[target]||next.includes(id))return next;next[target]=id;return next;});setSelected(null);};
 const options=task.options||[];
 useEffect(()=>{if(done)sessionStorage.removeItem(draftKey);else sessionStorage.setItem(draftKey,JSON.stringify(slots));},[draftKey,done,slots]);
 return <div className="space-y-5"><LearningItemRenderer value={task.prompt}/><p>Chọn hoặc kéo thẻ vào ô trống. Các ô có khóa sẽ được giữ lại.</p>
  <div className="flex flex-wrap items-end gap-2">{slots.map((id,index)=><div key={index} style={task.staircase?{paddingBottom:Math.min(index*7,63)}:undefined}>
   <div data-drop-id={String(index)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const dragged=e.dataTransfer.getData('application/vietsign-option');if(dragged)place(dragged,index);else if(selected)place(selected,index);}} className={`min-w-20 space-y-2 rounded-xl border-2 border-dashed p-2 ${locked[index]?'border-emerald-600 bg-emerald-50':''}`}>
    {id&&<LearningItemRenderer value={options.find(o=>o.id===id)!.presentation} compact/>}
    <button type="button" aria-label={`Ô ${index+1}${locked[index]?' cố định':''}`} disabled={busy||done||!!locked[index]} onClick={()=>{if(selected)place(selected,index);else setSlots(v=>v.map((value,i)=>i===index?null:value));}} className={button}>{locked[index]?'🔒 ':''}Ô {index+1}{id&&!locked[index]?' · Lấy thẻ ra':''}</button>
   </div>
  </div>)}</div>
  <div className="flex flex-wrap gap-3">{options.filter(o=>!slots.includes(o.id)).map(o=><div key={o.id} draggable={!busy&&!done} onDragStart={e=>{e.dataTransfer.setData('application/vietsign-option',o.id);setSelected(o.id);}}>
   <LearningItemRenderer value={o.presentation} compact/><TransferButton label={`Chọn thẻ ${o.presentation.label||o.presentation.content}`} disabled={busy||done} onDragBegin={()=>setSelected(o.id)} onSelect={()=>{setSelected(o.id);place(o.id);}} onDrop={slot=>place(o.id,Number(slot))}>Chọn thẻ {o.presentation.label||o.presentation.content}</TransferButton>
  </div>)}</div>
  {!done&&<button type="button" className={button} disabled={busy||slots.includes(null)} onClick={()=>{void send(task,{choiceIds:slots as string[]});}}>Kiểm tra thứ tự</button>}
  {last?.correct===false&&task.keepCorrect&&<p role="status">Các ô đúng được khóa. Chạm ô sai để lấy thẻ ra rồi xếp lại.</p>}
 </div>;
}
export function BucketBoard({attempt,tasks,busy,send}:GameProps){
 const blocked=tasks.filter(t=>t.blockedReason);const pending=<>{blocked.map(t=><p key={t.id} role="status" className="rounded-xl border border-amber-400 bg-amber-50 p-4"><strong>{t.label}</strong>: {t.blockedReason}</p>)}</>;
 const task=tasks.find(t=>!t.blockedReason&&!taskDone(attempt,t));if(!task)return <div className="space-y-3"><p className="rounded-xl bg-emerald-50 p-5 font-bold">{blocked.length?'Đã xử lý các mục có giỏ; còn mục chờ biên tập.':'✓ Đã phân loại đủ các thẻ trong lượt.'}</p>{pending}</div>;
 const choose=(id:string)=>{void send(task,{choiceIds:[id]});};const last=latest(attempt,task.id);
 return <div className="space-y-5"><p>Chạm vào giỏ hoặc kéo thẻ vào giỏ tương ứng.</p><article className={`mx-auto max-w-md space-y-3 rounded-2xl border-2 bg-white p-4 ${last?.correct===false?'border-amber-500':'border-gray-200'}`}>
  <LearningItemRenderer value={task.prompt}/>{task.sample&&<LearningItemRenderer value={task.sample}/>}<TransferButton label={`Kéo thẻ ${task.label}`} disabled={busy} onSelect={()=>{}} onDrop={choose}>↕ Kéo thẻ {task.label}</TransferButton>
 </article>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{task.options?.map(o=><button type="button" key={o.id} data-drop-id={o.id} className={`${button} min-h-32 rounded-b-3xl border-4`} aria-label={`Giỏ ${o.presentation.content}`} disabled={busy} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(o.id);}} onClick={()=>choose(o.id)}><span className="block text-3xl" aria-hidden="true">🧺</span><LearningItemRenderer value={o.presentation} compact controls={false}/></button>)}</div>
 {last?.correct===false&&<p role="status" className="text-amber-800">Chưa đúng. Thẻ được giữ lại để bạn thử giỏ khác.</p>}
 {pending}
 </div>;
}
export function MemoryBoard({attempt,task,busy,send}:Omit<GameProps,'tasks'>&{task:AttemptTask}){
 const last=latest(attempt,task.id);const [hiddenEvent,setHiddenEvent]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const revealed=last?.pairMatched===false&&hiddenEvent!==last.eventId?last.revealedIds||[]:[];
 useEffect(()=>{
  if(timer.current)clearTimeout(timer.current);
  if(last?.revealedIds&&last.pairMatched===false)timer.current=setTimeout(()=>setHiddenEvent(last.eventId),1000);
  return()=>{if(timer.current)clearTimeout(timer.current);};
 },[last?.eventId,last?.pairMatched,last?.revealedIds]);
 const matched=last?.matchedIds||[];const open=[...(last?.openCardId?[last.openCardId]:[]),...revealed];
 return <div className="space-y-4"><p className="font-bold" role="status">Đã ghép {matched.length/2}/{task.pairCount} cặp · {last?.moves||0} lượt lật</p><p>Chọn hai thẻ để tìm cặp tương ứng. Không có đếm ngược.</p>
 <div className="grid grid-cols-3 gap-3 md:grid-cols-4">{task.cards?.map((card,i)=>{const face=matched.includes(card.id)||open.includes(card.id);return <article key={card.id} className={`flex min-h-36 flex-col justify-center rounded-2xl border-2 p-3 ${matched.includes(card.id)?'border-emerald-600 bg-emerald-50':'border-primary-200 bg-white'}`}>
  {face?<><LearningItemRenderer value={card.presentation} compact/><span className="mt-2 text-center text-sm">{matched.includes(card.id)?'✓ Đã tìm cặp':'Đang xem'}</span></>:<button type="button" aria-label={`Lật thẻ ${i+1}`} className={`${button} min-h-28 text-4xl`} disabled={busy||revealed.length>0||taskDone(attempt,task)} onClick={()=>{void send(task,{action:'flip',cardId:card.id});}}>🃏</button>}
 </article>;})}</div></div>;
}
