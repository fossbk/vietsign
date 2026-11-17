"use client";
import type {CompoundContent} from '@/domain/entities/Curriculum';
import {LearningItemRenderer} from './LearningItemRenderer';
export function CompoundLearning({content,taskIds}:{content:CompoundContent;taskIds?:string[]}){
 return <section aria-label="Toàn bộ nội dung nhóm" className="space-y-4 rounded-2xl border bg-white p-4">
  <h2 className="text-xl font-bold">{content.kind==='dialogue'?'Toàn bộ hội thoại':'Các câu trong nhóm'} · {content.variantCode}</h2>
  <p className="rounded-xl bg-amber-50 p-3">Phương án nháp chờ duyệt D07. Chưa có video mẫu câu/hội thoại đã xác minh.</p>
  {content.practiceSpeaker&&<p role="note" className="font-bold">Vai được giao: {content.practiceSpeaker}. Các vai khác giữ lại để theo dõi hội thoại.</p>}
  <details><summary className="min-h-11 cursor-pointer font-bold">Xem mẫu toàn phần</summary><LearningItemRenderer value={content.model}/></details>
  <ol className="space-y-3">{content.units.map(unit=><li key={unit.id} className="rounded-xl border p-3">
   <p className="text-sm font-bold text-gray-600">{content.kind==='dialogue'?`Lượt ${unit.order} · ${unit.speaker||'Chưa xác định người nói'}`:`Câu ${unit.order}`}{taskIds&&!taskIds.includes(unit.id)?' · Ngữ cảnh':''}</p>
   <p className="whitespace-pre-wrap text-lg">{unit.text}</p>{unit.blockedReason&&<p role="note" className="text-amber-900">{unit.blockedReason}</p>}
  </li>)}</ol>
 </section>;
}
