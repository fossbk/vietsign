const test=require('node:test');
const assert=require('node:assert/strict');
const svc=require('../src/features/curriculum/services/curriculum.services');
test('legacy submit cannot create a verified score or queue client-selected target',async()=>{
 await assert.rejects(()=>svc.submitGameProgress(1,1,{score:100,stars:3,isCompleted:true,submissionVideoUrl:'/uploads/curriculum-practice/foreign.webm',targetText:'ca'}),e=>e.status===410);
});
// Transaction, summary and concurrent submit coverage moved to the isolated
// curriculum-m1.integration.test.js; no test defaults to the application DB.
