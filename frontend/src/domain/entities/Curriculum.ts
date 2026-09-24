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
}

export interface SubmitProgressPayload {
  score: number;
  stars: number;
  durationSeconds?: number;
  isCompleted: boolean;
  gameResultDetails?: Record<string, unknown>;
  submissionVideoUrl?: string;
}

// ----- Model -----
class CurriculumModelClass extends Base {
  constructor() {
    super("curriculum");
  }

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
    return unwrapResponse<{ progressId: number; score: number; stars: number; isCompleted: number }>(res);
  };

  /** GET /curriculum/users/:userId/progress */
  getUserProgress = async (userId: number, lessonId?: number) => {
    const res = await this.apiGet(`/users/${userId}/progress`, lessonId ? { lesson_id: lessonId } : undefined);
    return unwrapResponse<unknown>(res);
  };
}

const CurriculumModel = new CurriculumModelClass();
export default CurriculumModel;
