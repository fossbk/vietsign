// Technical recording scenarios for all ten lesson codes; no book content/media.
module.exports=Array.from({length:10},(_,i)=>{
 const lesson_code=`L1.BT.${String(i+1).padStart(2,'0')}`,activity_code=lesson_code+`.T${String([6,7,6,7,7,7,7,7,7,7][i]).padStart(2,'0')}`;
 return {lesson_code,activity_code,title:`Synthetic recording ${i+1}`,game_type:'VideoPracticeRecorder',config:{
  runtime_version:2,game_type:'VideoPracticeRecorder',title:`Synthetic recording ${i+1}`,sourcePackage:{phase:i<5?'G3A':'G3B',id:'synthetic-recording',activity_code,workbook_sha256:'1'.repeat(64)},source_refs:[{workbook:'synthetic',sheet:'test',range:'A1'}],asset_ids:[],blocked_by_decisions:['D05','D08'],
  policy:{status:'requires_D05',completion:'review',max_retries:null,star_thresholds:null,pass_score:null},rounds:[{id:'r1',title:'Technical recording'}],
  tasks:[1,2].map(n=>({id:`target-${n}`,roundId:'r1',kind:'recording',label:`Target ${n}`,prompt:{type:'text',content:`Target ${n}`},sample:{type:'video',missing:true},recording:{maxSeconds:30,maxBytes:10485760}}))
 }};
});
