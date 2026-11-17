"use client";
import {useParams} from 'next/navigation';import {DashboardLayout} from '@/shared/components/layout';import {CurriculumReviewDetail} from '@/features/grading';
export default function CurriculumDetailPage(){const {attemptId}=useParams<{attemptId:string}>();return <DashboardLayout><CurriculumReviewDetail key={attemptId} attemptId={attemptId}/></DashboardLayout>;}
