import {test,expect,Page} from '@playwright/test';

// Synthetic catalog responses; no application account, workbook or database.
async function fixture(page:Page){
 await page.addInitScript(()=>{localStorage.setItem('access_token','g5c-fixture-only');localStorage.setItem('user',JSON.stringify({user_id:995,code:'TEACHER',name:'Synthetic teacher'}));localStorage.setItem('sidebar_open','false');});
 const lessons=Array.from({length:10},(_,i)=>({lesson_id:i+1,lesson_code:`L1.BT.${String(i+1).padStart(2,'0')}`,title:`Synthetic lesson ${i+1}`,level_code:'L1',topic_code:'BT',content_status:'drafting',readiness:'drafting',total_activities:1,published_activities:0}));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const calls:Record<string,number>={};let fail=false,gate:Promise<void>|null=null;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:33131')return route.continue();
  const reply=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,...(status===200?{}:{message:'G5C temporary unavailable'})})});
  if(url.pathname==='/curriculum/catalog')return reply([{code:'L1',availableLessons:0,totalLessons:10}]);
  if(url.pathname==='/curriculum/learning-overview')return reply({role:'teacher',summary:{total:10,attempted:0,officialCompleted:0,statuses:{}},lessons:[],groups:[],activities:[],practices:[],resume:null});
  if(url.pathname==='/curriculum/lessons')return reply(url.searchParams.get('level')==='L2'?[]:lessons);
  if(url.pathname.startsWith('/curriculum/lessons/')){
   const code=url.pathname.split('/').at(-1)!;calls[code]=(calls[code]||0)+1;if(gate&&code==='L1.BT.08')await gate;
   if(fail){fail=false;return reply(null,503);}
   const lesson=lessons.find(l=>l.lesson_code===code)!;
   return reply({...lesson,activities:[{activity_id:lesson.lesson_id,activity_code:code+'.T01',activity_level:'T',game_type:'FlipCardViewer',title:'Synthetic activity '+code,readiness:'drafting',can_preview:true,draft_version_id:1}]});
  }
  return reply([]);
 });
 return {calls,errors,fail:()=>{fail=true;},hold:()=>{let release!:()=>void;gate=new Promise<void>(resolve=>{release=resolve;});return release;}};
}
for(const [name,width,height]of [['desktop',1280,900],['tablet',820,1180],['phone',390,844]] as const){
 test(`${name}: slow detail stays single across keyboard close/reopen and fits viewport`,async({page})=>{
  await page.setViewportSize({width,height});const f=await fixture(page),release=f.hold();await page.goto('/curriculum');
  const lesson=page.locator('[data-lesson-code="L1.BT.08"]'),toggle=lesson.getByRole('button',{name:'Synthetic lesson 8',exact:true});await expect(toggle).toBeVisible();expect(f.calls).toEqual({});
  try{await toggle.focus();await page.keyboard.press('Enter');await expect.poll(()=>f.calls['L1.BT.08']).toBe(1);await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','false');await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');}finally{release();}
  await expect(lesson.locator('a[href*="T01"]')).toBeVisible();expect(f.calls['L1.BT.08']).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(f.errors).toEqual([]);
 });
}
test('failed detail releases the request guard and explicit retry succeeds',async({page})=>{
 const f=await fixture(page);f.fail();await page.goto('/curriculum');const lesson=page.locator('[data-lesson-code="L1.BT.08"]');await lesson.getByRole('button',{name:'Synthetic lesson 8',exact:true}).click();await expect(lesson.getByRole('alert')).toContainText('G5C temporary unavailable');await lesson.getByRole('button',{name:/Thử lại/}).click();await expect(lesson.locator('a[href*="T01"]')).toBeVisible();expect(f.calls['L1.BT.08']).toBe(2);expect(f.errors).toEqual([]);
});
test('an unrelated lesson can load while another is pending; remount starts a fresh request',async({page})=>{
 const f=await fixture(page),release=f.hold();await page.goto('/curriculum');await page.getByRole('button',{name:'Synthetic lesson 8',exact:true}).click();await expect.poll(()=>f.calls['L1.BT.08']).toBe(1);
 try{await page.getByRole('button',{name:'Synthetic lesson 9',exact:true}).click();await expect(page.getByRole('link',{name:/Synthetic activity L1.BT.09/})).toBeVisible();expect(f.calls['L1.BT.09']).toBe(1);}finally{release();}
 await page.getByRole('button',{name:'Synthetic lesson 8',exact:true}).click();await expect(page.getByRole('link',{name:/Synthetic activity L1.BT.08/})).toBeVisible();expect(f.calls['L1.BT.08']).toBe(1);
 await page.reload();await expect(page.getByRole('link',{name:/Synthetic activity L1.BT.08/})).toBeVisible();expect(f.calls['L1.BT.08']).toBe(2);expect(f.errors).toEqual([]);
});
