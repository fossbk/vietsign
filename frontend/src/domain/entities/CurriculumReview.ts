import {Base} from './base';
import type {CurriculumAttempt,RecordingProgress} from './Curriculum';
export interface ReviewEvent {reviewId:number;uploadId:string;reviewerId:number;reviewerName:string;verdict:'accepted'|'needs_revision';comment:string;supersedesReviewId:number|null;createdAt:string}
export interface ItemReview {taskId:string;status:'pending_review'|'accepted'|'needs_revision';latestReviewId:number;uploadId:string|null;history:ReviewEvent[]}
export interface AttemptReview {scope:'class'|'self_study_draft';status:'waiting_D08'|'in_progress'|'pending_review'|'needs_revision'|'reviewed'|'resubmitted'|'superseded';practiceId?:string;classId?:number;items:ItemReview[];parentAttemptId?:string|null;childAttempts?:Array<{attemptId:string;status:string}>;canResubmit:boolean;isPreview?:boolean}
export interface ReviewClass {class_room_id:number;content:string}
export interface ReviewActivity {activity_id:number;activity_code:string;title:string;lesson_code:string;compoundKind?:'sentence'|'dialogue';speakers?:string[]}
export interface ClassPractice {practice_id:string;class_room_id:number;activity_id:number;version_id:number;class_name:string;title:string;activity_code:string;lesson_code:string;status:string;group_code?:string|null;practice_speaker?:string|null}
export interface ReviewQueueItem {attempt_id:string;user_id:number;version_id:number;finalized_at:string;class_room_id:number;class_name:string;student_name:string;activity_code:string;title:string;review_status:string}
export interface ReviewQueue {items:ReviewQueueItem[];total:number;page:number;pageSize:number}
export interface ReviewDetail {attemptId:string;studentId:number;studentName:string;className:string;classId:number;versionId:number;isPreview:boolean;config:CurriculumAttempt['config'];recording:RecordingProgress;review:AttemptReview;canReview:boolean}
export interface ReviewInput {requestId:string;taskId:string;uploadId:string;verdict:'accepted'|'needs_revision';comment:string;expectedReviewId:number}
function unwrap<T>(response:unknown):T {const outer=response as {data:{data:T}};return outer.data.data;}
class CurriculumReviewModel extends Base {
 constructor(){super('curriculum');}
 classes=async():Promise<ReviewClass[]>=>unwrap(await this.apiGet('/reviews/classes'));
 activities=async():Promise<ReviewActivity[]>=>unwrap(await this.apiGet('/reviews/activities'));
 practices=async():Promise<ClassPractice[]>=>unwrap(await this.apiGet('/class-practices'));
 createPractice=async(body:{classId:number;activityId:number;requestId:string;speaker?:string}):Promise<ClassPractice>=>unwrap(await this.apiPost('/class-practices',body));
 startPractice=async(id:string,requestId:string):Promise<CurriculumAttempt>=>unwrap(await this.apiPost(`/class-practices/${id}/attempts`,{requestId}));
 queue=async(params:{classId?:number;status?:string;page:number}):Promise<ReviewQueue>=>unwrap(await this.apiGet('/reviews/submissions',params));
 detail=async(id:string):Promise<ReviewDetail>=>unwrap(await this.apiGet(`/reviews/submissions/${id}`));
 write=async(id:string,body:ReviewInput):Promise<{reviewId:number;replayed:boolean}>=>unwrap(await this.apiPost(`/reviews/submissions/${id}/items`,body));
 video=async(id:string,taskId:string,uploadId:string):Promise<{url:string}>=>unwrap(await this.apiGet(`/reviews/submissions/${id}/tasks/${encodeURIComponent(taskId)}/video-ticket`,{uploadId}));
 resubmit=async(id:string,requestId:string):Promise<CurriculumAttempt>=>unwrap(await this.apiPost(`/attempts/${id}/resubmissions`,{requestId}));
}
const reviewModel=new CurriculumReviewModel();
export default reviewModel;
