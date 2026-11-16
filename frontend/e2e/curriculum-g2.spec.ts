/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const compiler=require('../../backend/src/features/curriculum/services/curriculumCompiler.service');
const rounds=require('../../backend/src/features/curriculum/services/curriculumRounds.service');
const manifest=require('../../backend/tests/fixtures/g2-technical.json');
const context={items:manifest.items,assets:manifest.assets,starPolicies:{'g2-technical-only':{thresholds:[50,80,100],memory_stars:[{max_moves:18,stars:3},{max_moves:27,stars:2},{max_moves:54,stars:1}]}}};
const label=(p:any)=>p.label||p.content||'';
async function fixture(page:Page,id:string,{lostAnswer=false,lostSubmit=false}={}){
 await page.addInitScript(()=>{localStorage.setItem('access_token','g2-synthetic-only');localStorage.setItem('user',JSON.stringify({user_id:991,code:'TEACHER',name:'Synthetic test'}));localStorage.setItem('sidebar_open','false');});
 const source=manifest.fixtures.find((f:any)=>f.id===id),config=rounds.snapshot(compiler.compile(source.author,context));
 if(id==='missing-media')config.tasks[0].sample={type:'video',missing:true,label:'Missing sample'};
 const answers:any[]=[],requests:any[]=[],errors:string[]=[];let result:any=null,starts=0;
 const current=()=>({attemptId:'synthetic-attempt',activityId:991,versionId:2,isPreview:true,status:result?'finalized':'open',config:rounds.publicConfig(config,answers),answers:answers.map(a=>({eventId:a.event_id,taskId:a.task_id,...a.response})),result});
 const answer=(e:any)=>{const known=answers.find(a=>a.event_id===e.eventId);if(known)return known.response;const task=config.tasks.find((t:any)=>t.id===e.taskId);const response=rounds.grade(config,task,e,answers);answers.push({event_id:e.eventId,task_id:e.taskId,payload:e,response});return response;};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.startsWith('/g2-test-media/'))return route.fulfill(path.endsWith('.webm')?{contentType:'video/webm',body:readFileSync(resolve(__dirname,'fixtures/technical-sample.webm'))}:{contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#d1fae5"/><circle cx="80" cy="80" r="38" fill="#047857"/></svg>'});
  if(url.origin==='http://127.0.0.1:33131')return route.continue();
  const reply=(data:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,...(status===200?{}:{message:'Synthetic transport failure'})})});
  if(route.request().method()==='OPTIONS')return reply({});
  if(path==='/curriculum/activities/L1.BT.01.T01')return reply({activity_id:991,activity_code:'L1.BT.01.T01',title:source.title,game_type:config.game_type,readiness:'ready'});
  if(path.endsWith('/activities/991/attempts')){starts++;return reply(current());}
  if(path.endsWith('/attempts/synthetic-attempt'))return reply(current());
  if(path.endsWith('/uploads'))return reply({uploadId:'synthetic-upload'});
  if(path.endsWith('/answers')){const e=route.request().postDataJSON();requests.push(e);try{const r=answer(e);if(lostAnswer){lostAnswer=false;return reply(null,503);}return reply(r);}catch(e){return reply(null,(e as any).status||422);}}
  if(path.endsWith('/submit')){result={...rounds.summarize(config,answers),isPreview:true,progressId:0};if(lostSubmit){lostSubmit=false;return reply(null,503);}return reply(result);}
  return reply([]);
 });
 await page.goto('/curriculum/L1.BT.01/L1.BT.01.T01');await expect(page.getByRole('heading',{name:source.title,exact:true})).toBeVisible();
 return {config,answers,requests,errors,current,answer,starts:()=>starts};
}
async function idle(page:Page){await expect(page.getByText('Đang lưu thao tác…',{exact:true})).toHaveCount(0);}
async function nextRound(page:Page){await page.getByRole('button',{name:'Sang lượt tiếp theo →'}).click();}

for(const id of ['flashcards','matching','quiz','count-low','count-high','sequence','puzzle','bucket','memory','recording']){
 test(`${id}: completes every round with server feedback`,async({page})=>{
  if(id==='count-high')await page.setViewportSize({width:390,height:844});
  const f=await fixture(page,id);
  for(let ri=0;ri<f.config.rounds.length;ri++){
   const tasks=f.config.tasks.filter((t:any)=>t.roundId===f.config.rounds[ri].id);
   for(let ti=0;ti<tasks.length;ti++){
    const t=tasks[ti];
    if(t.kind==='view')await page.getByRole('button',{name:`Lật thẻ ${t.label||t.id}`,exact:true}).click();
    else if(t.kind==='pair'){
     const left=page.getByRole('button',{name:`Chọn vế trái ${t.id}`,exact:true}),right=page.getByRole('button',{name:`Ghép với ${label(t.options.find((o:any)=>o.id===t.correct[0]).presentation)}`,exact:true});
     if(ri===0&&ti===0){await left.click();await page.getByRole('button',{name:`Ghép với ${label(t.options.find((o:any)=>o.id!==t.correct[0]).presentation)}`,exact:true}).click();await idle(page);await expect(left).toBeEnabled();}
     await left.click();await right.click();
    }else if(t.kind==='memory'){
     for(const pair of t.pairs){for(const card of t.cards.filter((c:any)=>c.pairId===pair.id)){await page.getByRole('button',{name:`Lật thẻ ${t.cards.indexOf(card)+1}`,exact:true}).click();await idle(page);}}
    }else if(t.kind==='sequence'){
     for(const [i,id]of t.correct.entries())if(!t.fixedSlots?.includes(i))await page.getByRole('button',{name:`Chọn thẻ ${label(t.options.find((o:any)=>o.id===id).presentation)}`,exact:true}).click();
     await page.getByRole('button',{name:'Kiểm tra thứ tự',exact:true}).click();
    }else if(t.kind==='recording'){
     await page.getByLabel(`Video cho ${t.label||t.id}`).setInputFiles(resolve(__dirname,'fixtures/technical-sample.webm'));
     await page.getByRole('button',{name:'Nộp video cho mục này',exact:true}).click();
    }else{
     if(t.requireCount)for(let i=0;i<t.prompt.count;i++){await page.getByRole('button',{name:`Đếm vật ${i+1}`,exact:true}).click();await idle(page);}
     const right=t.options.find((o:any)=>o.id===t.correct[0]);
     if(id==='bucket')await page.getByRole('button',{name:`Giỏ ${right.presentation.content}`,exact:true}).click();
     else{await page.getByRole('button',{name:`Chọn đáp án ${label(right.presentation)}`,exact:true}).click();await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();}
    }
    await idle(page);
    if(['quiz','count-low','count-high','sequence','recording'].includes(id)&&ti<tasks.length-1)await page.getByRole('button',{name:'Mục tiếp theo →',exact:true}).click();
   }
   if(ri<f.config.rounds.length-1)await nextRound(page);
  }
  await page.getByRole('button',{name:'Lưu kết quả hoạt động',exact:true}).click();
  await expect(page.getByRole('button',{name:'Chơi lượt mới',exact:true})).toBeVisible();
  expect(f.current().result.answered).toBe(f.config.tasks.length);expect(f.errors).toEqual([]);
  if(id==='flashcards'){expect(f.current().result.score).toBe(0);expect(f.current().result.stars).toBe(0);}
 });
}
test('lost responses replay the same event and submission across reload',async({page})=>{
 const f=await fixture(page,'flashcards',{lostAnswer:true,lostSubmit:true});
 await page.getByRole('button',{name:/^Lật thẻ /}).first().click();await expect(page.getByRole('button',{name:'Thử lại thao tác'})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/6');
 expect(f.requests).toHaveLength(2);expect(f.requests[0]).toEqual(f.requests[1]);expect(f.answers).toHaveLength(1);
 for(const t of f.config.tasks)if(!f.answers.some(a=>a.task_id===t.id))f.answer({taskId:t.id,eventId:crypto.randomUUID(),action:'view'});
 await page.reload();await page.getByRole('button',{name:'Lưu kết quả hoạt động'}).click();await page.getByRole('button',{name:'Thử lại thao tác'}).click();
 await expect(page.getByRole('heading',{name:'Đã xem đủ các thẻ'})).toBeVisible();expect(f.starts()).toBe(1);expect(f.errors).toEqual([]);
});
test('native media replay, speed, angles, zoom and missing sample',async({page})=>{
 const f=await fixture(page,'flashcards');const task=f.config.tasks.find((t:any)=>t.sample?.angles?.length);
 await page.getByRole('button',{name:`Lật thẻ ${task.label}`,exact:true}).click();await idle(page);
 const article=page.getByRole('heading',{name:`${task.label} · ✓ Đã xem`,exact:true}).locator('..'),video=article.locator('video');
 await expect(video).toHaveJSProperty('readyState',4);await article.getByLabel('Tốc độ phát').selectOption('0.5');await expect(video).toHaveJSProperty('playbackRate',0.5);
 await article.getByRole('button',{name:'↻ Xem lại'}).click();await expect(video).toHaveJSProperty('paused',false);
 const src=await video.getAttribute('src');await article.getByRole('button',{name:'Đổi góc quay'}).click();await expect(video).not.toHaveAttribute('src',src!);
 await article.getByRole('button',{name:/^Phóng to /}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(f.errors).toEqual([]);
});
test('missing media stays incomplete',async({page})=>{
 const f=await fixture(page,'missing-media'),t=f.config.tasks[0];await page.getByRole('button',{name:`Lật thẻ ${t.label}`,exact:true}).click();
 await expect(page.getByText('Chưa có video mẫu cho Missing sample.',{exact:true})).toBeVisible();expect(f.answers).toHaveLength(0);await expect(page.getByRole('button',{name:'Lưu kết quả hoạt động'})).toBeDisabled();
});
test('camera stops tracks when leaving the activity',async({page})=>{
 await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);(window as any).testStreams=[];navigator.mediaDevices.getUserMedia=async options=>{const s=await original(options);(window as any).testStreams.push(s);return s;};});
 await fixture(page,'recording');await page.getByRole('button',{name:'Quay video',exact:true}).click();await expect(page.getByRole('button',{name:'Dừng quay'})).toBeVisible();
 await page.getByRole('button',{name:'Quay lại danh sách'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).testStreams.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});
