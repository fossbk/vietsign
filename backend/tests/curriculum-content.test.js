const test=require('node:test');const assert=require('node:assert/strict');
const c=require('../src/features/curriculum/services/curriculumContent.service');
const {normalizeSignIdentity:n}=require('../src/utils/signIdentity');
test('Vietnamese identities preserve tones, letters, numeric sense and normalize NFC',()=>{
 for(const group of [['ca','cà','cá'],['o','ô','ơ'],['d','đ']])assert.equal(new Set(group.map(n)).size,group.length);
 assert.equal(n(' CÀ '),n('ca\u0300'));assert.notEqual(n('ba'),n('3'));
});
test('all 8 legacy adapters validate without inventing quiz/bucket keys',()=>{
 const data=require('../src/scripts/curriculum_lop1_data.json');const games=new Set();
 for(const l of data)for(const a of l.activities){const cfg=c.adaptLegacy(a,a.media.map((m,i)=>({...m,media_id:i+1})));c.validate(cfg);games.add(a.game_type);assert.equal(cfg.legacy,true);}
 assert.equal(games.size,8);
 assert.throws(()=>c.validate(c.adaptLegacy({game_type:'ChoiceQuizGame',game_config:{}},[])),/nội dung/);
});
test('snapshot hides keys, randomizes option order once and retains option identity',()=>{
 assert.equal(c.hash({b:2,a:{z:1,x:3}}),c.hash({a:{x:3,z:1},b:2}),'MySQL JSON object key ordering must not change version hashes');
 const cfg={runtime_version:1,game_type:'ChoiceQuizGame',policy:{max_retries:0},tasks:[{id:'q',kind:'choice',prompt:{type:'text',content:'ca'},options:[{id:'a',presentation:{type:'text',content:'ca'}},{id:'b',presentation:{type:'text',content:'cà'}}],correct:['a']}]};
 const firstPositions=new Set();for(let i=0;i<40;i++){const s=c.snapshot(cfg);const p=c.publicConfig(s);assert.equal(JSON.stringify(p).includes('correct'),false);firstPositions.add(p.tasks[0].options[0].presentation.content);const correct=s.tasks[0].correct[0];assert.equal(s.tasks[0].options.find(o=>o.id===correct).presentation.content,'ca');}assert.equal(firstPositions.size,2);
});
test('retry records first correctness and server calculates score/completion',()=>{
 const cfg={game_type:'BucketDropGame',policy:{completion:'all_correct',max_retries:null,star_thresholds:null},tasks:[{id:'t',kind:'choice',options:[{id:'a'},{id:'b'}],correct:['b']}]};const t=cfg.tasks[0];
 assert.equal(c.grade(cfg,t,{choiceIds:['a']}).correct,false);assert.throws(()=>c.grade(cfg,t,{choiceIds:['foreign']}),/phiên/);
 const result=c.summarize(cfg,[{task_id:'t',is_correct:0},{task_id:'t',is_correct:1}]);assert.equal(result.score,100);assert.equal(result.firstCorrect,0);assert.equal(result.stars,0);assert.equal(result.isCompleted,1);
});

test('scored prompts do not disclose the answer label and viewing is not assessed skill',()=>{
 const pair={runtime_version:1,game_type:'LineMatchingGame',policy:{max_retries:null},tasks:[{id:'p',kind:'pair',label:'secret-answer',prompt:{type:'video',content:'/sample.webm'},options:[{id:'a',presentation:{type:'text',content:'ca'}}],correct:['a']}]};
 assert.equal(c.publicConfig(pair).tasks[0].label,undefined);
 const cards={runtime_version:1,game_type:'FlipCardViewer',policy:{completion:'viewed_all',star_thresholds:[50,80,100]},tasks:[{id:'view',kind:'view'}]};
 const result=c.summarize(cards,[{task_id:'view',is_correct:1}]);
 assert.equal(result.reviewStatus,'viewed_all');assert.equal(result.score,0);assert.equal(result.stars,0);assert.equal(result.isCompleted,1);
});
