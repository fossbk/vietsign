// Synthetic source data for infrastructure tests. No workbook text or customer media.
const {hash}=require('../../src/features/curriculum/services/curriculumContent.service');
const source={filename:'synthetic-g4c.txt',sha256:'4'.repeat(64)};
const refs=[{workbook:'synthetic',sheet:'synthetic',range:'F1:H1'}];
function seal(value){const {package_hash,...body}=value;return {...body,package_hash:hash(body)};}
function build(){
 const groups=[],activities=[],items=[];
 for(const [first,last,variants]of [[1,3,['F1','G1','G2']],[4,6,['F1','G1','H1','H2']],[7,8,['F1','F2','G1','G2','H1','H2']],[9,10,['F1','G1','H1']]]){
  const group_code=`L1.GROUP.B${String(first).padStart(2,'0')}-B${String(last).padStart(2,'0')}`,lesson_codes=Array.from({length:last-first+1},(_,i)=>`L1.BT.${String(first+i).padStart(2,'0')}`);
  groups.push({group_code,title:`Synthetic group ${first}-${last}`,lesson_codes,source_refs:refs,editorial_status:'requires_D07',publication_status:'draft'});
  for(const variant of variants){
   const kind=variant[0]==='F'?'sentence':'dialogue',level=kind==='sentence'?'C':'H',code=`${group_code}.${level}.${variant}`,blocked=(first===4&&variant==='G1')||(first===7&&variant==='H2');
   const units=Array.from({length:5},(_,i)=>({id:`${variant}:u${i+1}`,itemId:`G4C-${hash({code,i}).slice(0,20)}`,order:i+1,text:`Synthetic ${variant} turn ${i+1}`,speaker:kind==='sentence'?null:(i%2?'Speaker B':'Speaker A'),blockedReason:blocked&&i===0?'Synthetic editorial decision pending':null}));
   for(const u of units)items.push({item_id:u.itemId,kind:kind==='sentence'?'sentence':'dialogue_turn',label:u.text,sense:`${code}:${u.order}`,source_refs:refs,approval_status:'draft'});
   const config={runtime_version:2,game_type:'VideoPracticeRecorder',title:`Synthetic ${first}-${last} ${variant}`,instruction:'Synthetic recording task',sourcePackage:{phase:'G4C',id:'synthetic-groups',activity_code:code,workbook_sha256:source.sha256},source_refs:refs,asset_ids:[],publication_status:'draft',blocked_by_decisions:['D07','D05','D06','D08'],compound:{kind,groupCode:group_code,variantCode:variant,sourceColumn:variant[0],sourceRef:refs[0],sourceRaw:'Synthetic raw source only',notes:[{sourceLine:1,text:'Synthetic editorial note'}],editorialStatus:'requires_D07',speakers:kind==='sentence'?[]:['Speaker A','Speaker B'],units,model:{type:'video',missing:true}},rounds:[{id:'source-order',title:'Synthetic order',shuffleTasks:false}],policy:{status:'requires_D07',completion:'review',pass_score:null,star_thresholds:null,max_retries:null,ai_enabled:false},tasks:units.map(u=>({id:u.id,roundId:'source-order',kind:'recording',label:`Target ${u.order}`,prompt:{type:'text',content:u.text},sample:{type:'video',missing:true},...(u.blockedReason?{blockedReason:u.blockedReason}:{})}))};
   activities.push({activity_code:code,lesson_code:lesson_codes.at(-1),group_code,activity_level:level,game_type:'VideoPracticeRecorder',title:config.title,instruction:config.instruction,display_order:100+activities.length,variant_code:variant,source_column:variant[0],source_refs:refs,publication_status:'draft',assignable:!blocked,config});
  }
 }
 return seal({phase:'G4C',schema_version:1,publication_status:'draft',source,groups,items,activities,decisions:{D07:'open'}});
}
module.exports={build,seal};
