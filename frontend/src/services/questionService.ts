import QuestionModel from "@/domain/entities/Question";
import { QuestionItem } from "@/data/questionsData";
import { normalizeFileUrl } from "@/services/uploadService";
import { API_BASE_URL } from "@/core/config/api";

// Helper to normalize question data from API
function normalizeQuestion(q: any): any {
  if (!q) return null;

  // Map answers từ backend (answerResList) sang format frontend dùng (answers)
  // Backend trả: { id, content, correct, videoLocation } (correct là 0/1)
  const rawAnswers = q.answerResList || q.answers || [];
  const answers = Array.isArray(rawAnswers)
    ? rawAnswers.map((a: any) => ({
        id: a.id || a.answer_id,
        content: a.content || "",
        correct: Boolean(a.correct ?? a.is_correct),
        videoLocation: a.videoLocation || a.video_location || "",
        imageLocation: a.imageLocation || a.image_location || "",
        fileType:
          a.fileType ||
          (a.imageLocation || a.videoLocation ? "NOT_EXISTED" : "TEXT"),
      }))
    : [];

  return {
    ...q,
    id: q.question_id || q.id,
    content: q.content,
    explanation: q.explanation,
    classId: q.class_room_id || q.classId,
    questionType: q.question_type || q.questionType || "ONE_ANSWER",
    fileType: q.file_type || q.fileType || "TEXT",
    image: normalizeFileUrl(q.image_location),
    video: normalizeFileUrl(q.video_location),
    // Giữ lại relative path gốc để dùng khi update (tránh lưu full URL vào DB)
    image_location: q.image_location || null,
    video_location: q.video_location || null,
    answers,
    createdAt: q.created_date || q.created_at || q.createdAt,
  };
}

/**
 * Chuyển URL (có thể là full URL hoặc relative path) về relative path
 * để lưu vào DB. Tránh lưu full URL gây duplicate khi hiển thị.
 *
 * Cũng strip basePath (nếu API_BASE_URL có path prefix như /user-service)
 * để tránh duplicate khi pathname đã chứa basePath.
 */
function toRelativePath(url: string | null | undefined): string | null {
  if (!url) return null;

  // Lấy pathname (bỏ host nếu có)
  let pathname = url;
  if (url.startsWith("http")) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = url;
    }
  }
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  // Strip basePath nếu API_BASE_URL có path prefix (vd: /user-service)
  try {
    const basePath = new URL(API_BASE_URL).pathname.replace(/\/+$/, "");
    if (basePath) {
      while (
        pathname === basePath ||
        pathname.toLowerCase().startsWith(basePath.toLowerCase() + "/")
      ) {
        pathname = pathname.slice(basePath.length);
        if (!pathname.startsWith("/")) pathname = "/" + pathname;
      }
    }
  } catch {
    // ignore
  }

  return pathname;
}


export async function fetchAllQuestions(query?: any): Promise<QuestionItem[]> {
  try {
    const response = await QuestionModel.getQuestions(query);
    const data = response.data || response;
    return Array.isArray(data) ? data.map(normalizeQuestion) : [];
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
}

export async function fetchQuestionById(
  id: number,
): Promise<QuestionItem | undefined> {
  try {
    const response = await QuestionModel.getQuestionById(id);
    const data = response.data || response;
    return normalizeQuestion(data);
  } catch (error) {
    console.error("Error fetching question:", error);
    return undefined;
  }
}

export async function createQuestion(data: any) {
  // Map answers to backend format
  const rawAnswers = data.answers || data.answerReqs || [];
  const answers = rawAnswers.map((ans: any) => ({
    content: ans.content || "", // Ensure content is not null
    is_correct: ans.correct || ans.is_correct || false,
    video_location: ans.videoLocation || ans.video_location || null,
    image_location: ans.imageLocation || ans.image_location || null,
  }));

  // Map question_type - use validated backend ENUM values
  // DB: 'MULTIPLE_ANSWERS', 'ONE_ANSWER'
  let questionType = data.questionType || data.question_type || "ONE_ANSWER";
  if (questionType === "PRACTICE" || questionType === "PRACTICAL") {
    questionType = "ONE_ANSWER"; // Default to ONE_ANSWER if not supported in ENUM
  }

  // Map file_type - use validated backend ENUM values
  // DB: 'EXISTED', 'NOT_EXISTED', 'TEXT'
  let fileType = data.fileType || data.file_type || "TEXT";
  if (!["EXISTED", "NOT_EXISTED", "TEXT"].includes(fileType)) {
    const imgLoc = data.image_location || data.imageLocation;
    const vidLoc = data.video_location || data.videoLocation;
    fileType = imgLoc || vidLoc ? "EXISTED" : "TEXT";
  }

  const payload = {
    content: data.content,
    explanation: data.explanation || "",
    class_room_id:
      data.class_room_id || data.classId || data.classroomId || null,
    // Luôn lưu relative path vào DB
    image_location: toRelativePath(data.imageLocation || data.image_location),
    video_location: toRelativePath(data.videoLocation || data.video_location),
    question_type: questionType,
    file_type: fileType,
    answers: answers,
    created_by: data.created_by || data.creatorId,
    organization_id: data.organization_id || data.organizationId,
  };

  return await QuestionModel.createQuestion(payload);
}

export async function updateQuestion(id: number, data: any) {
  let questionType = data.questionType || data.question_type;
  if (questionType === "PRACTICE" || questionType === "PRACTICAL") {
    questionType = "ONE_ANSWER";
  }

  const payload = {
    content: data.content,
    explanation: data.explanation,
    class_room_id: data.class_room_id || data.classId || data.classroomId,
    // Luôn lưu relative path vào DB
    image_location: toRelativePath(data.imageLocation || data.image_location),
    video_location: toRelativePath(data.videoLocation || data.video_location),
    question_type: questionType,
    organization_id: data.organization_id || data.organizationId,
    answers: data.answers || data.answerReqs,
  };
  return await QuestionModel.updateQuestion(id, payload);
}

export async function deleteQuestion(id: number) {
  return await QuestionModel.deleteQuestion(id);
}

export async function fetchQuestionsByClassroom(
  classroomId: number,
): Promise<QuestionItem[]> {
  try {
    const response = await QuestionModel.getQuestionsByClassroom(classroomId);
    const data = response.data || response;
    return Array.isArray(data) ? data.map(normalizeQuestion) : [];
  } catch (error) {
    console.error("Error fetching questions by classroom:", error);
    return [];
  }
}
