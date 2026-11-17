const { randomUUID, randomInt } = require('node:crypto');
const fail = (message, status = 422) => { throw Object.assign(new Error(message), { status }); };
const shuffled = list => { const a = [...list]; for (let i=a.length-1;i>0;i--) { const j=randomInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const read = row => typeof row.response==='string' ? JSON.parse(row.response) : row.response;
const payload = row => typeof row.payload==='string' ? JSON.parse(row.payload) : row.payload || {};
const history = (answers,id) => answers.filter(a=>a.task_id===id);
const last = (answers,id) => history(answers,id).map(read).at(-1);

function terminal(config, task, answers) {
    const h=history(answers,task.id).map(read);
    if (task.kind==='recording') return h.some(a=>a.reviewStatus==='pending_review');
    if (h.some(a=>a.correct===true)) return true;
    return h.some(a=>a.exhausted===true);
}
function roundState(config, answers=[]) {
    const results=[];
    for (const round of config.rounds) {
        const tasks=config.tasks.filter(t=>t.roundId===round.id);
        const complete=tasks.every(t=>terminal(config,t,answers));
        const solved=tasks.every(t=>history(answers,t.id).some(a=>read(a).correct===true));
        const dependencies=round.unlockAfterRound ? [round.unlockAfterRound] : [];
        const available=dependencies.every(id=>{
            const dependency=results.find(r=>r.id===id);
            return round.unlockCondition==='solved_all' ? dependency?.solved : dependency?.complete;
        });
        results.push({id:round.id,available,complete,solved});
    }
    return results;
}
function validatePresentation(p) {
    if(!p || !['text','image','video','counting','mixed'].includes(p.type)) fail('Kiểu trình bày không hợp lệ');
    if(p.missing) return;
    if(p.type==='mixed') { if(!p.parts?.length) fail('Trình bày ghép thiếu thành phần'); p.parts.forEach(validatePresentation); return; }
    if(p.type==='counting') {
        if(!Number.isInteger(p.count)||p.count<1||p.count>10||![1,2].includes(p.rows)) fail('Nhóm đếm cần 1–10 vật, 1/2 hàng');
        if(!Array.isArray(p.objects)||p.objects.length!==p.count||new Set(p.objects.map(o=>o.id)).size!==p.count) fail('Số vật không khớp dữ liệu đếm');
        p.objects.forEach(o=>{validatePresentation(o.presentation);if(o.x!==undefined&&(!Number.isFinite(o.x)||!Number.isFinite(o.y)||o.x<0||o.x>1||o.y<0||o.y>1))fail('Hotspot không hợp lệ');});
        if(p.background){validatePresentation(p.background);if(p.objects.some(o=>o.x===undefined||o.y===undefined))fail('Ảnh nhóm thiếu hotspot từng vật');}
        return;
    }
    if(typeof p.content!=='string'||!p.content) fail('Học liệu thiếu nội dung');
    if(p.type!=='text' && /defaultvideo|\/dictionary(?:[/?#]|$)/i.test(p.content)) fail('Placeholder/lookup không phải học liệu');
    if(p.angles) p.angles.forEach(validatePresentation);
    if(p.highlightVideo) validatePresentation(p.highlightVideo);
}
function validate(config, published=false) {
    if(config.runtime_version!==2 || !config.tasks?.length || !config.rounds?.length) fail('Thiếu tasks/rounds v2');
    const kind={FlipCardViewer:'view',ChoiceQuizGame:'choice',LineMatchingGame:'pair',JigsawPuzzleGame:'pair',BucketDropGame:'choice',SequenceOrderGame:'sequence',MemoryCardGame:'memory',VideoPracticeRecorder:'recording'}[config.game_type];
    if(!kind)fail('Loại game không hỗ trợ');
    const taskIds=new Set(),roundIds=new Set();
    for(const round of config.rounds){
        if(typeof round.id!=='string'||!round.id||roundIds.has(round.id))fail('Round ID trùng/thiếu');
        if(round.unlockAfterRound&&!roundIds.has(round.unlockAfterRound))fail('Round unlock phải trỏ tới lượt trước, không có vòng lặp');
        roundIds.add(round.id);
        const tasks=config.tasks.filter(t=>t.roundId===round.id);
        if(!tasks.length)fail('Round rỗng');
        const limit=kind==='view'?6:kind==='pair'?5:config.game_type==='BucketDropGame'?8:Infinity;
        if(tasks.length>limit)fail('Round vượt giới hạn thẻ/cặp/mục');
        if(kind==='pair'){
            const optionIds=tasks[0].options?.map(o=>o.id).sort();
            if(tasks.length<2||tasks.some(t=>JSON.stringify(t.options?.map(o=>o.id).sort())!==JSON.stringify(optionIds)))fail('Hai cột cần cùng tập lựa chọn trong round');
            if(new Set(tasks.flatMap(t=>t.correct||[])).size!==tasks.length)fail('Cặp ghép phải một-một');
        }
    }
    for(const task of config.tasks){
        if(typeof task.id!=='string'||!task.id||task.id.length>100||taskIds.has(task.id)||!roundIds.has(task.roundId)||task.kind!==kind)fail('Task/round không hợp lệ');
        taskIds.add(task.id);validatePresentation(task.prompt);
        if(task.sample)validatePresentation(task.sample);
        if(task.kind==='recording'&&task.recording){for(const [key,ceiling]of [['maxSeconds',120],['maxBytes',10485760]]){const value=task.recording[key];if(value!==undefined&&value!==null&&(!Number.isInteger(value)||value<1||value>ceiling))fail('Giới hạn quay thử không hợp lệ: '+key);}}
        if(task.kind==='memory'){
            if(!Array.isArray(task.pairs)||task.pairs.length<3||task.pairs.length>6||new Set(task.pairs.map(p=>p.id)).size!==task.pairs.length)fail('Memory cần 3–6 cặp riêng biệt');
            task.pairs.forEach(p=>{validatePresentation(p.left);validatePresentation(p.right);});
        }else if(['choice','pair','sequence'].includes(task.kind)){
            const unassigned=config.game_type==='BucketDropGame'&&typeof task.blockedReason==='string'&&task.blockedReason.length>0;
            if(!Array.isArray(task.options)||!task.options.length||new Set(task.options.map(o=>o.id)).size!==task.options.length)fail('Option ID thiếu/trùng');
            task.options.forEach(o=>validatePresentation(o.presentation));
            if(!Array.isArray(task.correct)||(!task.correct.length&&!unassigned)||task.correct.some(id=>!task.options.some(o=>o.id===id)))fail('Khóa đáp án không thuộc task');
            if(task.kind!=='sequence'&&task.correct.length!==(unassigned?0:1))fail('Cần đúng một đáp án');
            if(unassigned&&published)fail('Mục chưa phân loại không được publish');
            if(task.kind==='choice'&&task.options.length<2)fail('Quiz/giỏ cần ít nhất hai lựa chọn');
            if(config.game_type==='ChoiceQuizGame'&&!config.legacy&&![2,3].includes(task.options.length))fail('Quiz cần 2 hoặc 3 lựa chọn');
            if(task.kind==='sequence'&&(task.correct.length!==task.options.length||new Set(task.correct).size!==task.correct.length||(task.fixedSlots||[]).some(i=>!Number.isInteger(i)||i<0||i>=task.correct.length)))fail('Dãy/fixed slots không hợp lệ');
            if(task.fixedSlots?.length===task.correct.length)fail('Dãy không còn ô để học sinh làm');
        }
        if(task.maxRetries!==undefined&&task.maxRetries!==null&&(!Number.isInteger(task.maxRetries)||task.maxRetries<0))fail('Retry không hợp lệ');
        if(published&&[task.prompt,task.sample,...(task.options||[]).map(o=>o.presentation),...(task.pairs||[]).flatMap(p=>[p.left,p.right])].filter(Boolean).some(hasMissing))fail('Chưa có đủ học liệu');
    }
    const p=config.policy;
    if(config.compound){const compound=config.compound;
        if(config.game_type!=='VideoPracticeRecorder'||!['sentence','dialogue'].includes(compound.kind)||!Array.isArray(compound.units)||!compound.units.length||new Set(compound.units.map(u=>u.id)).size!==compound.units.length)fail('Nội dung câu/hội thoại không hợp lệ');
        compound.units.forEach((u,i)=>{if(typeof u.text!=='string'||!u.text.trim()||u.order!==i+1||typeof u.id!=='string'||!u.id||(compound.kind==='dialogue'&&(u.speaker!==null&&(typeof u.speaker!=='string'||!u.speaker.trim())||u.speaker===null&&!u.blockedReason)))fail('Lời hoặc thứ tự hội thoại không hợp lệ');});
        const speakers=[...new Set(compound.units.map(u=>u.speaker).filter(Boolean))];
        if(!Array.isArray(compound.speakers)||new Set(compound.speakers).size!==compound.speakers.length||speakers.length!==compound.speakers.length||speakers.some(s=>!compound.speakers.includes(s)))fail('Danh sách vai không khớp lời thoại');
        if(compound.practiceSpeaker&&!compound.speakers.includes(compound.practiceSpeaker))fail('Vai thực hành không thuộc hội thoại');
        for(const task of config.tasks){const unit=compound.units.find(u=>u.id===task.id);if(!unit||task.prompt.type!=='text'||task.prompt.content!==unit.text||(task.blockedReason||null)!==(unit.blockedReason||null))fail('Mục quay không khớp câu/lượt nguồn');if(compound.practiceSpeaker&&unit.speaker!==compound.practiceSpeaker)fail('Mục không thuộc vai được giao');}
        validatePresentation(compound.model);
        if(published&&(compound.editorialStatus!=='approved'||compound.units.some(u=>u.blockedReason)||hasMissing(compound.model)))fail('Câu/hội thoại chưa được duyệt hoặc thiếu mẫu');
    }
    if(!p||!['all_correct','viewed_all','score','review'].includes(p.completion)||!(p.max_retries===null||Number.isInteger(p.max_retries)&&p.max_retries>=0))fail('Chính sách kết quả không hợp lệ');
    if(p.completion==='score'&&(!Number.isFinite(p.pass_score)||p.pass_score<0||p.pass_score>100))fail('Ngưỡng điểm không hợp lệ');
    if(p.star_thresholds!==null&&(!Array.isArray(p.star_thresholds)||p.star_thresholds.length!==3||p.star_thresholds.some((n,i,a)=>!Number.isFinite(n)||n<0||n>100||(i>0&&n<a[i-1]))))fail('Ngưỡng sao không hợp lệ');
    if(p.memory_stars&&(!Array.isArray(p.memory_stars)||p.memory_stars.length!==3||p.memory_stars.some((rule,i,a)=>!Number.isInteger(rule.max_moves)||rule.max_moves<1||rule.stars!==3-i||(i>0&&rule.max_moves<=a[i-1].max_moves))))fail('Chính sách sao memory không hợp lệ');
    if(published&&(config.fixture_only||config.example_only||config.legacy||config.previewNavigation||config.blocked_by_decisions?.length||config.media_warnings?.length||p.status!=='approved'||!config.source_refs?.length||!config.asset_ids?.length))fail('Cấu hình thử/chưa duyệt không được publish');
    if(published&&presentations(config).some(p=>p.technicalSample))fail('Video kỹ thuật không được publish thành mẫu ký hiệu');
    return config;
}
function hasMissing(p){return !!p.missing || (p.parts||[]).some(hasMissing) || (p.objects||[]).some(o=>hasMissing(o.presentation)) || (p.angles||[]).some(hasMissing) || !!(p.background&&hasMissing(p.background)) || !!(p.highlightVideo&&hasMissing(p.highlightVideo));}
function presentations(config){const result=[];function collect(p){if(!p)return;result.push(p);(p.parts||[]).forEach(collect);(p.objects||[]).forEach(o=>collect(o.presentation));(p.angles||[]).forEach(collect);collect(p.background);collect(p.highlightVideo);}collect(config.compound?.model);
    config.tasks.forEach(t=>{collect(t.prompt);collect(t.sample);(t.options||[]).forEach(o=>collect(o.presentation));(t.pairs||[]).forEach(p=>{collect(p.left);collect(p.right);});});return result;
}
function snapshot(config) {
    const result=structuredClone(config);const aliases=new Map();
    const id=(round,key)=>{const k=`${round}:${key}`;if(!aliases.has(k))aliases.set(k,randomUUID());return aliases.get(k);};
    for(const t of result.tasks){
        if(t.options){t.options=t.options.map(o=>({...o,id:id(t.roundId,o.id)}));t.correct=t.correct.map(k=>id(t.roundId,k));if(t.shuffle!==false)t.options=shuffled(t.options);}
        if(t.kind==='memory')t.cards=shuffled(t.pairs.flatMap(p=>[{id:randomUUID(),pairId:p.id,presentation:p.left},{id:randomUUID(),pairId:p.id,presentation:p.right}]));
    }
    for(const round of result.rounds)if(round.shuffleTasks) {const ordered=shuffled(result.tasks.filter(t=>t.roundId===round.id));let i=0;result.tasks=result.tasks.map(t=>t.roundId===round.id?ordered[i++]:t);}
    return result;
}
function publicConfig(config,answers=[]){return {
    runtime_version:2,game_type:config.game_type,icon:config.icon,title:config.title,instruction:config.instruction,
    compound:config.compound?{kind:config.compound.kind,groupCode:config.compound.groupCode,variantCode:config.compound.variantCode,sourceColumn:config.compound.sourceColumn,editorialStatus:config.compound.editorialStatus,practiceSpeaker:config.compound.practiceSpeaker,speakers:config.compound.speakers,units:config.compound.units.map(({id,order,text,speaker,blockedReason})=>({id,order,text,speaker,blockedReason})),model:config.compound.model}:undefined,
    policy:{max_retries:config.policy.max_retries,no_penalty:!!config.policy.no_penalty,completion:config.policy.completion},
    rounds:config.rounds.map(r=>({id:r.id,title:r.title,unlockAfterRound:r.unlockAfterRound,unlockCondition:r.unlockCondition,...roundState(config,answers).find(s=>s.id===r.id)})),
    tasks:config.tasks.map(t=>({id:t.id,roundId:t.roundId,kind:t.kind,...(['view','recording'].includes(t.kind)?{label:t.label}:{}),prompt:t.prompt,sample:t.sample,blockedReason:t.blockedReason,options:t.options?.map(o=>({id:o.id,presentation:o.presentation})),
        fixedOptions:t.kind==='sequence'?Object.fromEntries((t.fixedSlots||[]).map(i=>[i,t.correct[i]])):undefined,
        keepCorrect:!!t.keepCorrect,staircase:!!t.staircase,maxRetries:t.maxRetries,requireCount:!!t.requireCount,
        cards:t.kind==='memory'?t.cards.map(card=>({id:card.id,presentation:card.presentation})):undefined,
        pairCount:t.kind==='memory'?t.pairs.length:undefined,recording:t.recording}))
};}
function grade(config,task,input,answers=[]){
    if(task.blockedReason)fail(task.blockedReason);
    if(!roundState(config,answers).find(r=>r.id===task.roundId)?.available)fail('Lượt chơi chưa mở',409);
    const h=history(answers,task.id),previous=h.map(read);
    if(terminal(config,task,answers))fail('Mục đã kết thúc',409);
    const base={roundId:task.roundId,terminal:false};
    if(input.action==='count'){
        if(task.prompt.type!=='counting'||!task.prompt.objects.some(o=>o.id===input.objectId))fail('Vật đếm không thuộc câu hỏi',400);
        const counted=[...new Set([...previous.flatMap(a=>a.countedIds||[]),input.objectId])];return {...base,correct:null,eventKind:'count',countedIds:counted};
    }
    if(task.kind==='memory')return memoryGrade(task,input,h,base);
    if(task.kind==='view'){
        if(input.action!=='view')fail('Sự kiện xem không hợp lệ',400);
        if(task.sample&&hasMissing(task.sample))fail('Chưa có học liệu mẫu cho thẻ này');
        return {...base,terminal:true,correct:true,eventKind:'view'};
    }
    if(task.kind==='recording')return {...base,terminal:true,correct:null,reviewStatus:'pending_review'};
    const choices=input.choiceIds;
    if(!Array.isArray(choices)||new Set(choices).size!==choices.length||choices.some(id=>!task.options.some(o=>o.id===id))||choices.length!==(task.kind==='sequence'?task.correct.length:1))fail('Đáp án không thuộc task',400);
    if(task.requireCount&&new Set(previous.flatMap(a=>a.countedIds||[])).size!==task.prompt.count)fail('Hãy đếm đủ từng vật trước khi chọn đáp án',409);
    const locked=Object.fromEntries((task.fixedSlots||[]).map(i=>[i,task.correct[i]]));
    if(task.keepCorrect)for(const a of previous)Object.assign(locked,a.lockedOptions||{});
    if(task.kind==='sequence'&&Object.entries(locked).some(([i,id])=>choices[Number(i)]!==id))fail('Không được thay đổi ô đã đúng/cố định',400);
    const correct=choices.every((id,i)=>id===task.correct[i]);
    const tries=previous.filter(p=>p.eventKind==='answer').length+1;
    const limit=task.maxRetries!==undefined?task.maxRetries:config.policy.max_retries;
    const exhausted=!correct&&limit!==null&&tries>=limit+1;
    const feedback={...base,correct,terminal:correct||exhausted,exhausted,tries,eventKind:'answer',remainingTries:limit===null?null:Math.max(0,limit+1-tries),choiceIds:choices};
    if(task.kind==='sequence')feedback.lockedOptions=Object.fromEntries(choices.flatMap((id,i)=>id===task.correct[i]?[[i,id]]:[]));
    if(exhausted||correct)feedback.correctOptionIds=task.kind==='choice'?task.correct:undefined;
    if(!correct&&!exhausted)feedback.hint={replaySpeed:0.5,showHighlight:true};
    return feedback;
}
function memoryGrade(task,input,h,base){
    const responses=h.map(read);const prev=responses.at(-1)||{};
    const matched=new Set(prev.matchedIds||[]);const open=prev.openCardId;
    if(input.action!=='flip'||!task.cards.some(c=>c.id===input.cardId)||matched.has(input.cardId)||input.cardId===open)fail('Thẻ lật không hợp lệ',400);
    if(!open)return {...base,correct:null,eventKind:'flip',openCardId:input.cardId,matchedIds:[...matched],moves:prev.moves||0};
    const first=task.cards.find(c=>c.id===open),second=task.cards.find(c=>c.id===input.cardId);
    const match=first.pairId===second.pairId;const moves=(prev.moves||0)+1;
    if(match){matched.add(open);matched.add(input.cardId);}
    const complete=matched.size===task.cards.length;
    return {...base,correct:complete?true:null,eventKind:'flip',terminal:complete,openCardId:null,matchedIds:[...matched],moves,pairMatched:match,revealedIds:[open,input.cardId]};
}
function summarize(config,answers){
    const assessed=config.tasks.filter(t=>terminal(config,t,answers));
    const solved=config.tasks.filter(t=>history(answers,t.id).some(a=>read(a).correct===true));
    const recording=config.tasks.some(t=>t.kind==='recording');
    const firstCorrect=config.tasks.filter(t=>history(answers,t.id).map(read).find(a=>a.eventKind==='answer')?.correct===true).length;
    const viewed=config.game_type==='FlipCardViewer';
    const score=recording||viewed?0:Math.round(solved.length/config.tasks.length*100);
    let stars=(config.policy.star_thresholds||[]).filter(n=>score>=n).length;
    const moves=config.tasks.filter(t=>t.kind==='memory').reduce((n,t)=>n+(last(answers,t.id)?.moves||0),0);
    if(config.game_type==='MemoryCardGame')stars=(config.policy.memory_stars||[]).find(rule=>moves<=rule.max_moves)?.stars||0;
    const complete=!recording&&assessed.length===config.tasks.length&&(config.policy.completion==='score'?score>=config.policy.pass_score:solved.length===config.tasks.length);
    return {score,stars:recording||viewed?0:stars,isCompleted:Number(complete),answered:assessed.length,required:config.tasks.length,firstCorrect,moves,reviewStatus:recording?'pending_review':config.game_type==='FlipCardViewer'?'viewed_all':'assessed'};
}
function fromLegacy(config){
    if(!config.tasks.length)return config;
    const clean=p=>p&&p.type!=='text'&&/defaultvideo|\/dictionary(?:[/?#]|$)/i.test(p.content||'')?{type:p.type,missing:true,label:p.label,role:p.type==='video'?'sign_video':'illustration'}:p;
    const result={...config,runtime_version:2,rounds:[],tasks:[],policy:{...config.policy,max_retries:config.game_type==='ChoiceQuizGame'?0:config.policy.max_retries}};
    const memory=config.game_type==='MemoryCardGame';const max=memory?6:config.game_type==='FlipCardViewer'?6:['LineMatchingGame','JigsawPuzzleGame'].includes(config.game_type)?5:config.game_type==='BucketDropGame'?8:config.tasks.length;
    const parts=Math.ceil(config.tasks.length/max),size=Math.floor(config.tasks.length/parts);let offset=0;
    for(let n=0;n<parts;n++){
        const part=config.tasks.slice(offset,offset+size+(n<config.tasks.length%parts?1:0));offset+=part.length;const roundId=`legacy-${n+1}`;
        result.rounds.push({id:roundId,title:`Lượt ${n+1}`,unlockAfterRound:n?`legacy-${n}`:undefined,unlockCondition:'answered_all'});
        if(memory){result.tasks.push({id:`${roundId}:board`,roundId,kind:'memory',prompt:{type:'text',content:'Lật thẻ tìm cặp'},pairs:part.map(t=>({id:t.id,left:clean(t.prompt),right:t.options.find(o=>t.correct.includes(o.id)).presentation}))});continue;}
        for(const t of part){const next={...t,roundId,prompt:clean(t.prompt),options:t.options?.map(o=>({...o,presentation:clean(o.presentation)}))};
            if(t.kind==='view'){next.prompt={type:'text',content:t.label||t.id};next.sample=clean(t.prompt);}
            if(t.kind==='pair')next.options=next.options.filter(o=>part.some(p=>p.correct.includes(o.id)));
            result.tasks.push(next);
        }
    }
    return result;
}
module.exports={validate,snapshot,publicConfig,grade,summarize,roundState,terminal,presentations,hasMissing,fromLegacy};
