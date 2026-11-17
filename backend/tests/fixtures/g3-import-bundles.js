// Synthetic input for importer tests. No workbook, lesson content or supplied images.
const {hash}=require('../../src/features/curriculum/services/curriculumImport.service');
const source={filename:'synthetic-source.txt',sha256:'1'.repeat(64)};
const refs=[{workbook:'synthetic',sheet:'test',range:'A1'}];
function seal(body){const {package_hash,...unsigned}=body;return {...unsigned,package_hash:hash(unsigned)};}
function buildA(){return build('G3A');}
function buildB(){return build('G3B',buildA());}
function build(phase,dependency){
 const first=phase==='G3A'?1:6,counts=phase==='G3A'?[6,7,6,7,7]:[7,7,7,7,7],package_id=`synthetic-${phase}`;
 const lessons=counts.map((_,i)=>({lesson_code:`L1.BT.${String(first+i).padStart(2,'0')}`,level_code:'L1',topic_code:'BT',title:`Synthetic lesson ${first+i}`,description:'Synthetic import fixture',content_status:'drafting',display_order:first+i}));
 const item={item_id:`${phase}-TEST-ITEM`,kind:'word',label:'Synthetic item',sense:null,source_refs:refs,approval_status:'draft'};
 const icon={item_id:'G3A-ICON-TEST',kind:'activity_icon',label:'Synthetic icon',sense:null,source_refs:refs,approval_status:'draft',...(dependency?{reuse_from:'G3A'}:{})};
 const picture={asset_id:`${phase}-TEST-ASSET`,item_id:item.item_id,role:'illustration',provider:'local',lookup_url:null,playable_url:`/curriculum-media/${phase.toLowerCase()}/${'2'.repeat(20)}.webp`,verification_status:'unverified',source_refs:refs};
 const iconAsset={asset_id:'G3A-TEST-ICON-ASSET',item_id:icon.item_id,role:'activity_icon',provider:'local',lookup_url:null,playable_url:`/curriculum-media/g3a/${'3'.repeat(20)}.webp`,verification_status:'unverified',source_refs:refs,...(dependency?{reuse_from:'G3A'}:{})};
 const activities=lessons.flatMap((l,i)=>Array.from({length:counts[i]},(_,n)=>{
  const code=`${l.lesson_code}.T${String(n+1).padStart(2,'0')}`;
  return {lesson_code:l.lesson_code,activity_code:code,activity_level:'T',game_type:'FlipCardViewer',title:`Synthetic activity ${code}`,instruction:'Synthetic import fixture',display_order:n+1,publication_status:'draft',config:{
   runtime_version:2,game_type:'FlipCardViewer',source_refs:refs,asset_ids:[picture.asset_id,iconAsset.asset_id],sourcePackage:{phase,id:package_id,workbook_sha256:source.sha256,activity_code:code},blocked_by_decisions:['D03','D05'],
   policy:{status:'requires_D05',completion:'viewed_all',pass_score:null,star_thresholds:null,max_retries:null},rounds:[{id:'first',title:'Synthetic round'}],
   tasks:[{id:'item',roundId:'first',kind:'view',label:item.label,prompt:{type:'image',content:picture.playable_url},sample:{type:'video',missing:true}}]
  }};
 }));
 return seal({schema_version:1,phase,package_id,source,publication_status:'draft',lessons,activities,items:[item,icon],assets:[picture,iconAsset],excluded:[],unmapped_images:[],...(dependency?{depends_on:{phase:'G3A',package_hash:dependency.package_hash}}:{})});
}
module.exports={buildA,buildB,seal};
