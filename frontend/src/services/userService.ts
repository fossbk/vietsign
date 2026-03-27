/**
 * User Data Service
 *
 * Service này cung cấp các hàm để lấy dữ liệu người dùng từ API.
 */

import UserModel from "@/domain/entities/User";
import {
  UserItem,
  roleLabels,
  roleColors,
  userStatusConfig,
} from "@/data/usersData";

// Re-export types và constants
export { roleLabels, roleColors, userStatusConfig } from "@/data/usersData";
export type { UserItem } from "@/data/usersData";

/**
 * Convert API user to UserItem format
 */
function convertApiUserToUserItem(apiUser: any): UserItem {
  return {
    id: apiUser.user_id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.code || "USER",
    isDeleted:
      typeof apiUser.is_deleted === "boolean"
        ? apiUser.is_deleted
        : apiUser.status === "inactive",
    avatar: apiUser.avatar_location || apiUser.avatar_url,
    phone: apiUser.phone_number,
    createdAt: apiUser.created_date
      ? new Date(apiUser.created_date).toLocaleDateString("vi-VN")
      : new Date().toLocaleDateString("vi-VN"),
    organizationId: apiUser.organization_id || apiUser.facility_id,
    organizationName: apiUser.organization_name,
    parentOrganizationName: apiUser.parent_organization_name,
  };
}

export interface UserListResponse {
  users: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Lấy tất cả users từ API
 */
export async function fetchAllUsers(query?: any): Promise<UserListResponse> {
  try {
    // Map frontend query params to backend params
    const apiQuery = {
      ...query,
      q: query?.search,
      organization_id: query?.organizationId, // Map organizationId to organization_id for backend
    };

    let response;
    if (query?.role === "TEACHER") {
      response = await UserModel.getTeachers(apiQuery);
    } else if (query?.role === "STUDENT") {
      response = await UserModel.getStudents(apiQuery);
    } else {
      // Use generic /users endpoint - pass role for filtering
      response = await UserModel.getAllUsers(apiQuery);
    }

    let users: UserItem[] = [];

    if (response.users && Array.isArray(response.users)) {
      users = response.users.map(convertApiUserToUserItem);
    } else if (response.teachers && Array.isArray(response.teachers)) {
      users = response.teachers.map(convertApiUserToUserItem);
    } else if (response.students && Array.isArray(response.students)) {
      users = response.students.map(convertApiUserToUserItem);
    } else if (response.content && Array.isArray(response.content)) {
      users = response.content.map(convertApiUserToUserItem);
    } else if (response.data && Array.isArray(response.data)) {
      users = response.data.map(convertApiUserToUserItem);
    } else if (Array.isArray(response)) {
      users = response.map(convertApiUserToUserItem);
    }

    const meta = response.meta || {};

    return {
      users,
      total: meta.total || response.total || users.length,
      page: meta.page || response.page || 1,
      limit: meta.limit || response.limit || users.length,
      totalPages: meta.totalPages || response.totalPages || 1,
    };
  } catch (error) {
    console.error("Error fetching users from API", error);
    return {
      users: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }
}

/**
 * Lấy user theo ID từ API
 */
export async function fetchUserById(id: number, options?: { includeDeleted?: boolean }): Promise<UserItem | undefined> {
  try {
    const response = await UserModel.getUserById(id, options);
    if (response.user) {
      return convertApiUserToUserItem(response.user);
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching user ${id} from API`, error);
    return undefined;
  }
}

/**
 * Lấy users theo role và tùy chọn theo organization
 */
export async function fetchUsersByRole(
  role: string,
  organizationId?: number,
): Promise<UserItem[]> {
  try {
    // Request with a larger limit to ensure we get enough candidates
    const result = await fetchAllUsers({ role, organizationId, limit: 1000 });

    // Explicitly filter on client side to ensure only users with the target role are returned
    return result.users.filter((u) => u.role === role);
  } catch (error) {
    console.error(`Error fetching users by role ${role}`, error);
    return [];
  }
}

/**
 * Lấy users theo facility
 */
export async function fetchUsersByFacility(
  organizationId: number,
): Promise<UserItem[]> {
  try {
    // Fetch generic users (which includes Admins, Managers), Teachers, and Students
    // We fetch separately to ensure we cover all role-specific endpoints if they exist
    const [genericRes, teachersRes, studentsRes] = await Promise.all([
      fetchAllUsers({ organizationId, limit: 1000 }), // Gets Admins/Managers (and maybe others)
      fetchAllUsers({ role: "TEACHER", organizationId, limit: 1000 }),
      fetchAllUsers({ role: "STUDENT", organizationId, limit: 1000 }),
    ]);

    // Client-side validation: ensure they actually belong to the organization
    // (in case backend ignores the filter on the generic endpoint)
    const validGeneric = genericRes.users.filter(
      (u) => u.organizationId === organizationId,
    );

    // Combine all unique users
    const allUsers = [
      ...validGeneric,
      ...teachersRes.users,
      ...studentsRes.users,
    ];

    // Unique by ID
    const uniqueUsers = Array.from(
      new Map(allUsers.map((u) => [u.id, u])).values(),
    );

    return uniqueUsers;
  } catch (error) {
    console.error("Error fetching users by facility:", error);
    return [];
  }
}

/**
 * Lấy danh sách facility managers
 */
export async function fetchFacilityManagers(): Promise<UserItem[]> {
  return fetchUsersByRole("FACILITY_MANAGER");
}

/**
 * Tạo người dùng mới
 */
/**
 * Tạo người dùng mới
 */
/**
 * Tạo người dùng mới
 */
export async function createUser(data: any): Promise<any> {
  try {
    // Map frontend data to backend payload
    const payload: any = {
      name: data.name,
      email: data.email,
      password: data.password, // Add password
      phoneNumber: data.phone, // Map phone -> phoneNumber
      birthDay: data.birthDay,
      address: data.address,
      classRoomName: data.className,
      schoolName: data.schoolName || data.facilityName,
      organization_id: data.organizationId, // Map to organization_id (underscore for BE)
      code: data.role || data.code, // Pass role code for generic user creation
    };

    let res;
    if (data.role === "TEACHER" || payload.code === "TEACHER") {
      res = await UserModel.createTeacher(payload);
    } else if (data.role === "STUDENT" || payload.code === "STUDENT") {
      res = await UserModel.createStudent(payload);
    } else {
      // Fallback for other roles or generic create if supported
      res = await UserModel.createUser(payload);
    }

    // Backend returns { userId }, frontend needs { id } or { user_id }
    if (res && res.userId) {
      return { ...res, id: res.userId, user_id: res.userId };
    }
    return res;
  } catch (error) {
    console.error("API create user failed", error);
    throw error;
  }
}

/**
 * Cập nhật thông tin người dùng
 */
export async function updateUser(userId: number, data: any): Promise<any> {
  try {
    const payload: any = {
      ...data,
      phone_number: data.phone, // Map phone -> phone_number for update
      avatar_location: data.avatar, // Map avatar -> avatar_location
      organization_id: data.organizationId ?? data.organization_id, // Map organizationId -> organization_id
    };
    return await UserModel.updateUser(userId, payload);
  } catch (error) {
    console.error("API update user failed", error);
    throw error;
  }
}

/**
 * Xóa người dùng
 */
export async function deleteUser(userId: number): Promise<any> {
  try {
    return await UserModel.deleteUser(userId);
  } catch (error) {
    console.error("API delete user failed", error);
    throw error;
  }
}

/**
 * Khôi phục người dùng
 */
export async function restoreUser(userId: number): Promise<any> {
  try {
    return await UserModel.restoreUser(userId);
  } catch (error) {
    console.error("API restore user failed", error);
    throw error;
  }
}

/**
 * Reset mật khẩu
 */
export async function resetPassword(
  userId: number,
  newPassword: string,
): Promise<any> {
  try {
    return await UserModel.resetUserPassword(userId, newPassword);
  } catch (error) {
    console.error("API reset password failed", error);
    throw error;
  }
}

/**
 * Thay đổi vai trò
 */
export async function changeUserRole(
  userId: number,
  roleCode: string,
): Promise<any> {
  try {
    return await UserModel.changeUserRole(userId, roleCode);
  } catch (error) {
    console.error("API change role failed", error);
    throw error;
  }
}

/**
 * Lấy danh sách users chờ phê duyệt
 */
export async function fetchPendingUsers(): Promise<UserItem[]> {
  try {
    const data = await UserModel.getPendingUsers();
    const items = data?.users || data || [];
    return Array.isArray(items) ? items.map(convertApiUserToUserItem) : [];
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return [];
  }
}

/**
 * Lấy thống kê phê duyệt
 */
export async function fetchApprovalStats(): Promise<any> {
  try {
    const data = await UserModel.getApprovalStats();
    return data || { pending: 0, approved: 0, rejected: 0 };
  } catch (error) {
    console.error("Error fetching approval stats:", error);
    return { pending: 0, approved: 0, rejected: 0 };
  }
}
