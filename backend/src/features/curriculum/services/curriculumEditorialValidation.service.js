// Draft edits and import/runtime share the same structural validator.
const c=require('./curriculumContent.service');
function diff(before,after,path=''){if(c.hash(before??null)===c.hash(after??null))return [];if(before&&after&&typeof before==='object'&&typeof after==='object'&&Array.isArray(before)===Array.isArray(after)){return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().flatMap(k=>diff(before[k],after[k],path+'/'+k));}return [{path:path||'/',before:before??null,after:after??null}];}
function guardJson(value){if(JSON.stringify(value).length>512000)c.fail('Cấu hình vượt giới hạn biên tập',413);function walk(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))c.fail('Khóa cấu hình không hợp lệ');walk(x);}}walk(value);}
function presentations(config){const slots=[];function walk(p,path,task){if(!p||typeof p!=='object')return;if(['image','video'].includes(p.type))slots.push({path,value:p,task});for(const [k,v]of Object.entries(p))if(v&&typeof v==='object'){if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'/'+k+'/'+i,task));else walk(v,path+'/'+k,task);}}
 if(config.icon)slots.push({path:'/icon',value:{type:'image',role:'activity_icon',content:config.icon,label:config.title},task:null});
 walk(config.compound?.model,'/compound/model',null);(config.tasks||[]).forEach((t,i)=>{for(const k of ['prompt','sample'])walk(t[k],`/tasks/${i}/${k}`,t);(t.options||[]).forEach((o,j)=>walk(o.presentation,`/tasks/${i}/options/${j}/presentation`,t));(t.pairs||[]).forEach((p,j)=>{walk(p.left,`/tasks/${i}/pairs/${j}/left`,t);walk(p.right,`/tasks/${i}/pairs/${j}/right`,t);});});return slots;
}
const url=a=>a.playable_url||null;
function slots(config,items,assets){return presentations(config).map(s=>{
 let ids=[];const old=assets.filter(a=>url(a)===s.value.content&&a.role===(s.value.role||'illustration')&&(config.asset_ids||[]).includes(a.asset_id));if(old.length)ids=[...new Set(old.map(a=>a.item_id))];
 if(!ids.length&&s.task){const unit=config.compound?.units.find(u=>u.id===s.task.id),direct=items.find(i=>s.task.id.endsWith(':'+i.item_id));if(unit)ids=[unit.itemId];else if(direct&&(!s.value.label||direct.label===s.value.label))ids=[direct.item_id];else ids=items.filter(i=>i.label===s.value.label&&(config.sourcePackage?.phase==='G4C'?i.item_id.startsWith('G4C-'):i.item_id.startsWith('CI-'))).map(i=>i.item_id);}
 // A label alone cannot identify the meaning of a homonym. Keep that slot unresolved.
 if(!old.length&&ids.length>1)ids=[];
 const role=s.value.role||'illustration',choices=assets.filter(a=>ids.includes(a.item_id)&&a.role===role&&url(a)&&!c.badMedia(url(a)));
 return {path:s.path,label:s.value.label||s.task?.label||s.path,role,type:s.value.type,itemIds:ids,missing:!!s.value.missing||!s.value.content,currentAssetId:old.find(a=>a.asset_id===config.editorRevision?.bindings?.[s.path])?.asset_id||old[0]?.asset_id||null,choices:choices.map(a=>({assetId:a.asset_id,itemId:a.item_id,url:url(a),label:items.find(i=>i.item_id===a.item_id)?.label||a.item_id,sense:items.find(i=>i.item_id===a.item_id)?.sense||null,verification:a.verification_status,role:a.role}))};
 });}
function mask(config){const v=structuredClone(config);for(const k of ['title','instruction','editorRevision','asset_ids'])delete v[k];
 for(const k of ['max_retries','no_penalty','pass_score','star_thresholds','memory_stars'])if(v.policy)delete v.policy[k];
 (v.rounds||[]).forEach(r=>{delete r.title;if(!v.compound)delete r.shuffleTasks;});
 (v.tasks||[]).forEach(t=>{for(const k of ['correct','maxRetries','shuffle','fixedSlots','keepCorrect','staircase','requireCount','recording'])delete t[k];});
 // Canonical words/turns/speakers remain source-owned until editorial decisions are resolved.
 function clean(x){if(!x||typeof x!=='object')return;if(['image','video'].includes(x.type)){delete x.content;delete x.missing;}Object.values(x).forEach(clean);}clean(v);delete v.icon;return v;
}
function pointer(config,path){const parts=path.split('/').slice(1);let p=config;for(const k of parts.slice(0,-1))p=p?.[k];return {parent:p,key:parts.at(-1),value:p?.[parts.at(-1)]};}
async function inspect(base,input,context){
 guardJson(input.config);const errors=[],mediaErrors=[];let candidate=structuredClone(input.config);
 try{c.validate(candidate);}catch(e){return {candidate,bindings:{},validation:{validDraft:false,errors:[e.message],mediaErrors:[],missing:[],openDecisions:base.blocked_by_decisions||[],publicationErrors:[e.message],canPublish:false,publicationBlockedByPhase:true},slots:slots(base,context.items,context.assets)};}
 for(const [path,value,limit]of [['title',candidate.title,1000],['instruction',candidate.instruction,10000],...(candidate.rounds||[]).map((r,i)=>[`rounds/${i}/title`,r.title,1000])])if(value!==undefined&&(typeof value!=='string'||value.length>limit))errors.push(`Nội dung ${path} phải là văn bản tối đa ${limit} ký tự.`);
 if(c.hash(base.editorRevision??null)!==c.hash(candidate.editorRevision??null))errors.push('Nhật ký phiên bản do server quản lý; không sửa editorRevision.');
 if(c.hash(base.asset_ids||[])!==c.hash(candidate.asset_ids||[]))errors.push('Chọn học liệu qua ánh xạ; không sửa asset_ids trực tiếp.');
 const immutable=diff(mask(base),mask(candidate));if(immutable.length)errors.push('Không được đổi nguồn, mã mục, cấu trúc, quyết định hoặc trạng thái duyệt: '+immutable.slice(0,8).map(d=>d.path).join(', '));
 const available=slots(base,context.items,context.assets),bindings=input.bindings||{};
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))c.fail('Ánh xạ học liệu không hợp lệ');
 const selected={};for(const [path,id]of Object.entries(bindings)){const slot=available.find(s=>s.path===path);if(!slot){mediaErrors.push(`Vị trí học liệu không thuộc phiên bản gốc: ${path}`);continue;}const target=pointer(candidate,path);if(!target.parent){mediaErrors.push(`Thiếu vị trí ${path}`);continue;}if(id===null){if(path==='/icon')delete target.parent[target.key];else{delete target.value.content;target.value.missing=true;}selected[path]=null;continue;}const asset=slot.choices.find(a=>a.assetId===Number(id));if(!asset){mediaErrors.push(`Học liệu sai mục/nghĩa/vai trò hoặc chưa có URL phát: ${path}`);continue;}if(path==='/icon')target.parent[target.key]=asset.url;else{target.value.content=asset.url;delete target.value.missing;}selected[path]=asset.assetId;}
 const used=new Set(base.asset_ids||[]);for(const slot of presentations(candidate)){const owner=available.find(s=>s.path===slot.path);if(!owner){mediaErrors.push(`Không thêm vị trí media ngoài cấu trúc nguồn: ${slot.path}`);continue;}if(slot.value.missing||!slot.value.content)continue;const asset=owner.choices.find(a=>a.assetId===(selected[slot.path]||owner.currentAssetId)&&a.url===slot.value.content)||owner.choices.find(a=>a.url===slot.value.content);if(!asset){mediaErrors.push(`URL không thuộc học liệu đúng mục/vai: ${slot.path}`);continue;}used.add(asset.assetId);selected[slot.path]=asset.assetId;}
 candidate.asset_ids=[...used];candidate.publication_status='draft';candidate.policy={...candidate.policy,ai_enabled:false};
 if(candidate.compound){for(const u of candidate.compound.units||[]){if(u.speaker!==null&&!base.compound.speakers.includes(u.speaker))errors.push(`Người nói chưa có trong phương án nguồn: ${u.speaker}`);if(candidate.compound.kind==='dialogue'&&u.speaker===null&&!u.blockedReason)errors.push('Lượt chưa rõ người nói phải tiếp tục bị chặn giao thực hành.');}}
 try{c.validate(candidate);}catch(e){errors.push(e.message);}
 const missing=presentations(candidate).filter(s=>s.value.missing||!s.value.content).map(s=>({path:s.path,label:s.value.label||s.path,role:s.value.role})),publicationErrors=[];
 try{c.validate(candidate,true);}catch(e){publicationErrors.push(e.message);}
 const assets=context.assets.filter(a=>candidate.asset_ids.includes(a.asset_id));if(assets.some(a=>a.verification_status!=='verified'||context.items.find(i=>i.item_id===a.item_id)?.approval_status!=='approved'||!a.playable_url))publicationErrors.push('Học liệu/mục học chưa được xác minh và duyệt đầy đủ.');
 return {candidate,bindings:selected,validation:{validDraft:!errors.length&&!mediaErrors.length,errors,mediaErrors,missing,openDecisions:candidate.blocked_by_decisions||[],publicationErrors,canPublish:false,publicationBlockedByPhase:true},slots:available};
}
module.exports={diff,mask,slots,inspect,presentations};
