import { Base } from "./base";

export interface Learn {
  id: number;
  title: string;
}

class LearnModelClass extends Base {
  constructor() {
    super("learn");
  }

  /**
   * GET /learn/categories - Lấy tất cả categories kèm items và progress
   */
  getCategories = async () => {
    const res = await this.apiGet("/categories");
    return res.data;
  };

  /**
   * GET /learn/categories/:slug - Lấy category theo slug
   */
  getCategoryBySlug = async (slug: string) => {
    const res = await this.apiGet(`/categories/${slug}`);
    return res.data;
  };

  /**
   * GET /learn/items/:itemId - Lấy learn item chi tiết
   */
  getItemById = async (itemId: number) => {
    const res = await this.apiGet(`/items/${itemId}`);
    return res.data;
  };

  /**
   * POST /learn/items - Create a new learn item
   */
  createItem = async (data: any) => {
    const res = await this.apiPost("/items", data);
    return res.data;
  };

  /**
   * PUT /learn/items/:itemId - Update an existing learn item
   */
  updateItem = async (itemId: number, data: any) => {
    const res = await this.apiPut(`/items/${itemId}`, data);
    return res.data;
  };

  /**
   * DELETE /learn/items/:itemId - Delete a learn item
   */
  // Learn Items
  deleteItem = async (itemId: number) => {
    const res = await this.apiDelete(`/items/${itemId}`);
    return res.data;
  };

  // Lessons
  createLesson = async (itemId: number, data: any) => {
    const res = await this.apiPost(`/items/${itemId}/lessons`, data);
    return res.data;
  };

  updateLesson = async (lessonId: number, data: any) => {
    const res = await this.apiPut(`/lessons/${lessonId}`, data);
    return res.data;
  };

  deleteLesson = async (lessonId: number) => {
    const res = await this.apiDelete(`/lessons/${lessonId}`);
    return res.data;
  };

  // Steps
  createStep = async (lessonId: number, data: any) => {
    const res = await this.apiPost(`/lessons/${lessonId}/steps`, data);
    return res.data;
  };

  updateStep = async (stepId: number, data: any) => {
    const res = await this.apiPut(`/steps/${stepId}`, data);
    return res.data;
  };

  deleteStep = async (stepId: number) => {
    const res = await this.apiDelete(`/steps/${stepId}`);
    return res.data;
  };

  /**
   * GET /learn/items/:itemId/lessons - Lấy danh sách bài học của item
   */
  getLessonsByItemId = async (itemId: number) => {
    const res = await this.apiGet(`/items/${itemId}/lessons`);
    return res.data;
  };

  /**
   * GET /learn/lessons/:lessonId - Lấy chi tiết bài học
   */
  getLessonById = async (lessonId: number) => {
    const res = await this.apiGet(`/lessons/${lessonId}`);
    return res.data;
  };

  /**
   * GET /learn/lessons/:lessonId/steps - Lấy các bước học tập của bài
   */
  getStepsForLesson = async (lessonId: number) => {
    const res = await this.apiGet(`/lessons/${lessonId}/steps`);
    return res.data;
  };

  /**
   * POST /learn/progress - Cập nhật tiến độ học
   */
  updateProgress = async (data: {
    itemId: number;
    completedLessons: number;
    totalLessons: number;
    lastLessonId?: number;
  }) => {
    const res = await this.apiPost("/progress", data);
    return res.data;
  };

  /**
   * GET /learn/progress - Lấy tiến độ tổng quan
   */
  getUserProgress = async () => {
    const res = await this.apiGet("/progress");
    return res.data;
  };

  /**
   * GET /learn/progress/:itemId - Lấy tiến độ item cụ thể
   */
  getItemProgress = async (itemId: number) => {
    const res = await this.apiGet(`/progress/${itemId}`);
    return res.data;
  };

  /**
   * GET /learn/topics - Lấy topics cho learning
   */
  getTopicsForLearning = async (params?: {
    classroom_id?: number;
    limit?: number;
    offset?: number;
  }) => {
    const res = await this.apiGet("/topics", params);
    return res.data;
  };

  /**
   * GET /learn/topics/:topicId - Lấy topic kèm vocabularies
   */
  getTopicWithVocabularies = async (topicId: number) => {
    const res = await this.apiGet(`/topics/${topicId}`);
    return res.data;
  };

  /**
   * GET /learn/topics/:topicId/steps - Lấy steps học từ topic
   */
  getTopicLearningSteps = async (topicId: number) => {
    const res = await this.apiGet(`/topics/${topicId}/steps`);
    return res.data;
  };

  saveTopicQuizAttempt = async (topicId: number, data: any) => {
    const res = await this.apiPost(`/topics/${topicId}/quiz-attempts`, data);
    return res.data;
  };

  saveTopicGameAttempt = async (topicId: number, data: any) => {
    const res = await this.apiPost(`/topics/${topicId}/game-attempts`, data);
    return res.data;
  };

  /**
   * POST /learn/vocabulary/learned - Đánh dấu từ vựng đã học
   */
  markVocabularyLearned = async (vocabularyId: number) => {
    const res = await this.apiPost("/vocabulary/learned", { vocabularyId });
    return res.data;
  };

  /**
   * GET /learn/vocabulary/progress - Lấy tiến độ từ vựng
   */
  getVocabularyProgress = async (topicId?: number) => {
    const res = await this.apiGet(
      "/vocabulary/progress",
      topicId ? { topic_id: topicId } : {},
    );
    return res.data;
  };

  /**
   * GET /learn/search - Tìm kiếm items
   */
  searchItems = async (q: string, limit?: number, offset?: number) => {
    const res = await this.apiGet("/search", { q, limit, offset });
    return res.data;
  };
}

const LearnModel = new LearnModelClass();
export default LearnModel;
