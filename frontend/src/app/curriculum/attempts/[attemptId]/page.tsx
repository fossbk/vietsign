"use client";
import {useParams} from 'next/navigation';import Link from 'next/link';import {DashboardLayout} from '@/shared/components/layout';import {AttemptGame} from '@/features/curriculum';
export default function MyAttemptPage(){const {attemptId}=useParams<{attemptId:string}>();return <DashboardLayout><main className="mx-auto max-w-5xl space-y-4 p-4"><Link href="/curriculum" className="underline">Về chương trình học</Link><AttemptGame key={attemptId} activityCode={attemptId} initialAttemptId={attemptId}/></main></DashboardLayout>;}
