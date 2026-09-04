import { Base } from "./base";

export interface User {
  user_id?: number;
  id?: string;
  email: string;
  name: string;
  phone_number?: string;
  grade?: number;
  code?: string; // role code from backend (ADMIN, STUDENT, TEACHER, etc.)
  role?: UserRole;
  label?: string;
  avatar?: string;
  avatar_url?: string;
  is_deleted?: boolean;
  is_oauth2?: boolean;
  approval_status?: "PENDING" | "APPROVED" | "REJECTED";
  created_date?: string;
  modified_date?: string;
}

export interface UserRole {
  role: "Admin" | "FacilityManager" | "Teacher" | "Student" | "Parent" | "User";
  label: string;
}

// Map backend role codes to frontend roles
export const mapRoleCode = (code: string): UserRole => {
  const roleMap: { [key: string]: UserRole } = {
    ADMIN: { role: "Admin", label: "Quản trị viên" },
    FACILITY_MANAGER: { role: "FacilityManager", label: "Quản lý cơ sở" },
    TEACHER: { role: "Teacher", label: "Giáo viên" },
    STUDENT: { role: "Student", label: "Học sinh" },
    PARENT: { role: "Parent", label: "Phu huynh" },
    USER: { role: "User", label: "Người dùng" },
    TEST: { role: "Admin", label: "Tài khoản Test (Full Access)" }, // Map to Admin role type for compatibility, but label distinct
  };
  return roleMap[code] || { role: "User", label: "Người dùng" };
};

class UserModelClass extends Base {
  constructor() {
    super("users"); // Matches backend /users routes
  }

  // ==================== USER'S OWN PROFILE ====================

  // GET /user/profile - Lấy thông tin cá nhân
  getProfile = async (): Promise<any> => {
    const res = await this.apiGet("/profile");
    return res.data;
  };

  // PUT /user/profile - Cập nhật thông tin cá nhân
  updateProfile = async (data: Partial<User>): Promise<any> => {
    const res = await this.apiPut("/profile", data);
    return res.data;
  };

  // PUT /user/change-password - Đổi mật khẩu
  changePassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<any> => {
    const res = await this.apiPut("/change-password", data);
    return res.data;
  };

  // POST /user/avatar/upload - Upload avatar (multipart/form-data)
  uploadAvatar = async (formData: FormData): Promise<any> => {
    const res = await this.apiUploadFile("/avatar/upload", formData);
    return res.data;
  };

  // PUT /user/avatar/url - Cập nhật avatar bằng URL
  updateAvatarUrl = async (avatarUrl: string): Promise<any> => {
    const res = await this.apiPut("/avatar/url", { avatar_url: avatarUrl });
    return res.data;
  };

  // DELETE /user/account - Xóa tài khoản
  deleteAccount = async (password: string): Promise<any> => {
    const res = await this.apiDelete("/account", undefined, { password });
    return res.data;
  };

  // GET /user/activity-log - Lịch sử hoạt động
  getActivityLog = async (query?: any): Promise<any> => {
    const res = await this.apiGet("/activity-log", query);
    return res.data;
  };

  // ==================== ADMIN FUNCTIONS ====================

  // GET /user/teachers - Lấy danh sách giáo viên
  getTeachers = async (query?: any): Promise<any> => {
    const res = await this.apiGet("/teachers", query);
    return res.data;
  };

  // GET /user/students - Lấy danh sách học sinh
  getStudents = async (query?: any): Promise<any> => {
    const res = await this.apiGet("/students", query);
    return res.data;
  };

  // GET /user/all - Lấy danh sách tất cả user (Admin only)
  // Note: Backend might not have generic /users endpoint yet.
  getAllUsers = async (query?: any): Promise<any> => {
    const res = await this.apiGet("", query);
    return res.data;
  };

  // GET /user/:userId - Lấy thông tin user theo ID (Admin only)
  getUserById = async (userId: number, options?: { includeDeleted?: boolean }): Promise<any> => {
    const params = options?.includeDeleted ? { includeDeleted: "true" } : undefined;
    const res = await this.apiGet(`/${userId}`, params);
    return res.data;
  };

  // POST /user/create - Tạo user mới (Admin only)
  // Note: Backend seems to use specific endpoints for Teacher/Student
  createUser = async (data: Partial<User>): Promise<any> => {
    const res = await this.apiPost("", data);
    return res.data;
  };

  createTeacher = async (data: any): Promise<any> => {
    const res = await this.apiPost("/teachers", data); // /users/teachers
    return res.data;
  };

  createStudent = async (data: any): Promise<any> => {
    const res = await this.apiPost("/students", data); // /users/students
    return res.data;
  };

  bulkCreateStudents = async (students: any[]): Promise<any> => {
    const res = await this.apiPost("/students/bulk", { students });
    return res.data;
  };

  // PUT /user/:userId - Cập nhật user (Admin only)
  updateUser = async (userId: number, data: Partial<User>): Promise<any> => {
    const res = await this.apiPut(`/${userId}`, data);
    return res.data;
  };

  // DELETE /user/:userId - Xóa user (Admin only)
  deleteUser = async (userId: number): Promise<any> => {
    const res = await this.apiDelete(`/${userId}`);
    return res.data;
  };

  // PUT /user/:userId/restore - Khôi phục user đã xóa (Admin only)
  restoreUser = async (userId: number): Promise<any> => {
    const res = await this.apiPut(`/${userId}/restore`, {});
    return res.data;
  };

  // PUT /user/:userId/reset-password - Reset mật khẩu user (Admin only)
  resetUserPassword = async (
    userId: number,
    newPassword: string,
  ): Promise<any> => {
    const res = await this.apiPut(`/${userId}/reset-password`, { newPassword });
    return res.data;
  };

  // PUT /user/:userId/change-role - Thay đổi role (Admin only)
  changeUserRole = async (userId: number, roleCode: string): Promise<any> => {
    const res = await this.apiPut(`/${userId}/change-role`, { role: roleCode });
    return res.data;
  };

  getPendingUsers = async () => {
    const res = await this.apiGet("/pending");
    return res.data;
  };

  getApprovalStats = async () => {
    const res = await this.apiGet("/approval-stats");
    return res.data;
  };

  approveUser = async (id: number) => {
    const res = await this.apiPost(`/${id}/approve`);
    return res.data;
  };

  rejectUser = async (id: number, reason?: string) => {
    const res = await this.apiPost(`/${id}/reject`, { reason });
    return res.data;
  };
}

const UserModel = new UserModelClass();
export default UserModel;
