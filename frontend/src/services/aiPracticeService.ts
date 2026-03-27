import http from "@/core/services/api/http";
import { API_ENDPOINTS } from "@/core/config/api";

export interface PredictAiPracticePayload {
  file: File;
  mode?: "match" | "spell" | "free";
  targetText?: string;
  vocabularyId?: number;
  topicId?: number;
}

export interface PredictAiPracticeResponse {
  success: boolean;
  message: string;
  data?: {
    attempt_id: number;
    mode: string;
    target_text: string | null;
    predicted_label: string | null;
    action_name: string | null;
    confidence: number | null;
    is_match: boolean | null;
    raw_response: Record<string, unknown>;
  };
}

export const predictAiPractice = async (
  payload: PredictAiPracticePayload,
): Promise<PredictAiPracticeResponse> => {
  const formData = new FormData();
  formData.append("file", payload.file);

  if (payload.mode) {
    formData.append("mode", payload.mode);
  }

  if (payload.targetText) {
    formData.append("target_text", payload.targetText);
  }

  if (payload.vocabularyId) {
    formData.append("vocabulary_id", String(payload.vocabularyId));
  }

  if (payload.topicId) {
    formData.append("topic_id", String(payload.topicId));
  }

  const response = await http.post<PredictAiPracticeResponse>(
    API_ENDPOINTS.AI_PRACTICE.PREDICT,
    formData,
  );

  return response.data;
};
