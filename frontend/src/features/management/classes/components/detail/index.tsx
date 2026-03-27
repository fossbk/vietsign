"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Users,
  Calendar,
  Clock,
  User,
  Building,
  Plus,
  UserPlus,
  GraduationCap,
  Search,
  Loader2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ClassItem, statusConfig } from "@/data";
import {
  fetchClassById,
  updateClass,
  deleteClass,
  fetchClassroomStudents,
  addStudentToClassroom,
  removeStudentFromClassroom,
  ClassMember,
} from "@/services/classService";
import { fetchUserById, fetchUsersByRole } from "@/services/userService";
import {
  fetchAllOrganizations,
  OrganizationItem,
} from "@/services/organizationService";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { Modal } from "@/shared/components/common/Modal";

export function ClassManagementDetail() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClassItem>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for teachers list and current teacher name
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState<string>("Đang tải...");

  // State for organizations
  const [facilities, setFacilities] = useState<OrganizationItem[]>([]);
  const [facilitiesMap, setFacilitiesMap] = useState<Record<number, string>>(
    {},
  );

  // State for class members
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ClassMember | null>(
    null,
  );
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Load class and teachers
  // Load class and teachers
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true); // Start loading

      try {
        console.log("[ClassDetail] Fetching class ID:", id);

        // 1. Fetch Class Content FIRST
        const fetchedClass = await fetchClassById(id);
        console.log("[ClassDetail] Fetched class:", fetchedClass);

        if (fetchedClass) {
          setClassItem(fetchedClass);
          setEditForm({ ...fetchedClass });
          setIsLoading(false); // Valid class found -> Show UI immediately

          // 2. Fetch Auxiliary Data (Teachers, Facilities) in background
          try {
            const [teachersList, facilitiesList] = await Promise.all([
              fetchUsersByRole("TEACHER"),
              fetchAllOrganizations(),
            ]);

            setTeachers(teachersList);
            setFacilities(facilitiesList);

            // Map facilities
            const fMap: Record<number, string> = {};
            facilitiesList.forEach((f: any) => {
              fMap[f.id] = f.name;
            });
            setFacilitiesMap(fMap);

            // Fetch Teacher Name logic
            if (fetchedClass.teacherId) {
              const t = teachersList.find(
                (u: any) => u.id === fetchedClass.teacherId,
              );
              if (t) {
                setTeacherName(t.name);
              } else {
                // Try fetch individual user if not in list
                fetchUserById(fetchedClass.teacherId)
                  .then((teacher) => {
                    setTeacherName(teacher?.name || "Chi tiết gv không có");
                  })
                  .catch(() => setTeacherName("Lỗi lấy tên gv"));
              }
            } else {
              setTeacherName("Chưa phân công");
            }
          } catch (auxError) {
            console.error("Failed to load auxiliary data", auxError);
          }
        } else {
          // Class not found
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load class", error);
        setIsLoading(false);
      }
    };

    if (id) {
      initData();
    }
  }, [id]);

  useEffect(() => {
    if (classItem?.name) {
      document.title = `${classItem.name} - Quản lý lớp học - VietSignSchool`;
    }
  }, [classItem]);

  const getFacilityName = (organizationId: number | null): string => {
    if (organizationId === null) return "Online";
    if (organizationId === undefined) return "Không xác định";
    return facilitiesMap[organizationId] || `Cơ sở #${organizationId}`;
  };

  const handleSave = async () => {
    if (classItem && editForm) {
      try {
        // Optimistic update
        const updatedItem = { ...classItem, ...editForm } as ClassItem;
        setClassItem(updatedItem);
        setIsEditing(false);

        await updateClass(classItem.id, editForm);
      } catch (error) {
        console.error("Failed to update class", error);
        // Revert or show error
      }
    }
  };

  const handleDelete = async () => {
    if (classItem) {
      try {
        await deleteClass(classItem.id);
        router.push("/classes-management");
      } catch (error) {
        console.error("Failed to delete class", error);
      }
    }
  };

  // Load class members (students)
  const loadClassMembers = async () => {
    if (!id) return;
    setIsMembersLoading(true);
    try {
      const students = await fetchClassroomStudents(id);
      setClassMembers(students);
    } catch (error) {
      console.error("Failed to load class members", error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  // Load all students for adding - filtered by organization
  const loadAllStudents = async () => {
    if (!classItem) return;
    try {
      const studentsList = await fetchUsersByRole(
        "STUDENT",
        classItem.organizationId || undefined,
      );
      setAllStudents(studentsList);
    } catch (error) {
      console.error("Failed to load students", error);
    }
  };

  // Load members when class is loaded
  useEffect(() => {
    if (classItem) {
      loadClassMembers();
      loadAllStudents();
    }
  }, [classItem?.id]);

  // Handle add member
  const handleAddMember = async (studentId: number) => {
    if (!classItem) return;
    setIsAddingMember(true);
    try {
      await addStudentToClassroom(classItem.id, studentId);
      await loadClassMembers();
      setIsAddMemberModalOpen(false);
      setMemberSearchQuery("");
    } catch (error) {
      console.error("Failed to add member", error);
      alert("Thêm thành viên thất bại");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async () => {
    if (!classItem || !memberToRemove) return;
    try {
      await removeStudentFromClassroom(classItem.id, memberToRemove.userId);
      await loadClassMembers();
      setIsRemoveMemberModalOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Failed to remove member", error);
      alert("Xóa thành viên thất bại");
    }
  };

  // Get filtered students for adding (exclude already enrolled)
  const filteredStudentsToAdd = allStudents.filter((s) => {
    const isNotEnrolled = !classMembers.some((m) => m.userId === s.id);
    const matchesSearch = memberSearchQuery
      ? s.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
      : true;
    return isNotEnrolled && matchesSearch;
  });

  if (!classItem) {
    if (isLoading)
      return (
        <div className="flex justify-center py-20 text-gray-500">
          Đang tải...
        </div>
      );
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Không tìm thấy lớp học
        </h2>
        <button
          onClick={() => router.push("/classes-management")}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-800" },
    PENDING: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-800" },
    REJECTED: { label: "từ chối", color: "bg-red-100 text-red-800" },
    ongoing: { label: "Đang diễn ra", color: "bg-green-100 text-green-800" },
    upcoming: { label: "Sắp diễn ra", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Đã hoàn thành", color: "bg-gray-100 text-gray-800" },
  };

  const statusInfo = statusMap[classItem.status] || {
    label: classItem.status,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => router.push("/classes-management")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                {classItem.name.split(" ").pop()}
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">{classItem.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                    {statusInfo.label}
                  </span>
                  {classItem.classLevel && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                      {classItem.classLevel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Tên lớp học
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg font-medium"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 text-lg font-bold">
                  {classItem.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Giáo viên phụ trách
              </label>
              {isEditing ? (
                <select
                  value={editForm.teacherId || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      teacherId: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <User size={18} className="text-gray-400" />
                  {teacherName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Cơ sở đào tạo
              </label>
              {isEditing ? (
                <select
                  value={editForm.organizationId || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      organizationId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="">Học Online</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <Building size={18} className="text-gray-400" />
                  {getFacilityName(classItem.organizationId)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Khối lớp
              </label>
              {isEditing ? (
                <select
                  value={editForm.classLevel || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, classLevel: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="">Chọn khối lớp</option>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={String(level)}>
                      Lớp {level}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                  {classItem.classLevel ? `Lớp ${classItem.classLevel}` : "Chưa xác định"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Trạng thái
              </label>
              {isEditing ? (
                <select
                  value={editForm.status || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as ClassItem["status"],
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="ongoing">Đang diễn ra</option>
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="completed">Đã hoàn thành</option>
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </p>
              )}
            </div>

            {(classItem.description || isEditing) && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Mô tả
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                  />
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                    {classItem.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({ ...classItem });
                }}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
              >
                <X size={18} />
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
              >
                <Save size={18} />
                Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
              >
                <Edit size={18} />
                Chỉnh sửa
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 size={18} />
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Class Members Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Thành viên lớp học
            </h2>
            <span className="text-sm text-gray-500">
              ({classMembers.length + (classItem.teacherId ? 1 : 0)} người)
            </span>
          </div>
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm shadow-sm"
          >
            <UserPlus size={16} />
            Thêm học sinh
          </button>
        </div>

        <div className="p-6">
          {/* Teacher Section */}
          {classItem.teacherId && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Giáo viên phụ trách
              </h3>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                  {teacherName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{teacherName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <GraduationCap size={14} />
                    Giáo viên
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Students Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Danh sách học sinh
            </h3>

            {isMembersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                <span className="ml-2 text-gray-500">Đang tải...</span>
              </div>
            ) : classMembers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Chưa có học sinh trong lớp</p>
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="mt-3 text-primary-600 font-medium hover:underline"
                >
                  Thêm học sinh ngay
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {classMembers.map((member) => (
                  <div
                    key={`member-${member.userId}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {member.name}
                      </p>
                      {member.email && (
                        <p className="text-sm text-gray-500 truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      Học sinh
                    </span>
                    <button
                      onClick={() => {
                        setMemberToRemove(member);
                        setIsRemoveMemberModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Xóa khỏi lớp"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setMemberSearchQuery("");
        }}
        title="Thêm học sinh vào lớp"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredStudentsToAdd.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {memberSearchQuery
                  ? "Không tìm thấy học sinh phù hợp"
                  : "Tất cả học sinh đã được thêm vào lớp"}
              </div>
            ) : (
              filteredStudentsToAdd.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {student.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {student.name}
                    </p>
                    {student.email && (
                      <p className="text-sm text-gray-500 truncate">
                        {student.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddMember(student.id)}
                    disabled={isAddingMember}
                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isAddingMember ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Thêm
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => {
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMember}
        title="Xóa học sinh khỏi lớp"
        message={`Bạn có chắc chắn muốn xóa "${memberToRemove?.name}" khỏi lớp học này?`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa lớp học "${classItem.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
