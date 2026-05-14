import http from "@/core/services/api/http";
import { API_BASE_URL } from "@/core/config/api";

/**
 * Chuẩn hóa URL file → luôn trả về full URL trỏ về backend (chỉ dùng khi HIỂN THỊ).
 *
 * Quy tắc:
 * - Nếu là relative path (/uploads/...) → prepend API_BASE_URL
 * - Nếu là absolute URL bất kỳ → extract pathname rồi prepend API_BASE_URL
 *   (tránh trường hợp URL đã có host sai hoặc bị duplicate)
 *
 * KHÔNG gọi hàm này khi lưu vào DB — chỉ gọi khi render <img> hoặc <video>.
 */
export const normalizeFileUrl = (url: string): string => {
  if (!url) return url;

  // Nếu là relative path (bắt đầu bằng /) → prepend API_BASE_URL trực tiếp
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  // Nếu là absolute URL → extract pathname để tránh duplicate host
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    return `${API_BASE_URL}${pathname}`;
  } catch {
    // Không parse được → coi như relative path không có dấu /
    return `${API_BASE_URL}/${url}`;
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
  // Luôn lấy relative path để lưu vào DB — KHÔNG normalize ở đây.
  // normalizeFileUrl chỉ được gọi khi hiển thị (render <img>/<video>).
  const raw: string = response.data.path || response.data.url || "";

  // Đảm bảo trả về relative path (bắt đầu bằng /)
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  // Nếu backend trả về absolute URL, extract pathname
  try {
    return new URL(raw).pathname;
  } catch {
    return `/${raw}`;
  }
};
