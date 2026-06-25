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
    label_id?: string | number | null;
    label_name?: string | null;
    confidence: number | null;
    is_match: boolean | null;
    raw_response: Record<string, unknown>;
  };
}

export interface PredictModel3Response {
  success: boolean;
  message: string;
  data?: {
    attempt_id?: number;
    model_code?: "model3";
    target_text?: string | null;
    is_match?: boolean | null;
    label_name: string | null;
    label_id: number | null;
    action_name: string | null;
    confidence: number | null;
    top_k: Array<{ rank: number; class_id: number; probability: number; label: string }>;
  };
}

export interface AiPracticeHistoryItem {
  attempt_id: number;
  model_code?: "model1" | "model3" | string;
  mode: string;
  target_text: string | null;
  predicted_label: string | number | null;
  action_name: string | null;
  confidence: number | null;
  is_match: boolean | number | null;
  vocabulary_id: number | null;
  topic_id: number | null;
  status: string;
  error_message: string | null;
  raw_response: Record<string, unknown> | string | null;
  created_at: string;
}

export interface AiPracticeHistoryResponse {
  success: boolean;
  message: string;
  data: AiPracticeHistoryItem[];
  page: number;
  limit: number;
  total: number;
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

// Model 3: gọi qua backend (backend sẽ proxy sang localhost:30081 trên máy chủ)
export const predictAiPracticeModel3 = async (
  file: File,
  metadata?: Omit<PredictAiPracticePayload, "file">,
): Promise<PredictModel3Response> => {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata?.mode) formData.append("mode", metadata.mode);
  if (metadata?.targetText) formData.append("target_text", metadata.targetText);
  if (metadata?.vocabularyId) formData.append("vocabulary_id", String(metadata.vocabularyId));
  if (metadata?.topicId) formData.append("topic_id", String(metadata.topicId));

  const response = await http.post<PredictModel3Response>(
    API_ENDPOINTS.AI_PRACTICE.PREDICT_MODEL3,
    formData,
  );

  return response.data;
};

export const fetchAiPracticeHistory = async ({
  model,
  page = 1,
  limit = 100,
}: {
  model?: "model1" | "model3";
  page?: number;
  limit?: number;
}): Promise<AiPracticeHistoryResponse> => {
  const response = await http.get<AiPracticeHistoryResponse>(
    API_ENDPOINTS.AI_PRACTICE.HISTORY,
    {
      params: {
        model,
        page,
        limit,
      },
    },
  );

  return response.data;
};
