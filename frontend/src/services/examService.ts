import ExamModel from "@/domain/entities/Exam";
import type { ExamItem } from "@/data/examsData";

export type { ExamItem };

// Helper to normalize exam data from API
function normalizeExam(exam: any): any {
  if (!exam) return null;

  const rawType = exam.exam_type || exam.examType || "";
  let friendlyType = rawType;
  if (rawType === "MULTIPLE_CHOICE" || rawType === "QUIZ") {
    friendlyType = "Trắc nghiệm";
  } else if (rawType === "PRACTICAL" || rawType === "PRACTICE") {
    friendlyType = "Thực hành";
  }

  // Normalize practice questions so every item has a stable `content` field
  // Backend may return: contentFromExamVocabulary | content | vocabulary_content
  const rawPQ: any[] = exam.practiceQuestions || exam.practice_questions || [];
  const practiceQuestions = rawPQ.map((pq: any) => ({
    ...pq,
    content:
      pq.content ||
      pq.contentFromExamVocabulary ||
      pq.vocabulary_content ||
      "",
  }));

  return {
    ...exam,
    id: exam.exam_id || exam.id,
    title: exam.name || exam.title || "",
    classId: exam.class_room_id || exam.classId,
    createdAt: exam.created_date || exam.created_at || exam.createdAt,
    examType: rawType,
    type: friendlyType,
    duration: exam.duration_minutes
      ? `${exam.duration_minutes} phút`
      : exam.duration || "60 phút",
    questions: exam.total_points || exam.questions || 10,
    passingScore: exam.passing_score || exam.passingScore || 5,
    status: exam.status || (exam.is_active ? "ongoing" : "upcoming"),
    date:
      exam.date ||
      (exam.created_date ? exam.created_date.split("T")[0] : "2024-01-01"),
    time: exam.time || "08:00",
    students: exam.students || 0,
    isPrivate:
      exam.is_private === 1 ||
      exam.is_private === true ||
      exam.isPrivate === true,
    isSubmitted: exam.is_submitted === 1 || exam.isSubmitted === true,
    userScore: exam.user_score !== undefined ? exam.user_score : exam.userScore,
    practiceQuestions,
  };
}

export async function fetchAllExams(query?: any): Promise<ExamItem[]> {
  try {
    const response = await ExamModel.getAllExams(query);
    const data = response.data || response;
    return Array.isArray(data) ? data.map(normalizeExam) : [];
  } catch (error) {
    console.error("Error fetching exams:", error);
    return [];
  }
}

export async function fetchExamById(id: number): Promise<ExamItem | undefined> {
  try {
    const response = await ExamModel.getExamById(id);
    const data = response.data || response;
    return normalizeExam(data);
  } catch (error) {
    console.error("Error fetching exam:", error);
    return undefined;
  }
}

export async function createExam(data: any) {
  // Map frontend exam types to backend format
  const examTypeMap: Record<string, string> = {
    QUIZ: "MULTIPLE_CHOICE",
    PRACTICE: "PRACTICAL",
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    PRACTICAL: "PRACTICAL",
  };

  const examType = data.examType || data.exam_type || "QUIZ";

  const payload = {
    name: data.name || data.title,
    class_room_id: data.class_room_id || data.classroomId || data.classId,
    organization_id: data.organization_id || data.organizationId,
    is_private: data.is_private || data.isPrivate ? 1 : 0,
    exam_type: examTypeMap[examType] || "MULTIPLE_CHOICE",
    duration_minutes: data.durationMinutes || data.duration_minutes || 60,
    total_points: data.totalPoints || data.total_points || 10,
    passing_score: data.passingScore || data.passing_score || 5,
    description: data.description || "",
    created_by: data.creatorId || data.created_by,
    practice_questions: data.practiceQuestions,
    question_ids: data.questionIds,
  };
  return await ExamModel.createExam(payload);
}

export async function updateExam(id: number, data: any) {
  const payload = {
    name: data.name || data.title,
    class_room_id: data.class_room_id || data.classId,
    organization_id: data.organization_id || data.organizationId,
    is_private:
      data.is_private !== undefined ? (data.is_private ? 1 : 0) : undefined,
    exam_type: data.examType || data.type,
    duration_minutes:
      data.durationMinutes ||
      (data.duration ? parseInt(data.duration) : undefined),
    total_points: data.totalPoints || data.questions,
    passing_score: data.passingScore,
    description: data.description,
    practice_questions: data.practiceQuestions || data.practice_questions,
    question_ids: data.questionIds || data.question_ids,
  };
  return await ExamModel.updateExam(id, payload);
}

export async function deleteExam(id: number) {
  return await ExamModel.deleteExam(id);
}

export async function fetchExamsByClassroom(
  classroomId: number,
): Promise<ExamItem[]> {
  try {
    const response = await ExamModel.getExamsByClassroom(classroomId);
    const data = response.data || response;
    return Array.isArray(data) ? data.map(normalizeExam) : [];
  } catch (error) {
    console.error("Error fetching exams by classroom:", error);
    return [];
  }
}

export async function fetchPracticeExamDetail(examId: number) {
  try {
    const response = await ExamModel.getDetailPracticeExam(examId);
    // Unwind api response
    return response.data || response; // Should be the array of questions
  } catch (error) {
    console.error("Error fetching practice exam:", error);
    return [];
  }
}

export async function submitPracticeExam(formData: FormData) {
  return await ExamModel.submitPracticeVideos(formData);
}

export async function submitExam(id: number, data: any) {
  return await ExamModel.submitExam(id, data);
}

export async function fetchPracticeSubmission(examId: number, userId: number) {
  return await ExamModel.getPracticeExamSubmission(examId, userId);
}

export async function fetchAllPracticalSubmissions() {
  try {
    const response = await ExamModel.getAllPracticalSubmissions();
    return response.data || response;
  } catch (error) {
    console.error("Error fetching practical submissions:", error);
    return [];
  }
}

export async function markPracticeSubmission(data: any) {
  return await ExamModel.markPracticeExam(data);
}

/**
 * Lấy chi tiết bài làm của học sinh (review mode)
 */
export async function fetchExamReview(examId: number, studentId: number) {
  try {
    const response = await ExamModel.getExamReview(examId, studentId);
    return response.data || response;
  } catch (error) {
    console.error("Error fetching exam review:", error);
    throw error;
  }
}
