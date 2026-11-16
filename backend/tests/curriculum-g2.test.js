const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('../src/features/curriculum/services/curriculumRounds.service');
const compiler=require('../src/features/curriculum/services/curriculumCompiler.service');
const manifest=require('./fixtures/g2-technical.json');
const fixture=id=>structuredClone(manifest.fixtures.find(f=>f.id===id).config);
const context=()=>({items:manifest.items,assets:manifest.assets,starPolicies:{'g2-technical-only':{thresholds:[50,80,100],memory_stars:[{max_moves:18,stars:3},{max_moves:27,stars:2},{max_moves:54,stars:1}]}}});
for(const f of manifest.fixtures){f.config=compiler.compile(f.author,context());if(f.id==='missing-media')f.config.tasks[0].sample={type:'video',missing:true};}
const author=id=>structuredClone(manifest.fixtures.find(f=>f.id===id).author);
function session(id){const config=r.snapshot(fixture(id)),answers=[];return {config,answers,send(task,input){const response=r.grade(config,task,input,answers);answers.push({task_id:task.id,payload:input,response});return response;}};}

test('G2: eleven fixture configs validate, hide all answer keys and stay unpublishable',()=>{
 for(const f of manifest.fixtures){r.validate(f.config);assert.throws(()=>r.validate(f.config,true));const publicConfig=r.publicConfig(r.snapshot(f.config));
  assert.ok(publicConfig.tasks.every(t=>!('correct' in t)&&!('pairs' in t)&&(!t.cards||t.cards.every(c=>!('pairId' in c)))));
 }
});
test('G2 compiler: no dropped leftovers, atomic phrases, twelve quiz questions and explicit buckets',()=>{
 const line=compiler.compile(author('matching'),context());assert.deepEqual(line.rounds.map(x=>line.tasks.filter(t=>t.roundId===x.id).length),[4,3]);assert.equal(line.tasks.length,7);
 const puzzle=compiler.compile(author('puzzle'),context());assert.equal(puzzle.tasks.length,6);assert.ok(puzzle.tasks.some(t=>t.options.some(o=>o.presentation.content.startsWith('Symbol '))));
 const quiz=compiler.compile(author('quiz'),context());assert.equal(quiz.tasks.length,12);assert.deepEqual([...new Set(quiz.tasks.map(t=>t.options.length))].sort(),[2,3]);
 const bucket=author('bucket');bucket.rounds[0].server_bucket_assignments.pop();assert.throws(()=>compiler.compile(bucket,context()),/không có giỏ/);
});
test('G2 compiler: rejects invalid item refs, count semantics, keys and unlock cycles',()=>{
 const a=author('count-low');a.rounds[0].questions[0].counting.object_item_id='eggplant';assert.throws(()=>compiler.compile(a,context()),/đúng một vật/);
 const b=author('count-low');b.rounds[0].questions[0].counting.object_count=2;assert.throws(()=>compiler.compile(b,context()),/không khớp/);
 const c=author('quiz');c.rounds[0].questions[0].server_correct_option_id='unknown';assert.throws(()=>compiler.compile(c,context()));
 const d=author('flashcards');d.rounds[0].item_ids=['unknown'];assert.throws(()=>compiler.compile(d,context()),/Không tìm thấy item/);
 const e=author('sequence');e.rounds[0].unlock_after_round=e.rounds[1].round_id;assert.throws(()=>compiler.compile(e,context()),/vòng lặp/);
});
test('G2 quiz: retry is additional selections; first-correct differs from eventual success',()=>{
 const s=session('quiz'),t=s.config.tasks[0],wrong=t.options.find(o=>!t.correct.includes(o.id)).id;
 assert.equal(s.send(t,{choiceIds:[wrong]}).remainingTries,2);assert.equal(r.summarize(s.config,s.answers).answered,0);
 assert.equal(s.send(t,{choiceIds:t.correct}).correct,true);assert.equal(r.summarize(s.config,s.answers).firstCorrect,0);
 const u=s.config.tasks[1];for(let i=0;i<3;i++){const a=s.send(u,{choiceIds:[u.options.find(o=>!u.correct.includes(o.id)).id]});assert.equal(a.exhausted,i===2);}
 assert.throws(()=>s.send(u,{choiceIds:u.correct}),/kết thúc/);assert.equal(r.summarize(s.config,s.answers).answered,2);
});
test('G2 counting 1–10: each physical object once, choices locked until all objects counted',()=>{
 for(const id of ['count-low','count-high']){const s=session(id);for(const t of s.config.tasks){assert.throws(()=>s.send(t,{choiceIds:t.correct}),/đếm đủ/);
  const object=t.prompt.objects[0];assert.equal(s.send(t,{action:'count',objectId:object.id}).countedIds.length,1);assert.equal(s.send(t,{action:'count',objectId:object.id}).countedIds.length,1);
  for(const o of t.prompt.objects.slice(1))s.send(t,{action:'count',objectId:o.id});assert.equal(s.send(t,{choiceIds:t.correct}).correct,true);
 }}
});
test('G2 sequence: three tasks gate advanced round and correct/fixed slots cannot be replaced',()=>{
 const s=session('sequence'),first=s.config.rounds[0],advanced=s.config.tasks.find(t=>t.roundId!==first.id);
 assert.throws(()=>s.send(advanced,{choiceIds:advanced.correct}),/chưa mở/);
 for(const t of s.config.tasks.filter(t=>t.roundId===first.id)){const wrong=[...t.correct];const free=wrong.map((_,i)=>i).filter(i=>!t.fixedSlots.includes(i));[wrong[free[0]],wrong[free[1]]]=[wrong[free[1]],wrong[free[0]]];
  const result=s.send(t,{choiceIds:wrong});assert.equal(result.correct,false);assert.ok(Object.keys(result.lockedOptions).length);
  const invalid=[...t.correct];[invalid[0],invalid[1]]=[invalid[1],invalid[0]];assert.throws(()=>s.send(t,{choiceIds:invalid}),/ô đã đúng/);
  s.send(t,{choiceIds:t.correct});
 }
 assert.equal(r.roundState(s.config,s.answers)[1].available,true);assert.equal(s.send(advanced,{choiceIds:advanced.correct}).correct,true);
});
test('G2 memory: genuine 3/4/5/6-pair boards, max two active cards, move-based policy',()=>{
 const s=session('memory');assert.deepEqual(s.config.tasks.map(t=>t.pairs.length),[3,4,5,6]);
 for(const t of s.config.tasks){const one=t.cards[0],different=t.cards.find(c=>c.pairId!==one.pairId);const opened=s.send(t,{action:'flip',cardId:one.id});assert.equal(opened.openCardId,one.id);assert.equal(opened.moves,0);
  assert.throws(()=>s.send(t,{action:'flip',cardId:one.id}));const wrong=s.send(t,{action:'flip',cardId:different.id});assert.equal(wrong.revealedIds.length,2);assert.equal(wrong.openCardId,null);assert.equal(wrong.moves,1);
  for(const p of t.pairs){const cards=t.cards.filter(c=>c.pairId===p.id);for(const card of cards)s.send(t,{action:'flip',cardId:card.id});}
  const complete=s.answers.at(-1).response;assert.equal(complete.matchedIds.length,t.pairs.length*2);assert.equal(complete.correct,true);
 }
 const result=r.summarize(s.config,s.answers);assert.equal(result.isCompleted,1);assert.equal(result.moves,22);assert.equal(result.stars,2);
});
test('G2 missing sample cannot be marked viewed, nested media remain verified and explicit',()=>{
 const s=session('missing-media'),t=s.config.tasks.find(t=>t.sample?.missing);assert.throws(()=>s.send(t,{action:'view'}),/Chưa có/);
 const samples=r.presentations(fixture('flashcards'));assert.ok(samples.some(p=>p.role==='alternate_angle'));assert.ok(samples.some(p=>p.role==='annotated_video'));
 assert.equal(r.hasMissing({type:'mixed',parts:[{type:'video',content:'/a',highlightVideo:{type:'video',missing:true}}]}),true);
});
test('G2 technical media cannot be published even after removing fixture flags',()=>{
 const c=fixture('flashcards');delete c.fixture_only;delete c.example_only;c.blocked_by_decisions=[];c.policy.status='approved';
 assert.throws(()=>r.validate(c,true),/Video kỹ thuật/);
});
test('G2 compiler respects declared required roles and rejects image-as-sign-video',()=>{
 const a=author('flashcards');a.rounds[0].presentation.required_asset_roles=['hand_image'];
 const compiled=compiler.compile(a,context());assert.ok(compiled.media_warnings.some(w=>w.missingRole==='hand_image'));
 const ctx=context();ctx.assets=structuredClone(ctx.assets);ctx.assets.find(a=>a.asset_id==='A-video').media_type='image';
 assert.throws(()=>compiler.compile(author('flashcards'),ctx),/sai loại học liệu/);
});

test('G2 retains G1 result semantics and hides scored task labels',()=>{
 const quiz=r.snapshot(fixture('quiz'));
 assert.ok(r.publicConfig(quiz).tasks.every(t=>!('label' in t)));
 const viewed=session('flashcards');
 for(const t of viewed.config.tasks)viewed.send(t,{action:'view'});
 const result=r.summarize(viewed.config,viewed.answers);
 assert.equal(result.reviewStatus,'viewed_all');assert.equal(result.score,0);assert.equal(result.stars,0);assert.equal(result.isCompleted,1);
 const recording=session('recording');
 for(const t of recording.config.tasks)recording.send(t,{uploadId:'synthetic-upload'});
 const pending=r.summarize(recording.config,recording.answers);
 assert.equal(pending.reviewStatus,'pending_review');assert.equal(pending.stars,0);assert.equal(pending.isCompleted,0);
});
