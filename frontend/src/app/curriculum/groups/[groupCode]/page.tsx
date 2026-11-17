import {GroupLearningDetail} from '@/features/curriculum';
export default async function Page({params}:{params:Promise<{groupCode:string}>}){const {groupCode}=await params;return <GroupLearningDetail key={groupCode} groupCode={groupCode}/>;}
