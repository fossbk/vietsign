/**
 * API Configuration
 *
 * Tập trung cấu hình API và base URL cho toàn bộ ứng dụng.
 * Environment variables được sử dụng để switch giữa local và production.
 */

declare global {
  interface Window {
    ENV?: {
      NEXT_PUBLIC_API_ROOT?: string;
      NEXT_PUBLIC_API_ROOT_NODE?: string;
      NEXT_PUBLIC_API_URL?: string;
      [key: string]: string | undefined;
    };
  }
}

const getEnv = (key: string): string | undefined => {
  if (typeof window !== "undefined" && window.ENV && window.ENV[key]) {
    return window.ENV[key];
  }
  return process.env[key];
};

// API Base URLs
export const API_BASE_URL =
  getEnv("NEXT_PUBLIC_API_ROOT") || "http://localhost:8080";
export const API_BASE_URL_NODE =
  getEnv("NEXT_PUBLIC_API_ROOT_NODE") || "http://localhost:8080";

// API Endpoints theo backend routes
export const API_ENDPOINTS = {
  // Auth routes (/auth)
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // User routes (/user)
  USER: {
    PROFILE: "/user/profile",
    CHANGE_PASSWORD: "/user/change-password",
    AVATAR_UPLOAD: "/user/avatar/upload",
    AVATAR_URL: "/user/avatar/url",
    DELETE_ACCOUNT: "/user/account",
    ACTIVITY_LOG: "/user/activity-log",
    // Admin functions
    ALL: "/user/all",
    CREATE: "/user/create",
    BY_ID: (id: number) => `/user/${id}`,
    UPDATE: (id: number) => `/user/${id}`,
    DELETE: (id: number) => `/user/${id}`,
    RESTORE: (id: number) => `/user/${id}/restore`,
    RESET_PASSWORD: (id: number) => `/user/${id}/reset-password`,
    CHANGE_ROLE: (id: number) => `/user/${id}/change-role`,
    // Approval functions
    PENDING: "/user/pending",
    APPROVAL_STATS: "/user/approval-stats",
    APPROVE: (id: number) => `/user/${id}/approve`,
    REJECT: (id: number) => `/user/${id}/reject`,
    BULK_APPROVE: "/user/bulk-approve",
    APPROVAL_HISTORY: (id: number) => `/user/${id}/approval-history`,
  },

  // Organization routes (/organizations)
  ORGANIZATION: {
    LIST: "/organizations",
    BY_ID: (id: number) => `/organizations/${id}`,
    CREATE: "/organizations",
    UPDATE: (id: number) => `/organizations/${id}`,
    DELETE: (id: number) => `/organizations/${id}`,
  },

  // Permission routes (/api)
  PERMISSION: {
    ALL: "/api/permissions",
    MY: "/api/permissions/my",
    USER: (userId: number) => `/api/permissions/user/${userId}`,
    GRANT: "/api/permissions/grant",
    REVOKE: "/api/permissions/revoke",
    // Role permissions
    ROLE: (roleCode: string) => `/api/roles/${roleCode}/permissions`,
    ROLE_ADD: (roleCode: string) => `/api/roles/${roleCode}/permissions`,
    ROLE_REMOVE: (roleCode: string, permCode: string) =>
      `/api/roles/${roleCode}/permissions/${permCode}`,
    // Organization managers
    ORG_MANAGERS: (orgId: number) => `/api/organizations/${orgId}/managers`,
    ORG_ASSIGN_MANAGER: (orgId: number) =>
      `/api/organizations/${orgId}/assign-manager`,
    ORG_REMOVE_MANAGER: (orgId: number, userId: number) =>
      `/api/organizations/${orgId}/remove-manager/${userId}`,
  },

  // Me route
  ME: "/me",

  AI_PRACTICE: {
    PREDICT: "/ai-practice/predict",
    HISTORY: "/ai-practice/history",
  },

  // Swagger docs
  SWAGGER: "/api-docs",
};

// Helper to build full URL
export const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Check if using local backend
export const isLocalBackend = (): boolean => {
  return API_BASE_URL.includes("localhost");
};

// Check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api-docs`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
};
