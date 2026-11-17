import {DashboardLayout} from '@/shared/components/layout';import {CurriculumEditorDetail} from '@/features/curriculum';
export default async function Page({params}:{params:Promise<{activityId:string}>}){const {activityId}=await params;return <DashboardLayout><CurriculumEditorDetail key={activityId} activityId={Number(activityId)}/></DashboardLayout>;}
