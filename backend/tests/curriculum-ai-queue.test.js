const test=require('node:test');const assert=require('node:assert/strict');
const queue=require('../src/features/curriculum/services/curriculumAiQueue.service');
test('AI confidence alone never becomes a correctness score',()=>{
 assert.equal(queue.calculateAiScore({is_match:true}),100);assert.equal(queue.calculateAiScore({is_match:false,confidence:0.99}),0);
 for(const confidence of [0,0.99,1,1.5,null])assert.equal(queue.calculateAiScore({confidence}),null);
});
test('legacy queue only reads stored curriculum paths',()=>{
 assert.equal(queue.parseStoredVideoUrl('/uploads/curriculum-practice/video.webm'),'curriculum-practice/video.webm');
 for(const url of ['https://example.com/video.webm','/uploads/others/video.webm','/uploads/curriculum-practice/%2e%2e','/uploads/curriculum-practice/%2fother.webm'])assert.throws(()=>queue.parseStoredVideoUrl(url));
});
