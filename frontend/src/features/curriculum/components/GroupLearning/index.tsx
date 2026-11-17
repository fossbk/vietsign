"use client";
import {useEffect,useState} from 'react';import Link from 'next/link';
import Model,{CurriculumGroup,CurriculumGroupDetail} from '@/domain/entities/Curriculum';
import {CompoundLearning} from '../AttemptGame/CompoundLearning';import {AttemptGame} from '../AttemptGame';import {button} from '../AttemptGame/GameViews';import {errorMessage} from '../AttemptGame/useCurriculumAttempt';
export function GroupLearningList(){
 const [groups,setGroups]=useState<CurriculumGroup[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;void Model.getGroups().then(r=>{if(active)setGroups(r);}).catch(e=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[]);
 const visible=groups;
 return <section aria-label="Câu và hội thoại theo nhóm" className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="text-xl font-bold">Câu và hội thoại theo nhóm B1–B10</h2><p>Nội dung đang biên soạn. Học sinh vào lượt thực hành do giáo viên giao trong lớp.</p>{error&&<p role="alert">{error}</p>}{!visible&&!error&&<p role="status">Đang tải nhóm…</p>}<div className="grid gap-3 sm:grid-cols-2">{visible?.map(g=><article key={g.group_code} className="space-y-2 rounded-xl border p-4"><h3 className="font-bold">{g.title}</h3><p>{g.variants} phương án nháp · Chờ duyệt D07</p><p className="text-sm">Các phương án chưa được coi là yêu cầu hoàn thành chính thức.</p>{g.can_preview&&<Link href={`/curriculum/groups/${g.group_code}`} className="inline-block min-h-11 py-3 underline">Đối chiếu {g.title}</Link>}</article>)}</div></section>;
}
export function GroupLearningDetail({groupCode}:{groupCode:string}){
 const [group,setGroup]=useState<CurriculumGroupDetail|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState(''),[preview,setPreview]=useState(false);
 useEffect(()=>{let active=true;void Model.getGroup(groupCode).then(r=>{if(active)setGroup(r);}).catch(e=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[groupCode]);
 const variant=group?.variants.find(v=>v.activityCode===selected);
 return <main className="mx-auto max-w-5xl space-y-5 p-4"><Link href="/curriculum" className="underline">Về chương trình ký hiệu</Link><h1 className="text-2xl font-bold">{group?.title||'Câu và hội thoại theo nhóm'}</h1>{error&&<p role="alert">{error}</p>}{!group&&!error&&<p role="status">Đang tải nội dung…</p>}{group&&<>
  <p role="note">F: câu; G/H: hội thoại. Các phương án nguồn và đề xuất giữ riêng, chưa có phương án chính thức. Chọn phương án để đối chiếu; giao thử cho lớp tại trang nhận xét.</p>
  <label className="block font-bold">Phương án nháp<select aria-label="Phương án nháp" value={selected} onChange={e=>{setSelected(e.target.value);setPreview(false);}} className="mt-2 min-h-11 w-full rounded border p-3"><option value="">Chọn phương án để đối chiếu</option>{group.variants.map(v=><option key={v.activityCode} value={v.activityCode}>{v.title}{v.assignable?'':' · Chỉ xem để duyệt'}</option>)}</select></label>
  {variant&&<section key={variant.activityCode} className="space-y-4"><p>Phiên bản {variant.versionId} · {variant.assignable?'Có thể giao thử ở trạng thái nháp':'Chưa đủ điều kiện giao thực hành'}</p><CompoundLearning content={variant.source}/>
   <details className="rounded-xl border bg-white p-4"><summary className="min-h-11 cursor-pointer font-bold">Đối chiếu nguyên văn cột {variant.sourceColumn}</summary><pre className="whitespace-pre-wrap break-words font-sans">{variant.source.sourceRaw}</pre>{variant.source.notes?.map((n,i)=><p key={i} className="mt-3 rounded bg-amber-50 p-3">Ghi chú dòng {n.sourceLine}: {n.text}</p>)}</details>
   {variant.assignable?<button type="button" className={button} onClick={()=>setPreview(p=>!p)}>{preview?'Đóng lượt xem thử':'Mở lượt xem thử'}</button>:<p role="note">Cần chốt lời thoại/người nói trước khi quay. Nội dung được giữ nguyên để duyệt.</p>}
   {preview&&<AttemptGame key={variant.activityCode} activityCode={variant.activityCode}/>}
   <Link href="/grading/curriculum" className="block min-h-11 py-3 underline">Giao thực hành nháp cho lớp</Link>
  </section>}
 </>}
 </main>;
}
