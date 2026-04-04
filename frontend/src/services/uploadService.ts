import http from "@/core/services/api/http";
import { API_BASE_URL } from "@/core/config/api";

/**
 * Chuẩn hóa URL file → luôn trả về full URL trỏ về backend.
 * - Nếu là absolute URL đúng (https://vietsign... hoặc http://localhost:8080) → dùng thẳng
 * - Nếu là absolute URL sai host (http://localhost:3000) → extract path rồi prepend API_BASE_URL
 * - Nếu là relative path (/uploads/...) → prepend API_BASE_URL
 */
export const normalizeFileUrl = (url: string): string => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    return `${API_BASE_URL}${pathname}`;
  } catch {
    return `${API_BASE_URL}${url}`;
  }
};

export const uploadFile = async (
  file: File,
  folder?: "exam" | "question" | "avatar" | "Data_FSL" | "others",
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await http.post("/upload", formData);

  // Backend trả { path, url, filename }
  const raw = response.data.url || response.data.path;
  return normalizeFileUrl(raw);
};
