import http from "@/core/services/api/http";
import { API_BASE_URL } from "@/core/config/api";

/**
 * Tách API_BASE_URL thành origin và basePath
 * VD: "https://vietsign.ibme.edu.vn/user-service"
 *  → origin: "https://vietsign.ibme.edu.vn", basePath: "/user-service"
 */
function parseApiBase(): { origin: string; basePath: string } {
  try {
    const u = new URL(API_BASE_URL);
    return {
      origin: u.origin,
      basePath: u.pathname.replace(/\/+$/, ""), // strip trailing slash
    };
  } catch {
    return { origin: API_BASE_URL.replace(/\/+$/, ""), basePath: "" };
  }
}

/**
 * Strip basePath lặp lại ở đầu pathname
 * VD: basePath = "/user-service", pathname = "/user-service/user-service/uploads/x.png"
 *  → "/uploads/x.png"
 */
function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  let result = pathname;
  // Loop để strip nhiều lần nếu bị duplicate
  while (
    result === basePath ||
    result.toLowerCase().startsWith(basePath.toLowerCase() + "/")
  ) {
    result = result.slice(basePath.length);
    if (!result.startsWith("/")) result = "/" + result;
  }
  return result;
}

/**
 * Chuẩn hóa URL file → luôn trả về full URL trỏ về backend (chỉ dùng khi HIỂN THỊ).
 *
 * Xử lý các trường hợp:
 * - Relative path: "/uploads/x.png"
 * - Absolute URL đúng: "https://vietsign.ibme.edu.vn/user-service/uploads/x.png"
 * - Absolute URL có duplicate basePath: "https://.../user-service/user-service/uploads/x.png"
 * - Path có duplicate prefix: "/user-service/uploads/x.png"
 * - URL ngoài (host khác): trả về nguyên (chỉ clean double slash)
 *
 * KHÔNG gọi hàm này khi lưu vào DB — chỉ gọi khi render <img> hoặc <video>.
 */
export const normalizeFileUrl = (url: string): string => {
  if (!url) return url;

  const { origin, basePath } = parseApiBase();

  // Nếu là absolute URL với host khác origin của API → giữ nguyên (chỉ clean double slash)
  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin) {
        // URL ngoài (vd: wesign.ibme.edu.vn) → giữ nguyên, chỉ clean double slash trong path
        return url.replace(/([^:])\/\/+/g, "$1/");
      }
    } catch {
      // ignore, xử lý như relative path bên dưới
    }
  }

  // Lấy pathname (loại bỏ host nếu có)
  let pathname = url;
  if (url.startsWith("http")) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = url;
    }
  }
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  // Strip basePath nếu pathname đã chứa nó (tránh duplicate)
  pathname = stripBasePath(pathname, basePath);

  // Build URL cuối: origin + basePath + clean pathname
  return `${origin}${basePath}${pathname}`;
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
