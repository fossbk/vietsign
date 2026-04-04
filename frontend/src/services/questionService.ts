import QuestionModel from "@/domain/entities/Question";
import { QuestionItem } from "@/data/questionsData";
import { normalizeFileUrl } from "@/services/uploadService";

// Helper to normalize question data from API
function normalizeQuestion(q: any): any {
  if (!q) return null;
  return {
    ...q,
    id: q.question_id || q.id,
    content: q.content,
    explanation: q.explanation,
    classId: q.class_room_id || q.classId,
    image: normalizeFileUrl(q.image_location),
    video: normalizeFileUrl(q.video_location),
    createdAt: q.created_date || q.created_at || q.createdAt,
  };
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
    image_location: data.imageLocation || data.image_location || null,
    video_location: data.videoLocation || data.video_location || null,
    question_type: questionType,
    file_type: fileType,
    answers: answers,
    created_by: data.created_by || data.creatorId,
    organization_id: data.organization_id || data.organizationId,
  };

  console.log("Creating question with payload:", payload);
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
    image_location: data.imageLocation || data.image_location,
    video_location: data.videoLocation || data.video_location,
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
