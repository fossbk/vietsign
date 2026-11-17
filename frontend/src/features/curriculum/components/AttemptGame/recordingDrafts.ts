// Blobs live in IndexedDB, scoped by immutable attempt/task IDs. No camera data enters localStorage.
export interface RecordingDraft {key:string;attemptId:string;taskId:string;uploadRequestId:string;uploadedId?:string;replacesUploadId?:string;blob:Blob;createdAt:number}
const database='vietsign-recording-drafts',store='drafts';
async function connection():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{const request=indexedDB.open(database,1);request.onupgradeneeded=()=>request.result.createObjectStore(store,{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
export const draftKey=(attemptId:string,taskId:string)=>`${attemptId}:${taskId}`;
async function run<T>(mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await connection();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),request=fn(tx.objectStore(store));tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||new Error('Không lưu được video nháp.'));};});
}
export const readDraft=(attemptId:string,taskId:string)=>run<RecordingDraft|undefined>('readonly',s=>s.get(draftKey(attemptId,taskId)));
export const saveDraft=(draft:RecordingDraft)=>run('readwrite',s=>s.put(draft));
export const removeDraft=(attemptId:string,taskId:string)=>run('readwrite',s=>s.delete(draftKey(attemptId,taskId)));
export const draftAttemptIds=async()=>[...new Set((await run<IDBValidKey[]>('readonly',s=>s.getAllKeys())).map(k=>String(k).split(':')[0]))];
export async function hasLocalRecordingDraft(attempt:import('@/domain/entities/Curriculum').CurriculumAttempt){for(const task of attempt.config.tasks.filter(t=>t.kind==='recording')){const draft=await readDraft(attempt.attemptId,task.id);if(draft&&!attempt.recording?.items.find(i=>i.taskId===task.id)?.history.some(h=>h.uploadId===(draft.uploadedId||draft.uploadRequestId)))return true;}return false;}
