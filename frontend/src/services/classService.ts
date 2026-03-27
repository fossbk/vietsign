import ClassModel from "@/domain/entities/Class";
import { ClassItem } from "@/data/classesData";

export async function fetchAllClasses(query?: any): Promise<ClassItem[]> {
  try {
    const response = await ClassModel.getAllClasses(query);
    console.log("📋 [fetchAllClasses] Raw response from ClassModel:", response);
    
    // Backend returns { data: [...], page, limit, total }
    const data = response.data || response;
    console.log("📋 [fetchAllClasses] Parsed data:", data);
    console.log("📋 [fetchAllClasses] Is data array?", Array.isArray(data));

    // Handle different response structures
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.classes && Array.isArray(data.classes)) {
      items = data.classes;
    }
    
    console.log("📋 [fetchAllClasses] Items count:", items.length);

    // Map items - Backend now returns proper camelCase format
    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      teacherId: item.teacherId,
      organizationId: item.organizationId,
      organizationName: item.organizationName,
      schedule: item.schedule,
      status: item.status, // Return raw status (APPROVED, PENDING, etc.)
      students: item.students || 0,
      maxStudents: item.maxStudents,
      startDate: item.startDate,
      endDate: item.endDate,
      classLevel: item.classLevel,
      code: item.classCode,
      thumbnail: item.thumbnailPath,
    }));
  } catch (error) {
    console.error("❌ [fetchAllClasses] Error fetching classes:", error);
    return [];
  }
}

export async function fetchClassById(
  id: number,
): Promise<ClassItem | undefined> {
  try {
    const response = await ClassModel.getClassById(id);
    // Backend returns directly the object or wrapped in data
    const item = response.data || response;

    if (!item) return undefined;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      teacherId: item.teacherId,
      organizationId: item.organizationId,
      organizationName: item.organizationName,
      schedule: item.schedule,
      status: item.status, // Return raw status
      students: item.students || 0,
      maxStudents: item.maxStudents,
      startDate: item.startDate,
      endDate: item.endDate,
      classLevel: item.classLevel,
      code: item.classCode,
      thumbnail: item.thumbnailPath,
    };
  } catch (error) {
    console.error("Error fetching class:", error);
    return undefined;
  }
}

/**
 * Helper to convert ClassItem to API payload
 */
function convertItemToApiPayload(data: any): any {
  return {
    name: data.name,
    description: data.description,
    classCode: data.code || data.classCode,
    classLevel: data.gradeLevel || data.classLevel,
    teacherId: data.teacherId,
    organizationId: data.organizationId,
    thumbnailPath: data.thumbnail || data.thumbnailPath,
    // Map status: ongoing -> ACTIVE (which BE maps to APPROVED), others -> pass as is or map if needed
    // Backend expects: ACTIVE/ongoing -> APPROVED, REJECTED -> REJECTED, others -> PENDING (default in create)
    // We'll pass the raw status for other cases so backend update can store "upcoming" or "completed" if allowed
    status: data.status === "ongoing" ? "ACTIVE" : data.status,
    maxStudents: Number(data.maxStudents),
    schedule: data.schedule,
    startDate: data.startDate,
    endDate: data.endDate,
  };
}

export async function createClass(data: any) {
  const payload = convertItemToApiPayload(data);
  console.log("[createClass] Sending payload:", payload);
  return await ClassModel.createClass(payload);
}

export async function updateClass(id: number, data: any) {
  const payload = convertItemToApiPayload(data);
  return await ClassModel.updateClass(id, payload);
}

export async function deleteClass(id: number) {
  return await ClassModel.deleteClass(id);
}

// Student management
export interface ClassMember {
  id: number;
  userId: number;
  name: string;
  email?: string;
  role: "STUDENT" | "TEACHER";
  enrolledAt?: string;
  avatar?: string;
  status?: string;
  joinDate?: string;
}

export async function fetchClassroomStudents(
  classroomId: number,
): Promise<ClassMember[]> {
  try {
    const response = await ClassModel.getClassroomStudents(classroomId);
    const data = response.data || response;

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.id || item.enrollment_id,
      userId: item.user_id || item.userId,
      name: item.name || item.user_name || `User ${item.user_id}`,
      email: item.email,
      role: "STUDENT" as const,
      enrolledAt: item.enrolled_at || item.enrolledAt,
      avatar: item.avatar_location || item.avatar,
      status: item.status || "offline",
      joinDate: (item.enrolled_at || item.enrolledAt)?.split("T")[0],
    }));
  } catch (error) {
    console.error("Error fetching classroom students:", error);
    return [];
  }
}

export async function addStudentToClassroom(
  classroomId: number,
  studentId: number,
) {
  return await ClassModel.addStudentToClassroom(classroomId, studentId);
}

export async function removeStudentFromClassroom(
  classroomId: number,
  studentId: number,
) {
  return await ClassModel.removeStudentFromClassroom(classroomId, studentId);
}
