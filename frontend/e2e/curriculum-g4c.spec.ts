/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import {test,expect,Page} from '@playwright/test';
const {build}=require('../../backend/tests/fixtures/g4c-group-bundle');
const rounds=require('../../backend/src/features/curriculum/services/curriculumRounds.service');
async function fixture(page:Page,student=false){
 const bundle=build(),assignments:any[]=[],errors:string[]=[];
 await page.addInitScript(({student})=>{localStorage.setItem('access_token','g4c-synthetic');localStorage.setItem('user',JSON.stringify({user_id:991,code:student?'STUDENT':'TEACHER',name:'Synthetic user'}));localStorage.setItem('sidebar_open','false');},{student});page.on('pageerror',e=>errors.push(e.message));
 const source=bundle.activities.find((a:any)=>a.activity_code==='L1.GROUP.B01-B03.H.G1'),config=structuredClone(source.config);config.compound.practiceSpeaker='Speaker A';config.tasks=config.tasks.filter((t:any)=>config.compound.units.find((u:any)=>u.id===t.id).speaker==='Speaker A');
 const attempt=(child=false)=>{const scoped=structuredClone(config);if(child)scoped.tasks=scoped.tasks.slice(0,1);return {attemptId:child?'child':'group-attempt',activityId:991,versionId:7,isPreview:true,status:'open',config:rounds.publicConfig(scoped),answers:[],result:null,recording:{required:scoped.tasks.length,submitted:0,missingTaskIds:scoped.tasks.map((t:any)=>t.id),status:'in_progress',aiStatus:'not_requested',items:scoped.tasks.map((t:any)=>({taskId:t.id,label:t.label,status:'not_submitted',uploadId:null,revision:0,history:[]}))},review:{scope:'class',practiceId:'group-practice',classId:1,status:'in_progress',items:[],canResubmit:false,...(child?{parentAttemptId:'group-attempt'}:{})}};};
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:33131')return route.continue();const p=url.pathname;
  const reply=(data:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,...(status===403?{message:'Nhóm đang biên soạn; mở bài được giao trong lớp.'}:{})})});
  if(route.request().method()==='OPTIONS')return reply({});
  if(p==='/curriculum/groups')return reply(bundle.groups.map((g:any)=>({...g,variants:bundle.activities.filter((a:any)=>a.group_code===g.group_code).length,can_preview:!student})));
  if(p.startsWith('/curriculum/groups/')){if(student)return reply(null,403);const g=bundle.groups.find((g:any)=>g.group_code===decodeURIComponent(p.split('/').at(-1)!));return reply({...g,variants:bundle.activities.filter((a:any)=>a.group_code===g.group_code).map((a:any,i:number)=>({activityId:i+1,activityCode:a.activity_code,title:a.title,level:a.activity_level,variantCode:a.variant_code,sourceColumn:a.source_column,versionId:7,assignable:a.assignable,source:a.config.compound}))});}
  if(p==='/curriculum/reviews/classes')return reply([{class_room_id:1,content:'Synthetic class'}]);
  if(p==='/curriculum/reviews/activities')return reply([{activity_id:991,activity_code:source.activity_code,lesson_code:source.lesson_code,title:source.title,compoundKind:'dialogue',speakers:['Speaker A','Speaker B']}]);
  if(p==='/curriculum/reviews/submissions')return reply({items:[],total:0,page:1,pageSize:20});
  if(p==='/curriculum/class-practices'&&route.request().method()==='POST'){assignments.push(route.request().postDataJSON());return reply({practice_id:'group-practice'});}
  if(p==='/curriculum/class-practices')return reply([{practice_id:'group-practice',class_room_id:1,activity_id:991,version_id:7,title:source.title,activity_code:source.activity_code,lesson_code:source.lesson_code,group_code:source.group_code,class_name:'Synthetic class',practice_speaker:'Speaker A',status:'open'}]);
  if(p==='/curriculum/class-practices/group-practice/attempts'||p==='/curriculum/attempts/group-attempt')return reply(attempt());
  if(p==='/curriculum/attempts/child')return reply(attempt(true));
  if(p==='/curriculum/reviews/submissions/group-attempt'){const a=attempt();a.review.items=a.config.tasks.map((t:any)=>({taskId:t.id,status:'pending_review',latestReviewId:0,uploadId:'clip-'+t.id,history:[]}));a.recording.items.forEach((i:any)=>{i.uploadId='clip-'+i.taskId;i.history=[{eventId:'event-'+i.taskId,uploadId:i.uploadId,revision:1,submittedAt:null}];});return reply({attemptId:a.attemptId,studentId:991,studentName:'Synthetic learner',className:'Synthetic class',classId:1,versionId:7,isPreview:true,config:a.config,recording:a.recording,review:a.review,canReview:true});}
  if(p==='/curriculum/catalog'||p==='/curriculum/lessons')return reply([]);
  return reply([]);
 });
 return {bundle,assignments,errors};
}
test('four groups retain all alternatives without a default selection; blocked alternatives cannot start',async({page})=>{
 const f=await fixture(page);await page.goto('/curriculum/groups');await expect(page.getByRole('link',{name:/Đối chiếu Synthetic group/})).toHaveCount(4);
 for(const g of f.bundle.groups){await page.goto('/curriculum/groups/'+g.group_code);const select=page.getByLabel('Phương án nháp');await expect(select).toHaveValue('');await expect(page.getByRole('region',{name:'Toàn bộ nội dung nhóm'})).toHaveCount(0);
  for(const a of f.bundle.activities.filter((a:any)=>a.group_code===g.group_code)){await select.selectOption(a.activity_code);const content=page.getByRole('region',{name:'Toàn bộ nội dung nhóm'});await expect(content.getByRole('listitem')).toHaveCount(5);await expect(page.getByRole('button',{name:'Mở lượt xem thử'})).toHaveCount(a.assignable?1:0);await page.getByText('Đối chiếu nguyên văn cột '+a.source_column,{exact:true}).click();await expect(page.getByText('Synthetic raw source only',{exact:true})).toBeVisible();}
 }
 expect(f.errors).toEqual([]);
});
test('teacher sends an explicit dialogue role when assigning a draft',async({page})=>{
 const f=await fixture(page);await page.goto('/grading/curriculum');await page.getByLabel('Lớp phụ trách').selectOption('1');await page.getByLabel('Hoạt động ghi hình').selectOption('991');await page.getByLabel('Vai thực hành').selectOption('Speaker B');await page.getByRole('button',{name:'Giao thực hành nháp',exact:true}).click();await expect(page.getByText(/Đã giao thực hành nháp/)).toBeVisible();expect(f.assignments[0]).toMatchObject({classId:1,activityId:991,speaker:'Speaker B'});expect(f.errors).toEqual([]);
});
test('student sees full dialogue context and only assigned recording targets on a narrow screen',async({page})=>{
 const f=await fixture(page,true);await page.setViewportSize({width:390,height:844});await page.goto('/curriculum/class-practice/group-practice');const context=page.getByRole('region',{name:'Toàn bộ nội dung nhóm'});await expect(context.getByRole('listitem')).toHaveCount(5);await expect(context.getByText(/Vai được giao: Speaker A/)).toBeVisible();await expect(page.getByRole('navigation',{name:'Các mục thực hành'}).getByRole('button')).toHaveCount(3);await expect(context.getByText(/Ngữ cảnh/)).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(f.errors).toEqual([]);
});
test('review and scoped resubmission retain full source context and the assigned role',async({page})=>{
 const f=await fixture(page);await page.goto('/grading/curriculum/group-attempt');await expect(page.getByRole('region',{name:'Toàn bộ nội dung nhóm'}).getByRole('listitem')).toHaveCount(5);await expect(page.getByRole('navigation',{name:'Các mục cần nhận xét'}).getByRole('button')).toHaveCount(3);await page.goto('/curriculum/attempts/child');await expect(page.getByRole('region',{name:'Toàn bộ nội dung nhóm'}).getByRole('listitem')).toHaveCount(5);await expect(page.getByRole('navigation',{name:'Các mục thực hành'}).getByRole('button')).toHaveCount(1);await expect(page.getByRole('link',{name:'Xem bài gốc và nhận xét trước'})).toBeVisible();expect(f.errors).toEqual([]);
});
test('student group list does not expose source-review links and denied detail stays closed',async({page})=>{
 const f=await fixture(page,true);await page.goto('/curriculum/groups');await expect(page.getByRole('heading',{name:'Synthetic group 1-3',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Đối chiếu/})).toHaveCount(0);await page.goto('/curriculum/groups/L1.GROUP.B01-B03');await expect(page.getByText('Nhóm đang biên soạn; mở bài được giao trong lớp.',{exact:true})).toBeVisible();await expect(page.getByLabel('Phương án nháp')).toHaveCount(0);expect(f.errors).toEqual([]);
});
