const Ajv=require('ajv');
const schema=require('../schemas/game-config.schema.json');
const rounds=require('./curriculumRounds.service');
const check=new Ajv({allErrors:true,strict:false}).compile(schema);
const fail=message=>{throw Object.assign(new Error(message),{status:422});};
const chunks=(items,max,min=1)=>{const count=Math.ceil(items.length/max);const size=Math.floor(items.length/count);if(size<min)fail('Không thể chia đủ mục cho mỗi round');let offset=0;return Array.from({length:count},(_,i)=>{const length=size+(i<items.length%count?1:0);const part=items.slice(offset,offset+length);offset+=length;return part;});};

/** Compile author rounds against explicit item/asset references, never URL order. */
function compile(author,context){
 if(!check(author))fail(`Config schema: ${check.errors.map(e=>`${e.instancePath} ${e.message}`).join('; ')}`);
 const items=new Map(context.items.map(i=>[i.item_id,i]));const assets=context.assets||[];const used=new Set();const warnings=[];
 const get=id=>{const i=items.get(id);if(!i)fail(`Không tìm thấy item ${id}`);return i;};
 const text=id=>({type:'text',content:get(id).label,role:'text'});
 const asset=(id,role)=>{
  get(id);if(role==='text')return text(id);
  const matches=assets.filter(a=>a.item_id===id&&a.role===role);
  const preferred=context.defaultAssetIds?.[`${id}:${role}`];
  if(matches.length>1&&!preferred)fail(`Cần chọn asset tường minh cho ${id}/${role}`);
  const a=preferred?matches.find(a=>a.asset_id===preferred):matches[0];
  if(preferred&&!a)fail(`Asset đã chọn không thuộc ${id}/${role}`);
  if(!a){warnings.push({itemId:id,missingRole:role});return {type:['illustration','hand_image','counting_prompt','quantity_dots'].includes(role)?'image':'video',role,missing:true,label:get(id).label};}
  if(!a.url||/defaultvideo|\/dictionary(?:[/?#]|$)/i.test(a.url))fail(`Asset ${a.asset_id} là placeholder/lookup`);
  const expectedType=['illustration','hand_image','counting_prompt','quantity_dots'].includes(role)?'image':'video';
  if(a.media_type&&a.media_type!==expectedType)fail(`Asset ${a.asset_id} sai loại học liệu cho vai trò ${role}`);
  used.add(a.asset_id);
  const p={type:a.media_type||(role==='illustration'||role==='hand_image'?'image':'video'),content:a.url,label:get(id).label,role,...(a.technical_sample?{technicalSample:true}:{})};
  if(role==='sign_video'){
   const angles=assets.filter(other=>other.item_id===id&&other.role==='alternate_angle');
   if(angles.length)p.angles=angles.map(other=>{used.add(other.asset_id);return {type:'video',content:other.url,label:'Góc nghiêng',role:'alternate_angle',technicalSample:!!other.technical_sample};});
   const overlay=assets.find(other=>other.item_id===id&&other.role==='annotated_video');
   if(overlay){used.add(overlay.asset_id);p.highlightVideo={type:'video',content:overlay.url,label:'Vị trí cần chú ý',role:'annotated_video',technicalSample:!!overlay.technical_sample};}
  }
  return p;
 };
 const present=(id,kind,showQuantity=false,quantitySource='generated')=>{
  if(kind==='mixed'){
   const parts=[asset(id,'illustration'),text(id)];const n=get(id).numeric_value;
   if(showQuantity&&Number.isInteger(n)&&n>=1&&n<=10)parts.push(quantitySource==='asset'?asset(id,'quantity_dots'):{type:'counting',count:n,rows:n>5?2:1,objects:Array.from({length:n},(_,i)=>({id:`dot-${i+1}`,presentation:{type:'text',content:'●'}}))});
   return {type:'mixed',parts};
  }
  return asset(id,{image:'illustration',illustration:'illustration',sign_video:'sign_video',hand_image:'hand_image',counting:'counting_prompt',text:'text'}[kind]||'text');
 };
 const result={runtime_version:2,game_type:author.game_type,title:author.title||author.activity_code,instruction:author.instruction,fixture_only:!!author.fixture_only,example_only:!!author.example_only,
  source_refs:author.source_refs,blocked_by_decisions:[...(author.decision_ids||[])],rounds:[],tasks:[],policy:{status:author.policy.status,no_penalty:author.policy.no_penalty===true,max_retries:author.policy.max_retries,
   completion:author.policy.completion_basis==='viewed_all'?'viewed_all':author.game_type==='VideoPracticeRecorder'?'review':'all_correct',pass_score:null,star_thresholds:null}};
 if(author.policy.retry_count_definition==='total_selections'&&result.policy.max_retries!==null)result.policy.max_retries=Math.max(0,result.policy.max_retries-1);
 if(author.policy.status!=='approved'&&!result.blocked_by_decisions.includes('D05'))result.blocked_by_decisions.push('D05');
 if(author.policy.stars_policy_id){const policy=context.starPolicies?.[author.policy.stars_policy_id];if(!policy)fail('Không tìm thấy chính sách sao được tham chiếu');result.policy.star_thresholds=policy.thresholds||null;result.policy.memory_stars=policy.memory_stars;}
 if(author.icon_asset_id){const icon=assets.find(a=>a.asset_id===author.icon_asset_id);if(!icon)fail('Không tìm thấy icon asset');result.icon=icon.url;used.add(icon.asset_id);}
 const roundAliases=new Map();
 for(const r of author.rounds){
  if(roundAliases.has(r.round_id))fail('Round ID trùng');
  r.item_ids.forEach(get);const p=r.presentation;const game=author.game_type;let tasks=[];
  for(const id of r.item_ids)for(const role of p.required_asset_roles||[])asset(id,role);
  const task=(id,item,kind,extra={})=>({id:`${r.round_id}:${id}`,kind,label:get(item).label,...(extra.prompt?{}:{prompt:present(item,p.prompt_kind,p.show_quantity,p.quantity_source)}),...extra});
  if(game==='FlipCardViewer')tasks=r.item_ids.map(id=>task(id,id,'view',{sample:asset(id,'sign_video')}));
  else if(game==='ChoiceQuizGame')tasks=r.questions.map(q=>{
   get(q.prompt_item_id);const ids=new Set(q.options.map(o=>o.option_id));if(ids.size!==q.options.length||!ids.has(q.server_correct_option_id))fail('Question options/đáp án không hợp lệ');
   let prompt;const counting=q.counting||(p.prompt_kind==='counting'?p:null);
   if(counting){const item=get(counting.object_item_id);const source=assets.find(a=>a.item_id===item.item_id&&a.role==='illustration');
    if(source?.object_count!==1)fail('Đếm vật lặp cần ảnh đúng một vật; không suy một ảnh là một vật');
    const correct=get(q.options.find(o=>o.option_id===q.server_correct_option_id).item_id);const number=correct.numeric_value??(correct.sense==='number_3'?3:Number(correct.label));
    if(number!==counting.object_count)fail('Số lượng vật và đáp án số không khớp');
    prompt={type:'counting',count:counting.object_count,rows:counting.object_rows||1,objects:Array.from({length:counting.object_count},(_,i)=>({id:`object-${i+1}`,presentation:asset(item.item_id,'illustration')}))};
   }else prompt=present(q.prompt_item_id,q.prompt_kind||p.prompt_kind);
   return task(q.question_id,q.prompt_item_id,'choice',{prompt,options:q.options.map(o=>({id:o.option_id,presentation:present(o.item_id,o.presentation_kind||p.response_kind)})),correct:[q.server_correct_option_id],requireCount:!!counting&&p.tap_to_count!==false});
  });
  else if(game==='SequenceOrderGame'){
   const sequences=r.sequences||[{sequence_id:'sequence',server_sequence:r.server_sequence,fixed_slots:r.fixed_slots}];
   tasks=sequences.map(s=>{if(!s.server_sequence?.length||new Set(s.server_sequence).size!==s.server_sequence.length||s.server_sequence.some(id=>!r.item_ids.includes(id)))fail('Dãy không thuộc tập item của round');
    return {id:`${r.round_id}:${s.sequence_id}`,kind:'sequence',prompt:{type:'text',content:s.staircase?'Xếp theo bậc thang':'Điền và sắp xếp dãy'},options:s.server_sequence.map(id=>({id,presentation:present(id,p.prompt_kind)})),correct:s.server_sequence,fixedSlots:s.fixed_slots||[],keepCorrect:r.keep_correct_on_retry===true,staircase:!!s.staircase};});
  }else if(game==='BucketDropGame'){
   if(!r.buckets?.length||!r.server_bucket_assignments?.length)fail('Giỏ cần khai báo đáp án tường minh');
   const bIds=new Set(r.buckets.map(b=>b.bucket_id));if(bIds.size!==r.buckets.length)fail('Bucket ID trùng');
   const mapped=new Map();for(const a of r.server_bucket_assignments){if(mapped.has(a.item_id)||!r.item_ids.includes(a.item_id)||!bIds.has(a.bucket_id))fail('Item/giỏ không hợp lệ');mapped.set(a.item_id,a.bucket_id);}
   const unassigned=new Set(r.unassigned_item_ids||[]);
   if([...unassigned].some(id=>!r.item_ids.includes(id)||mapped.has(id))||unassigned.size&&author.publication_status!=='draft')fail('Mục chưa phân loại chỉ được giữ trong bản nháp');
   tasks=r.item_ids.map(id=>{if(!mapped.has(id)&&!unassigned.has(id))fail(`Item ${id} không có giỏ`);return task(id,id,'choice',{options:r.buckets.map(b=>({id:b.bucket_id,presentation:{type:'text',content:b.label,...(b.icon_asset_id?{icon:assets.find(a=>a.asset_id===b.icon_asset_id)?.url}:{})}})),correct:mapped.has(id)?[mapped.get(id)]:[],...(unassigned.has(id)?{blockedReason:'Chưa chốt giỏ phù hợp trong nguồn; giữ mục này để biên tập.'}:{}),...(p.show_sample?{sample:asset(id,'sign_video')}:{})});});
  }else if(game==='VideoPracticeRecorder'){
   const ids=r.recording?.target_item_ids||r.item_ids;if(ids.some(id=>!r.item_ids.includes(id)))fail('Mục quay không thuộc round');
   tasks=ids.map(id=>task(id,id,'recording',{sample:asset(id,'sign_video'),recording:r.recording?{maxSeconds:r.recording.max_seconds,maxBytes:r.recording.max_bytes}:undefined}));
  }else{
   const pairs=r.pairs||r.item_ids.map(id=>({pair_id:id,left_item_id:id,right_item_id:id,left_role:p.prompt_kind==='mixed'?'illustration':p.prompt_kind,right_role:p.response_kind==='pairing'?'sign_video':p.response_kind}));
   if(new Set(pairs.map(p=>p.pair_id)).size!==pairs.length)fail('Pair ID trùng');
   tasks=pairs.map(pair=>task(pair.pair_id,pair.left_item_id,'pair',{prompt:present(pair.left_item_id,pair.left_role),options:[],correct:[pair.pair_id],right:present(pair.right_item_id,pair.right_role),pairKey:pair.pair_id}));
  }
  const max=game==='FlipCardViewer'?Math.min(p.max_cards||6,6):['LineMatchingGame','JigsawPuzzleGame','MemoryCardGame'].includes(game)?Math.min(p.max_pairs||(game==='MemoryCardGame'?6:5),game==='MemoryCardGame'?6:5):game==='BucketDropGame'?8:tasks.length;
  const parts=chunks(tasks,max,['LineMatchingGame','JigsawPuzzleGame'].includes(game)?2:game==='MemoryCardGame'?3:1);
  const dependency=r.unlock_after_round?roundAliases.get(r.unlock_after_round):result.rounds.at(-1)?.id;
  if(r.unlock_after_round&&!dependency)fail('Round unlock không tồn tại hoặc tạo vòng lặp');
  for(const [i,part]of parts.entries()){
   const id=parts.length>1?`${r.round_id}-${i+1}`:r.round_id;
   result.rounds.push({id,title:parts.length>1?`${r.title||r.round_id} · ${i+1}/${parts.length}`:r.title||r.round_id,unlockAfterRound:i?result.rounds.at(-1).id:dependency,unlockCondition:r.unlock_after_round?'solved_all':'answered_all',shuffleTasks:r.shuffle===true});
   if(game==='MemoryCardGame')result.tasks.push({id:`${id}:board`,roundId:id,kind:'memory',prompt:{type:'text',content:'Lật hai thẻ để tìm cặp'},pairs:part.map(t=>({id:t.pairKey,left:t.prompt,right:t.right}))});
   else {const options=part.map(right=>({id:right.pairKey,presentation:right.right}));for(const t of part){t.roundId=id;t.shuffle=r.shuffle!==false;if(t.kind==='pair'){t.options=options;delete t.right;delete t.pairKey;}result.tasks.push(t);}}
  }
  roundAliases.set(r.round_id,result.rounds.at(-1).id);
 }
 result.asset_ids=[...used];result.media_warnings=warnings;
 rounds.validate(result,author.publication_status==='published');
 return result;
}
module.exports={compile,validateAuthor:check,chunks};
