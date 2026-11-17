"use client";
import {useRef,useState} from 'react';import Link from 'next/link';
import {CurriculumAttempt} from '@/domain/entities/Curriculum';import Model from '@/domain/entities/CurriculumReview';import {button} from './GameViews';import {errorMessage} from './useCurriculumAttempt';
export function FeedbackPanel({attempt,reload}:{attempt:CurriculumAttempt;reload:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef<string|null>(null);const review=attempt.review;if(!review)return null;
 if(review.scope==='self_study_draft')return <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4">Bài tự học giữ ở bản nháp; chưa phân công người chấm. Video và lịch sử của bạn vẫn được lưu.</p>;
 const resubmit=async()=>{setBusy(true);setError('');request.current ||= crypto.randomUUID();try{const child=await Model.resubmit(attempt.attemptId,request.current);window.location.assign(`/curriculum/attempts/${child.attemptId}`);}catch(e){setError(errorMessage(e));setBusy(false);}};
 return <section aria-label="Nhận xét của giáo viên" className="space-y-3 rounded-xl border border-blue-300 bg-blue-50 p-4"><h3 className="font-bold">Nhận xét từng mục · Lớp {review.classId}</h3><p>Nhận xét cho lượt thực hành nháp, chưa quy đổi điểm hoặc sao chính thức.</p>
  {review.status==='superseded'&&<p role="status">Yêu cầu làm lại đã thay đổi. Hãy mở bài gốc để xem hướng dẫn mới.</p>}
  {review.status==='resubmitted'&&<p role="status">Đã có lần nộp lại. Xem nhận xét mới ở lần nộp đó.</p>}
  <button type="button" className={button} disabled={busy} onClick={()=>void reload()}>Tải lại nhận xét</button>
  {review.items.filter(i=>i.history.length).map(item=>{const latest=item.history.at(-1)!;return <details key={item.taskId} className="rounded-lg border bg-white p-3" open={item.status==='needs_revision'}><summary className="cursor-pointer font-bold">{attempt.config.tasks.find(t=>t.id===item.taskId)?.label} · {item.status==='needs_revision'?'Cần làm lại':'Giáo viên ghi nhận đạt (nháp)'}</summary><p className="whitespace-pre-wrap">{latest.comment||'Giáo viên đã ghi nhận mục này.'}</p><p>{latest.reviewerName} · {new Date(latest.createdAt).toLocaleString('vi-VN')}</p><details><summary>Lịch sử nhận xét ({item.history.length})</summary>{item.history.map(r=><p key={r.reviewId} className="whitespace-pre-wrap border-t py-2">{r.reviewerName}: {r.verdict==='needs_revision'?'Cần làm lại':'Ghi nhận đạt'} — {r.comment}</p>)}</details></details>;})}
  {review.canResubmit&&<button type="button" className={button} disabled={busy} onClick={()=>void resubmit()}>{busy?'Đang mở lần nộp lại…':'Nộp lại các mục cần làm lại'}</button>}
  {review.parentAttemptId&&<Link className="block underline" href={`/curriculum/attempts/${review.parentAttemptId}`}>Xem bài gốc và nhận xét trước</Link>}
  {review.childAttempts?.map((child,index)=><Link key={child.attemptId} className="block underline" href={`/curriculum/attempts/${child.attemptId}`}>Xem lần nộp lại {index+1} · {child.status==='finalized'?'Đã nộp':'Đang làm'}</Link>)}
  {review.practiceId&&<Link className="block underline" href={`/curriculum/class-practice/${review.practiceId}`}>Về thực hành trong lớp</Link>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
