import {test,expect,Page} from '@playwright/test';
import type {AttemptEvent,CurriculumAttempt} from '../src/domain/entities/Curriculum';
import type {ReviewDetail,ReviewInput} from '../src/domain/entities/CurriculumReview';

// Synthetic UI contracts: all API calls are intercepted; no application database or account.
async function fixture(page:Page,{teacher=false,loseAnswer=false}={}){
 await page.addInitScript(({teacher})=>{localStorage.setItem('access_token','g4-browser-fixture');localStorage.setItem('user',JSON.stringify({user_id:991,code:teacher?'TEACHER':'STUDENT',name:'Synthetic user'}));localStorage.setItem('sidebar_open','false');},{teacher});
 const attempt:CurriculumAttempt={attemptId:'g4-browser-attempt',activityId:991,versionId:7,isPreview:true,status:'open',config:{runtime_version:2,game_type:'VideoPracticeRecorder',title:'Synthetic recording',policy:{max_retries:null},rounds:[{id:'r1',title:'Thực hành',available:true,complete:false,solved:false}],tasks:[{id:'target',kind:'recording',roundId:'r1',label:'Target',prompt:{type:'text',content:'Target'}}]},answers:[],result:null,recording:{required:1,submitted:0,missingTaskIds:['target'],status:'in_progress',aiStatus:'not_requested',items:[{taskId:'target',label:'Target',status:'not_submitted',uploadId:null,revision:0,history:[]}]},review:{scope:'class',status:'in_progress',practiceId:'practice',classId:1,items:[{taskId:'target',status:'pending_review',latestReviewId:0,uploadId:null,history:[]}],canResubmit:false}};
 const events:AttemptEvent[]=[],writes:ReviewInput[]=[],uploads:string[]=[],assignments:unknown[]=[];let starts=0,submits=0,lose=loseAnswer;
 const detail:ReviewDetail={attemptId:attempt.attemptId,studentId:991,studentName:'Synthetic learner',className:'Synthetic class',classId:1,versionId:7,isPreview:true,config:attempt.config,recording:attempt.recording!,review:attempt.review!,canReview:true};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:33131')return route.continue();
  const p=url.pathname,method=route.request().method();const reply=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,...(status!==200?{message:'Synthetic lost response'}:{})})});
  if(p.endsWith('/current-attempt'))return reply(null);
  if(p==='/curriculum/learning-overview')return reply({role:teacher?'teacher':'student',summary:{total:1,attempted:0,officialCompleted:0,statuses:{}},lessons:[],groups:[],activities:[],practices:[{practice_id:'practice',class_room_id:1,activity_id:991,version_id:7,class_name:'Synthetic class',title:'Synthetic recording',lesson_code:'L1.BT.01',activity_code:'L1.BT.01.T06',status:'open',progress:null}],resume:null});
  if(method==='OPTIONS')return reply({});
  if(p==='/curriculum/reviews/classes')return reply([{class_room_id:1,content:'Synthetic class'}]);
  if(p==='/curriculum/reviews/activities')return reply([{activity_id:991,activity_code:'L1.BT.01.T06',lesson_code:'L1.BT.01',title:'Synthetic recording'}]);
  if(p==='/curriculum/reviews/submissions')return reply({items:[{attempt_id:attempt.attemptId,user_id:991,version_id:7,class_room_id:1,class_name:'Synthetic class',student_name:'Synthetic learner',activity_code:'L1.BT.01.T06',title:'Synthetic recording',review_status:'pending_review'}],total:1,page:1,pageSize:20});
  if(p===`/curriculum/reviews/submissions/${attempt.attemptId}`)return reply(detail);
  if(p.endsWith('/items')&&p.startsWith('/curriculum/reviews/')){const body=route.request().postDataJSON() as ReviewInput;writes.push(body);const item=detail.review.items[0];item.status=body.verdict;item.latestReviewId=writes.length;item.uploadId=body.uploadId;item.history.push({reviewId:writes.length,uploadId:body.uploadId,reviewerId:2,reviewerName:'Synthetic teacher',verdict:body.verdict,comment:body.comment,supersedesReviewId:body.expectedReviewId||null,createdAt:'2026-11-17T00:00:00Z'});return reply({reviewId:writes.length,replayed:false});}
  if(p==='/curriculum/class-practices'&&method==='POST'){assignments.push(route.request().postDataJSON());return reply({practice_id:'practice'});}
  if(p==='/curriculum/class-practices')return reply([{practice_id:'practice',class_room_id:1,activity_id:991,version_id:7,class_name:'Synthetic class',title:'Synthetic recording',lesson_code:'L1.BT.01',activity_code:'L1.BT.01.T06',status:'open'}]);
  if(p==='/curriculum/class-practices/practice/attempts'){starts++;return reply(attempt);}
  if(p===`/curriculum/attempts/${attempt.attemptId}`)return reply(attempt);
  if(p.endsWith('/tasks/target/uploads')){const id=route.request().postData()?.match(/name="uploadRequestId"\r\n\r\n([^\r]+)/)?.[1];if(!id)throw new Error('Missing upload UUID');uploads.push(id);return reply({uploadId:id});}
  if(p.endsWith('/answers')){const event=route.request().postDataJSON() as AttemptEvent;events.push(event);if(!attempt.answers.some(a=>a.eventId===event.eventId)){attempt.answers.push({eventId:event.eventId,taskId:event.taskId,correct:null,reviewStatus:'pending_review',terminal:true});const item=attempt.recording!.items[0];item.uploadId=event.uploadId!;item.revision++;item.status='submitted';item.history.push({eventId:event.eventId,uploadId:event.uploadId!,revision:item.revision,submittedAt:null});attempt.recording!.submitted=1;attempt.recording!.missingTaskIds=[];attempt.config.rounds![0].complete=true;}if(lose){lose=false;return reply(null,503);}return reply(attempt.answers.at(-1));}
  if(p.endsWith('/submit')){submits++;attempt.status='finalized';attempt.review!.status='pending_review';attempt.recording!.status='pending_review';attempt.result={score:0,stars:0,isCompleted:0,isPreview:true,reviewStatus:'pending_review',progressId:1,answered:1,required:1};return reply(attempt.result);}
  if(p.endsWith('/resubmissions')){attempt.review!.canResubmit=false;return reply({...attempt,attemptId:'child'});}
  if(p==='/curriculum/attempts/child')return reply({...attempt,attemptId:'child',status:'open',answers:[],result:null,review:{...attempt.review,parentAttemptId:attempt.attemptId,canResubmit:false}});
  if(p==='/curriculum/catalog'||p==='/curriculum/lessons')return reply([]);
  return reply([]);
 });
 return {attempt,detail,events,writes,uploads,assignments,errors,counts:()=>({starts,submits})};
}
async function record(page:Page){
 await page.getByRole('button',{name:/^(Quay video|Quay lại mục này)$/}).click();await expect(page.getByText(/Đang quay 1 giây/)).toBeVisible();await page.getByRole('button',{name:'Dừng quay',exact:true}).click();await expect(page.getByText('Có video nháp trên thiết bị, chưa nộp.',{exact:true})).toBeVisible();
}
test('an existing G1 session migrates pending work to the canonical attempt URL',async({page})=>{
 const f=await fixture(page);
 await page.addInitScript(()=>sessionStorage.setItem('curriculum:g1:991:991',JSON.stringify({requestId:'pre-g4-request',attemptId:'g4-browser-attempt',pending:{eventId:'pre-g4-event',taskId:'target',uploadId:'pre-g4-upload'}})));
 await page.goto(`/curriculum/attempts/${f.attempt.attemptId}`);await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');expect(f.events).toEqual([{eventId:'pre-g4-event',taskId:'target',uploadId:'pre-g4-upload'}]);expect(f.counts().starts).toBe(0);
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('curriculum:g1:991:attempt-g4-browser-attempt')!));expect(saved.requestId).toBe('pre-g4-request');expect(saved.pending).toBeUndefined();expect(f.errors).toEqual([]);
});
test('camera draft survives reload; replacement and finalization preserve the same attempt',async({page})=>{
 const f=await fixture(page);await page.goto('/curriculum');await page.getByRole('link',{name:'Mở thực hành lớp'}).click();await expect(page.getByRole('heading',{name:'Synthetic recording',exact:true})).toBeVisible();await record(page);
 await page.getByRole('button',{name:'Bắt đầu lượt làm mới'}).click();await expect(page.getByRole('region',{name:'Hoạt động ký hiệu'}).getByRole('alert')).toContainText('Còn video nháp chưa nộp');expect(f.counts().starts).toBe(1);
 await page.reload();await expect(page.getByText('Có video nháp trên thiết bị, chưa nộp.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Nộp video cho mục này'}).click();await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');
 await record(page);await page.getByRole('button',{name:'Lưu kết quả hoạt động'}).click();await expect(page.getByRole('region',{name:'Hoạt động ký hiệu'}).getByRole('alert')).toContainText('Còn video nháp chưa nộp');expect(f.counts().submits).toBe(0);
 await page.getByRole('button',{name:'Nộp video thay thế'}).click();await expect(page.getByRole('button',{name:'Xem video bản 2',exact:true})).toBeVisible();expect(f.events[1].replacesUploadId).toBe(f.events[0].uploadId);
 await page.getByRole('button',{name:'Lưu kết quả hoạt động'}).click();await expect(page.getByRole('heading',{name:'Đã nộp, đang chờ nhận xét'})).toBeVisible();expect(f.counts()).toEqual({starts:1,submits:1});expect(f.errors).toEqual([]);
});
test('pending recording answer replays from canonical attempt URL without duplicate upload',async({page})=>{
 const f=await fixture(page,{loseAnswer:true});await page.goto('/curriculum/class-practice/practice');await record(page);await page.getByRole('button',{name:'Nộp video cho mục này'}).click();await expect(page.getByRole('button',{name:'Thử lại thao tác'})).toBeVisible();
 await page.goto(`/curriculum/attempts/${f.attempt.attemptId}`);await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');expect(f.events).toHaveLength(2);expect(f.events[0]).toEqual(f.events[1]);expect(f.uploads).toHaveLength(1);await expect(page.getByRole('button',{name:'Bắt đầu lượt làm mới'})).toHaveCount(0);
 await page.goto('/curriculum/class-practice/practice');await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');expect(f.events).toHaveLength(2);expect(f.counts().starts).toBe(1);expect(f.errors).toEqual([]);
});
test('teacher assigns pinned draft, reviews exact clip and sees append-only history',async({page})=>{
 const f=await fixture(page,{teacher:true});f.detail.recording.items[0]={taskId:'target',label:'Target',status:'pending_review',uploadId:'clip',revision:1,history:[{eventId:'event',uploadId:'clip',revision:1,submittedAt:null}]};
 await page.goto('/grading/curriculum');await page.getByLabel('Lớp phụ trách').selectOption('1');await page.getByLabel('Hoạt động ghi hình').selectOption('991');await page.getByRole('button',{name:'Giao thực hành nháp',exact:true}).click();await expect(page.getByText(/Đã giao thực hành nháp cho lớp/)).toBeVisible();expect(f.assignments).toHaveLength(1);
 await page.getByRole('link',{name:'Mở bài của Synthetic learner'}).click();await page.getByLabel('Ghi nhận mục').selectOption('needs_revision');await page.getByLabel('Nhận xét cho mục').fill('Quay rõ hơn');await page.getByRole('button',{name:'Lưu nhận xét',exact:true}).click();await expect(page.getByRole('heading',{name:'Lịch sử nhận xét (1)'})).toBeVisible();
 await page.getByLabel('Nhận xét cho mục').fill('Giữ bàn tay trong khung hình');await page.getByRole('button',{name:'Lưu bản nhận xét mới'}).click();await expect(page.getByRole('heading',{name:'Lịch sử nhận xét (2)'})).toBeVisible();expect(f.writes[0]).toMatchObject({taskId:'target',uploadId:'clip',expectedReviewId:0});expect(f.writes[1].expectedReviewId).toBe(1);expect(f.errors).toEqual([]);
});
test('student opens requested resubmission while original feedback stays visible',async({page})=>{
 const f=await fixture(page);f.attempt.status='finalized';f.attempt.result={score:0,stars:0,isCompleted:0,isPreview:true,reviewStatus:'pending_review',progressId:1,answered:1,required:1};f.attempt.review!.status='needs_revision';f.attempt.review!.canResubmit=true;f.attempt.review!.items[0]={taskId:'target',status:'needs_revision',latestReviewId:1,uploadId:'clip',history:[{reviewId:1,uploadId:'clip',reviewerId:2,reviewerName:'Synthetic teacher',verdict:'needs_revision',comment:'Quay rõ hơn',supersedesReviewId:null,createdAt:'2026-11-17T00:00:00Z'}]};
 await page.goto(`/curriculum/attempts/${f.attempt.attemptId}`);await expect(page.getByText('Quay rõ hơn',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Nộp lại các mục cần làm lại'}).click();await expect(page).toHaveURL(/\/curriculum\/attempts\/child$/);await expect(page.getByRole('link',{name:'Xem bài gốc và nhận xét trước'})).toBeVisible();expect(f.errors).toEqual([]);
});
