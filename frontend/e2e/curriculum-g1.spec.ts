import {test,expect,Page} from '@playwright/test';
import type {AttemptEvent,CurriculumAttempt,AttemptTask} from '../src/domain/entities/Curriculum';

// UI contract tests only: every API request is intercepted; never use a real account/DB.
async function fixture(page:Page,game='ChoiceQuizGame',failFirstAnswer=false){
  await page.addInitScript(()=>{
    localStorage.setItem('access_token','g1-browser-fixture-only');
    localStorage.setItem('user',JSON.stringify({user_id:991,code:'STUDENT',name:'G1 fixture'}));
    localStorage.setItem('sidebar_open','false');
  });
  const task:AttemptTask={id:'task',kind:game==='FlipCardViewer'?'view':game==='VideoPracticeRecorder'?'recording':game==='SequenceOrderGame'?'sequence':game==='ChoiceQuizGame'||game==='BucketDropGame'?'choice':'pair',prompt:{type:'text',content:'Mục thử'},options:[{id:'opaque-a',presentation:{type:'text',content:'ca'}},{id:'opaque-b',presentation:{type:'text',content:'cà'}}]};
  const attempt:CurriculumAttempt={attemptId:'g1-browser-attempt',activityId:991,versionId:1,isPreview:false,status:'open',config:{runtime_version:1,game_type:game,policy:{max_retries:null},tasks:[task]},answers:[],result:null};
  const activity={activity_id:991,activity_code:'L1.BT.01.T01',game_type:game,title:'G1 thử độc lập',readiness:'ready',game_config:null};
  const lesson={lesson_id:991,lesson_code:'L1.BT.01',title:'Bài thử G1',level_code:'L1',topic_code:'BT',content_status:'ready',readiness:'ready',total_activities:1,published_activities:1,activities:[activity]};
  const events:AttemptEvent[]=[];let starts=0,submits=0,fail=failFirstAnswer;
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin==='http://127.0.0.1:33131')return route.continue();
    const path=url.pathname,method=route.request().method();
    const reply=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,...(status!==200?{message:'Lỗi mạng thử nghiệm'}:{})})});
    if(method==='OPTIONS')return reply({});
    if(path==='/curriculum/catalog')return reply([{code:'L1',availableLessons:1,totalLessons:1}]);
    if(path==='/curriculum/lessons')return reply([lesson]);
    if(path==='/curriculum/lessons/L1.BT.01')return reply(lesson);
    if(path==='/curriculum/activities/L1.BT.01.T01')return reply(activity);
    if(path==='/curriculum/activities/991/attempts'){starts++;return reply(attempt);}
    if(path==='/curriculum/attempts/g1-browser-attempt'&&method==='GET')return reply(attempt);
    if(path.endsWith('/tasks/task/uploads'))return reply({uploadId:'fixture-upload'});
    if(path.endsWith('/g1-browser-attempt/answers')){
      const event=route.request().postDataJSON() as AttemptEvent;events.push(event);
      if(!attempt.answers.some(a=>a.eventId===event.eventId))attempt.answers.push({eventId:event.eventId,taskId:event.taskId,correct:task.kind==='recording'?null:true,...(task.kind==='recording'?{reviewStatus:'pending_review'}:{})});
      if(fail){fail=false;return reply(null,503);} // Server accepted, response was lost.
      return reply(attempt.answers.at(-1));
    }
    if(path.endsWith('/g1-browser-attempt/submit')){
      submits++;attempt.status='finalized';attempt.result={score:task.kind==='recording'?0:100,stars:0,isCompleted:task.kind==='recording'?0:1,isPreview:false,reviewStatus:task.kind==='recording'?'pending_review':task.kind==='view'?'viewed_all':'assessed',progressId:1,answered:1,required:1};return reply(attempt.result);
    }
    return reply([]);
  });
  return {attempt,events,errors,counts:()=>({starts,submits})};
}

for(const game of ['FlipCardViewer','LineMatchingGame','ChoiceQuizGame','JigsawPuzzleGame','BucketDropGame','MemoryCardGame','SequenceOrderGame','VideoPracticeRecorder']){
  test(`${game}: G1 entry submits server actions and displays the server result`,async({page})=>{
    const f=await fixture(page,game);
    await page.goto('/curriculum/L1.BT.01/L1.BT.01.T01');
    await expect(page.getByRole('heading',{name:'G1 thử độc lập'})).toBeVisible();
    if(game==='FlipCardViewer')await page.getByRole('button',{name:'Lật thẻ task',exact:true}).click();
    else if(game==='VideoPracticeRecorder'){
      await page.getByLabel('Video cho task').setInputFiles({name:'test.webm',mimeType:'video/webm',buffer:Buffer.from([0x1a,0x45,0xdf,0xa3,1,2])});
      await page.getByRole('button',{name:'Nộp video cho mục này'}).click();
    }else if(game==='SequenceOrderGame'){
      await page.getByRole('button',{name:'Chọn thẻ ca',exact:true}).click();await page.getByRole('button',{name:'Chọn thẻ cà',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra thứ tự'}).click();
    }else if(game==='BucketDropGame')await page.getByRole('button',{name:'Giỏ ca',exact:true}).click();
    else if(game==='ChoiceQuizGame'){await page.getByRole('button',{name:'Chọn đáp án ca',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();}
    else{await page.getByRole('button',{name:'Chọn vế trái task',exact:true}).click();await page.getByRole('button',{name:'Ghép với ca',exact:true}).click();}
    await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');
    await page.getByRole('button',{name:'Lưu kết quả hoạt động'}).click();
    await expect(page.getByRole('button',{name:'Chơi lượt mới'})).toBeVisible();
    expect(f.counts()).toEqual({starts:1,submits:1});expect(f.events).toHaveLength(1);expect(f.events[0]).not.toHaveProperty('score');expect(f.errors).toEqual([]);
  });
}
test('lost answer response is retried with the same event and survives reload',async({page})=>{
  const f=await fixture(page,'ChoiceQuizGame',true);
  await page.goto('/curriculum/L1.BT.01/L1.BT.01.T01');
  await page.getByRole('button',{name:'Chọn đáp án ca',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
  await expect(page.getByRole('button',{name:'Thử lại thao tác'})).toBeVisible();
  await page.getByRole('button',{name:'Thử lại thao tác'}).click();
  await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');
  expect(f.events).toHaveLength(2);expect(f.events[0]).toEqual(f.events[1]);expect(f.attempt.answers).toHaveLength(1);
  await page.reload();await expect(page.getByLabel('Tiến độ hoạt động')).toContainText('Đã làm 1/1 mục');expect(f.counts().starts).toBe(1);expect(f.errors).toEqual([]);
});
test('catalog counts remain unchanged after opening lesson details',async({page})=>{
  const f=await fixture(page);await page.goto('/curriculum');
  await expect(page.getByText('1/1 sẵn sàng',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Bài thử G1',exact:true}).click();
  await expect(page.getByRole('link',{name:/G1 thử độc lập/})).toBeVisible();
  await expect(page.getByText('1/1 sẵn sàng',{exact:true})).toBeVisible();expect(f.errors).toEqual([]);
});
