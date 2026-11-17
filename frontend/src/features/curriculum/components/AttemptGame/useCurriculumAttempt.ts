"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Model,{AttemptEvent,AttemptFeedback,AttemptTask,CurriculumActivity,CurriculumAttempt} from '@/domain/entities/Curriculum';

import ReviewModel from '@/domain/entities/CurriculumReview';
import {readDraft} from './recordingDrafts';

interface Saved {requestId:string;attemptId?:string;pending?:AttemptEvent;finalize?:string}
function read(key:string):Saved|null {try {const s=JSON.parse(sessionStorage.getItem(key)||'null');return s&&typeof s.requestId==='string'?s:null;}catch{return null;}}
function owner(){return String(JSON.parse(localStorage.getItem('user')||'null')?.user_id||JSON.parse(localStorage.getItem('user')||'null')?.id||'session');}
export const errorMessage=(e:unknown)=>{const x=e as {response?:{data?:{message?:string};status?:number};message?:string};return x.response?.data?.message||x.message||'Không kết nối được. Hãy thử lại thao tác.';};
const permanent=(e:unknown)=>[400,403,404,409,422].includes((e as {response?:{status:number}}).response?.status||0);
export function taskDone(attempt:CurriculumAttempt,task:AttemptTask){
 const answers=attempt.answers.filter(a=>a.taskId===task.id);
 return answers.some(a=>a.terminal===true||a.correct===true||a.reviewStatus==='pending_review')||(attempt.config.runtime_version!==2&&task.kind==='choice'&&answers.length>0);
}
async function assertNoRecordingDrafts(attempt:CurriculumAttempt){
 if(!attempt.recording)return;
 for(const task of attempt.config.tasks){const draft=await readDraft(attempt.attemptId,task.id);if(draft){const item=attempt.recording.items.find(i=>i.taskId===task.id);if(!item?.history.some(h=>h.uploadId===(draft.uploadedId||draft.uploadRequestId)))throw new Error(`Còn video nháp chưa nộp cho ${task.label||task.id}. Hãy nộp hoặc bỏ bản nháp trước khi lưu kết quả hoặc bắt đầu lượt mới.`);}}
}
export function useCurriculumAttempt({activityCode,activity,classPracticeId,initialAttemptId,onComplete}:{activityCode:string;activity?:CurriculumActivity;classPracticeId?:string;initialAttemptId?:string;onComplete?:()=>void}){
 const [attempt,setAttempt]=useState<CurriculumAttempt|null>(null),[title,setTitle]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const generation=useRef(0),lock=useRef(false),key=useRef(''),user=useRef('');
 const canonical=(account:string,id:string)=>`curriculum:g1:${account}:attempt-${id}`;
 const currentState=()=>{const s=read(key.current);return s?.attemptId?read(canonical(user.current,s.attemptId))||s:s;};
 const load=useCallback(async(fresh=false)=>{
  const run=++generation.current;setBusy(true);setError('');setAttempt(null);
  try{
   const meta=classPracticeId||initialAttemptId?null:activity||await Model.getActivityByCode(activityCode);if(run!==generation.current)return;
   const account=owner();user.current=account;
   // Preserve G1 sessions, including an in-flight event, across the G2 update.
   const storageKey=`curriculum:g1:${account}:${initialAttemptId?'attempt-'+initialAttemptId:classPracticeId?'class-'+classPracticeId:meta!.activity_id}`;key.current=storageKey;
   let previous=read(storageKey);const id=initialAttemptId||previous?.attemptId;
   if(id){const saved=read(canonical(account,id));if(saved)previous=saved;else for(const k of Object.keys(sessionStorage).filter(k=>k.startsWith(`curriculum:g1:${account}:`))){const old=read(k);if(old?.attemptId===id&&(old.pending||old.finalize)){previous=old;break;}}}
   const state:Saved=(!fresh&&previous)||{requestId:crypto.randomUUID(),...(initialAttemptId?{attemptId:initialAttemptId}:{})};
   const save=()=>{sessionStorage.setItem(storageKey,JSON.stringify(state));if(state.attemptId)sessionStorage.setItem(canonical(account,state.attemptId),JSON.stringify(state));};save();
   let next=state.attemptId?await Model.getAttempt(state.attemptId):classPracticeId?await ReviewModel.startPractice(classPracticeId,state.requestId):await Model.startAttempt(meta!.activity_id,state.requestId);
   state.attemptId=next.attemptId;save();if(run!==generation.current)return;
   try{
    if(state.pending){await Model.answerAttempt(next.attemptId,state.pending);delete state.pending;save();next=await Model.getAttempt(next.attemptId);}
    if(run!==generation.current)return;
    if(state.finalize){await Model.submitAttempt(next.attemptId,state.finalize);delete state.finalize;save();next=await Model.getAttempt(next.attemptId);}
   }catch(e){if(permanent(e)){delete state.pending;delete state.finalize;save();}throw e;}
   if(run===generation.current){setAttempt(next);setTitle(next.config.title||meta?.title||'Thực hành ký hiệu');}
  }catch(e){if(run===generation.current)setError(errorMessage(e));}
  finally{if(run===generation.current)setBusy(false);}
 },[activity,activityCode,classPracticeId,initialAttemptId]);
 useEffect(()=>{const requests=generation;void load();return()=>{requests.current++;};},[load]);
 const operate=async<T,>(fn:(state:Saved,save:()=>void)=>Promise<T>):Promise<T|undefined>=>{
  if(lock.current||!attempt)return;lock.current=true;setBusy(true);setError('');const run=generation.current,storageKey=key.current;
  const state=currentState(),account=user.current,save=()=>{sessionStorage.setItem(storageKey,JSON.stringify(state));if(state?.attemptId)sessionStorage.setItem(canonical(account,state.attemptId),JSON.stringify(state));};
  try{
   if(owner()!==user.current)throw new Error('Tài khoản đã thay đổi. Hãy tải lại trang.');
   if(!state||state.attemptId!==attempt.attemptId)throw new Error('Phiên lưu đã thay đổi. Hãy tải lại trang.');
   if(state.pending||state.finalize)throw new Error('Có thao tác chưa lưu xong. Hãy chọn Thử lại thao tác.');
   const result=await fn(state,save),next=await Model.getAttempt(attempt.attemptId);
   if(run!==generation.current)return;
   setAttempt(next);if(next.result?.isCompleted)onComplete?.();return result;
  }catch(e){if(permanent(e)&&state){delete state.pending;delete state.finalize;save();}if(run===generation.current)setError(errorMessage(e));}
  finally{lock.current=false;if(run===generation.current)setBusy(false);}
 };
 const send=(task:AttemptTask,input:Omit<AttemptEvent,'eventId'|'taskId'>):Promise<AttemptFeedback|undefined>=>operate(async(state,save)=>{
  const event={...input,taskId:task.id,eventId:crypto.randomUUID()};state.pending=event;save();
  const result=await Model.answerAttempt(attempt!.attemptId,event);delete state.pending;save();return result;
 });
 const submit=()=>operate(async(state,save)=>{await assertNoRecordingDrafts(attempt!);state.finalize=`submit_${attempt!.attemptId}`;save();const result=await Model.submitAttempt(attempt!.attemptId,state.finalize);delete state.finalize;save();return result;});
 const restart=async()=>{if(initialAttemptId)return;const state=currentState();if(lock.current||state?.pending||state?.finalize){setError('Có thao tác chưa lưu xong. Hãy chọn Thử lại thao tác.');return;}try{if(attempt)await assertNoRecordingDrafts(attempt);await load(true);}catch(e){setError(errorMessage(e));}};
 return {attempt,title,busy,error,send,submit,retry:()=>load(),reload:load,restart,canRestart:!initialAttemptId,pendingOperation:!!(currentState()?.pending||currentState()?.finalize)};
}
