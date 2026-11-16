import { Base } from "./base";

function unwrapResponse<T>(response: unknown): T {
  const outer = response as { data?: unknown };
  const body = outer?.data;
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// ----- Types -----
export interface CurriculumMedia {
  media_id: number;
  media_code: string;
  media_type: "video" | "image";
  source_url: string;
  display_order: number;
}

export interface CurriculumActivity {
  activity_id: number;
  activity_code: string;
  activity_level?: string;
  game_type: string;
  title: string;
  instruction: string | null;
  game_config: Record<string, unknown> | string | null;
  pass_score: number;
  display_order?: number;
  lesson_code: string;
  lesson_title: string;
  media: CurriculumMedia[];
  best_score?: number | null;
  best_stars?: number | null;
  is_completed?: boolean | number;
  readiness?: 'ready' | 'drafting';
  can_preview?: boolean;
  preview_version_id?: number | null;
}

export interface CurriculumLesson {
  lesson_id: number;
  lesson_code: string;
  level_code: string;
  topic_code: string;
  title: string;
  description: string;
  content_status: "ready" | "drafting" | "not_started";
  display_order: number;
  total_activities?: number;
  completed_activities?: number;
  activities?: CurriculumActivity[];
  readiness?: 'ready' | 'drafting';
  published_activities?: number;
}

export interface SubmitProgressPayload {
  score: number;
  stars: number;
  durationSeconds?: number;
  isCompleted: boolean;
  gameResultDetails?: Record<string, unknown>;
  submissionVideoUrl?: string;
  targetText?: string;
}

export interface CurriculumAiStatus {
  progress_id: number;
  user_id: number;
  activity_id: number;
  ai_status: "not_requested" | "queued" | "processing" | "completed" | "failed";
  ai_attempt_id?: number | null;
  ai_score?: number | null;
  ai_confidence?: number | null;
  ai_error_message?: string | null;
  is_completed: boolean | number;
}

// ----- Model -----
class CurriculumModelClass extends Base {
  constructor() {
    super("curriculum");
  }
  getCatalog = async (): Promise<Array<{code:string;totalLessons:number;availableLessons:number}>> =>
    unwrapResponse(await this.apiGet('/catalog'));
  startAttempt = async (activityId:number, requestId:string):Promise<CurriculumAttempt> =>
    unwrapResponse(await this.apiPost(`/activities/${activityId}/attempts`,{requestId}));
  getAttempt = async (id:string):Promise<CurriculumAttempt> => unwrapResponse(await this.apiGet(`/attempts/${id}`));
  answerAttempt = async (id:string, payload:AttemptEvent):Promise<AttemptFeedback> =>
    unwrapResponse(await this.apiPost(`/attempts/${id}/answers`,payload));
  submitAttempt = async (id:string,idempotencyKey:string):Promise<AttemptResult> =>
    unwrapResponse(await this.apiPost(`/attempts/${id}/submit`,{idempotencyKey}));
  uploadAttemptVideo = async(id:string,taskId:string,file:File,uploadRequestId?:string):Promise<{uploadId:string}> => {
    const form=new FormData();form.append('file',file);if(uploadRequestId)form.append('uploadRequestId',uploadRequestId);
    return unwrapResponse(await this.apiUploadFile(`/attempts/${id}/tasks/${encodeURIComponent(taskId)}/uploads`,form));
  };

  /** GET /curriculum/lessons — danh sách bài học theo level/topic */
  getLessons = async (params?: { level?: string; topic?: string }): Promise<CurriculumLesson[]> => {
    const res = await this.apiGet("/lessons", params);
    const body = unwrapResponse<unknown>(res);
    return Array.isArray(body) ? body as CurriculumLesson[] : [];
  };

  /** GET /curriculum/lessons/:lessonCode — chi tiết bài học kèm danh sách activity */
  getLessonByCode = async (lessonCode: string): Promise<CurriculumLesson> => {
    const res = await this.apiGet(`/lessons/${lessonCode}`);
    return unwrapResponse<CurriculumLesson>(res);
  };

  /** GET /curriculum/activities/:activityCode — chi tiết activity kèm media */
  getActivityByCode = async (activityCode: string): Promise<CurriculumActivity> => {
    const res = await this.apiGet(`/activities/${activityCode}`);
    return unwrapResponse<CurriculumActivity>(res);
  };

  /** POST /curriculum/activities/:activityId/submit */
  submitProgress = async (
    activityId: number,
    payload: SubmitProgressPayload,
  ) => {
    const res = await this.apiPost(`/activities/${activityId}/submit`, payload);
    return unwrapResponse<{
      progressId: number;
      score: number;
      stars: number;
      isCompleted: number;
      aiStatus?: CurriculumAiStatus["ai_status"];
      aiJobId?: number | null;
    }>(res);
  };

  /** GET /curriculum/users/:userId/progress */
  getUserProgress = async (userId: number, lessonCode?: string) => {
    const res = await this.apiGet(`/users/${userId}/progress`, lessonCode ? { lessonCode } : undefined);
    return unwrapResponse<unknown>(res);
  };

  /** GET /curriculum/progress/:progressId/ai-status */
  getProgressAiStatus = async (progressId: number): Promise<CurriculumAiStatus> => {
    const res = await this.apiGet(`/progress/${progressId}/ai-status`);
    return unwrapResponse<CurriculumAiStatus>(res);
  };
}

const CurriculumModel = new CurriculumModelClass();
export default CurriculumModel;

export interface TaskPresentation {type:'text'|'image'|'video'|'counting'|'mixed';content?:string;label?:string;role?:string;missing?:boolean;technicalSample?:boolean;parts?:TaskPresentation[];angles?:TaskPresentation[];highlightVideo?:TaskPresentation;icon?:string;count?:number;rows?:number;objects?:Array<{id:string;presentation:TaskPresentation;x?:number;y?:number}>;background?:TaskPresentation}
export interface AttemptTask {id:string;roundId?:string;kind:'view'|'choice'|'pair'|'sequence'|'recording'|'memory';blockedReason?:string;prompt:TaskPresentation;sample?:TaskPresentation;label?:string;options?:Array<{id:string;presentation:TaskPresentation}>;fixedOptions?:Record<number,string>;keepCorrect?:boolean;staircase?:boolean;maxRetries?:number|null;requireCount?:boolean;cards?:Array<{id:string;presentation:TaskPresentation}>;pairCount?:number;recording?:{maxSeconds:number|null;maxBytes:number|null}}
export interface AttemptEvent {eventId:string;taskId:string;choiceIds?:string[];action?:'view'|'count'|'flip';uploadId?:string;objectId?:string;cardId?:string}
export interface AttemptFeedback {correct:boolean|null;terminal?:boolean;exhausted?:boolean;correctOptionIds?:string[];choiceIds?:string[];reviewStatus?:string;eventKind?:string;countedIds?:string[];lockedOptions?:Record<number,string>;openCardId?:string|null;matchedIds?:string[];revealedIds?:string[];moves?:number;pairMatched?:boolean;tries?:number;remainingTries?:number|null;hint?:{replaySpeed:number;showHighlight:boolean}}
export interface AttemptResult {score:number;stars:number;practiceStars?:number;isCompleted:number;isPreview:boolean;reviewStatus:string;progressId:number;answered:number;required:number;firstCorrect?:number;moves?:number}
export interface AttemptRound {id:string;title:string;available:boolean;complete:boolean;solved:boolean;unlockAfterRound?:string;unlockCondition?:string}
export interface FixtureDescription {id:string;title:string;activityCode:string;gameType:string;rounds:number}
export interface CurriculumAttempt {attemptId:string;activityId:number;versionId:number;isPreview:boolean;status:'open'|'finalized';config:{runtime_version:number;game_type:string;title?:string;icon?:string;instruction?:string;rounds?:AttemptRound[];tasks:AttemptTask[];policy:{max_retries:number|null;no_penalty?:boolean;completion?:string}};answers:Array<AttemptFeedback & {eventId:string;taskId:string}>;result:AttemptResult|null}
