"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ReviewModel,{ClassPractice} from '@/domain/entities/CurriculumReview';
import {errorMessage} from '../AttemptGame/useCurriculumAttempt';
export function ClassPracticeList(){
 const [items,setItems]=useState<ClassPractice[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;ReviewModel.practices().then(rows=>{if(active){setItems(rows);setError('');}}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[reload]);
 if(loading)return <p role="status">Đang tải bài thực hành trong lớp…</p>;
 if(error)return <div role="alert"><p>{error}</p><button type="button" onClick={()=>{setLoading(true);setReload(n=>n+1);}}>Thử lại bài trong lớp</button></div>;
 if(!items.length)return null;
 return <section aria-label="Bài thực hành trong lớp" className="mb-6 rounded-2xl border bg-white p-5"><h2 className="mb-3 text-lg font-bold">Bài thực hành trong lớp</h2><ul className="space-y-3">{items.map(item=><li key={item.practice_id}><Link className="text-emerald-700 underline" href={`/curriculum/class-practice/${item.practice_id}`}>{item.title} · {item.class_name}</Link><p className="text-sm text-gray-600">{item.lesson_code} · Phiên bản {item.version_id}</p></li>)}</ul></section>;
}
