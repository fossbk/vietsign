import { Base } from "./base";

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
  game_config: Record<string, unknown> | null;
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
}

// ----- Model -----
class CurriculumModelClass extends Base {
  constructor() {
    super("curriculum");
  }

  /** GET /curriculum/lessons — danh sách bài học theo level/topic */
  getLessons = async (params?: { level?: string; topic?: string }): Promise<CurriculumLesson[]> => {
    const res = await this.apiGet("/lessons", params);
    return (res as any).data;
  };

  /** GET /curriculum/lessons/:lessonCode — chi tiết bài học kèm danh sách activity */
  getLessonByCode = async (lessonCode: string): Promise<CurriculumLesson> => {
    const res = await this.apiGet(`/lessons/${lessonCode}`);
    return (res as any).data;
  };

  /** GET /curriculum/activities/:activityCode — chi tiết activity kèm media */
  getActivityByCode = async (activityCode: string): Promise<CurriculumActivity> => {
    const res = await this.apiGet(`/activities/${activityCode}`);
    return (res as any).data;
  };

  /** POST /curriculum/activities/:activityId/submit */
  submitProgress = async (
    activityId: number,
    payload: SubmitProgressPayload,
  ) => {
    const res = await this.apiPost(`/activities/${activityId}/submit`, payload);
    return (res as any).data;
  };

  /** GET /curriculum/users/:userId/progress */
  getUserProgress = async (userId: number, lessonId?: number) => {
    const res = await this.apiGet(`/users/${userId}/progress`, lessonId ? { lesson_id: lessonId } : undefined);
    return (res as any).data;
  };
}

const CurriculumModel = new CurriculumModelClass();
export default CurriculumModel;
