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
  FileSpreadsheet,
  BookOpen,
  FileText,
  FolderKanban,
  Check,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import {
  bulkCreateStudents,
  createUser,
  fetchUserById,
  fetchUsersByRole,
} from "@/services/userService";
import {
  fetchAllOrganizations,
  OrganizationItem,
} from "@/services/organizationService";
import {
  createLesson,
  fetchLessonsByClassroom,
  type Lesson,
} from "@/services/lessonService";
import {
  assignTopicsToClassroom,
  fetchAvailableTopicsForClassroom,
  fetchTopicsByClassroom,
  removeTopicFromClassroom,
  fetchTopicStudentStatistics,
  type TopicItem,
} from "@/services/topicService";
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
  const [isCreateStudentModalOpen, setIsCreateStudentModalOpen] =
    useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    grade: "",
  });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [availableTopics, setAvailableTopics] = useState<TopicItem[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [isAssigningTopics, setIsAssigningTopics] = useState(false);
  const [removingTopicId, setRemovingTopicId] = useState<number | null>(null);
  const [topicStats, setTopicStats] = useState<any[]>([]);
  const [topicStatsTopic, setTopicStatsTopic] = useState<TopicItem | null>(null);
  const [isTopicStatsOpen, setIsTopicStatsOpen] = useState(false);
  const [isTopicStatsLoading, setIsTopicStatsLoading] = useState(false);
  const [isLessonsLoading, setIsLessonsLoading] = useState(false);
  const [isCreateLessonModalOpen, setIsCreateLessonModalOpen] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({
    name: "",
    topicId: "",
    description: "",
    content: "",
  });

  // Load class and teachers
  // Load class and teachers
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true); // Start loading

      try {
        // 1. Fetch Class Content FIRST
        const fetchedClass = await fetchClassById(id);

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
      loadClassLessons();
    }
  }, [classItem?.id]);

  const loadClassLessons = async () => {
    if (!id) return;
    setIsLessonsLoading(true);
    try {
      const [lessonsData, topicsData] = await Promise.all([
        fetchLessonsByClassroom(id),
        fetchTopicsByClassroom(id),
      ]);
      setLessons(lessonsData);
      setTopics(topicsData);
    } catch (error) {
      console.error("Failed to load class lessons", error);
    } finally {
      setIsLessonsLoading(false);
    }
  };

  const openTopicModal = async () => {
    if (!classItem?.id) return;
    setIsTopicModalOpen(true);
    setSelectedTopicIds([]);
    setIsTopicsLoading(true);
    try {
      setAvailableTopics(
        await fetchAvailableTopicsForClassroom(classItem.id),
      );
    } catch (error: any) {
      console.error("Failed to load available topics", error);
      alert(error?.response?.data?.message || "Không thể tải kho chủ đề");
    } finally {
      setIsTopicsLoading(false);
    }
  };

  const toggleTopicSelection = (topicId: number) => {
    setSelectedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
  };

  const handleAssignTopics = async () => {
    if (!classItem?.id || selectedTopicIds.length === 0) return;
    setIsAssigningTopics(true);
    try {
      await assignTopicsToClassroom(classItem.id, selectedTopicIds);
      await loadClassLessons();
      setIsTopicModalOpen(false);
      setSelectedTopicIds([]);
    } catch (error: any) {
      console.error("Failed to assign topics", error);
      alert(error?.response?.data?.message || "Thêm chủ đề vào lớp thất bại");
    } finally {
      setIsAssigningTopics(false);
    }
  };

  const handleRemoveTopic = async (topic: TopicItem) => {
    if (!classItem?.id) return;
    if (!window.confirm(`Gỡ chủ đề “${topic.name}” khỏi lớp học này?`)) return;

    setRemovingTopicId(topic.id);
    try {
      await removeTopicFromClassroom(classItem.id, topic.id);
      await loadClassLessons();
    } catch (error: any) {
      console.error("Failed to remove topic", error);
      alert(error?.response?.data?.message || "Gỡ chủ đề khỏi lớp thất bại");
    } finally {
      setRemovingTopicId(null);
    }
  };

  const openTopicStats = async (topic: TopicItem) => {
    if (!id) return;
    setTopicStatsTopic(topic);
    setIsTopicStatsOpen(true);
    setIsTopicStatsLoading(true);
    try {
      setTopicStats(await fetchTopicStudentStatistics(id, topic.id));
    } catch (error) {
      console.error("Failed to load topic statistics", error);
      alert("Không thể tải kết quả chủ đề");
    } finally {
      setIsTopicStatsLoading(false);
    }
  };

  const resetNewLesson = () => {
    setNewLesson({
      name: "",
      topicId: "",
      description: "",
      content: "",
    });
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classItem?.id) return;

    if (!newLesson.name.trim()) {
      alert("Vui lòng nhập tên bài học");
      return;
    }

    setIsCreatingLesson(true);
    try {
      await createLesson({
        name: newLesson.name.trim(),
        topic_id: newLesson.topicId ? Number(newLesson.topicId) : null,
        description: newLesson.description.trim() || null,
        content: newLesson.content.trim() || null,
        classroom_id: classItem.id,
        difficulty_level: "BEGINNER",
        order_number: lessons.length + 1,
        is_active: 1,
      });
      await loadClassLessons();
      resetNewLesson();
      setIsCreateLessonModalOpen(false);
    } catch (error: any) {
      console.error("Failed to create lesson", error);
      alert(error?.response?.data?.message || "Tạo bài học thất bại");
    } finally {
      setIsCreatingLesson(false);
    }
  };

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

  const resetNewStudent = () => {
    setNewStudent({
      name: "",
      email: "",
      password: "",
      phoneNumber: "",
      grade: "",
    });
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classItem) return;
    if (!classItem.id) {
      alert("Không tìm thấy mã lớp. Vui lòng tải lại trang lớp học.");
      return;
    }

    const grade = Number(newStudent.grade);
    if (!newStudent.name || !newStudent.email || grade < 1 || grade > 5) {
      alert("Vui long nhap ten, email va khoi lop 1-5");
      return;
    }

    try {
      await createUser({
        ...newStudent,
        role: "STUDENT",
        grade,
        organizationId: classItem.organizationId,
        classroomId: classItem.id,
      });
      await Promise.all([loadClassMembers(), loadAllStudents()]);
      resetNewStudent();
      setIsCreateStudentModalOpen(false);
    } catch (error: any) {
      console.error("Failed to create student", error);
      alert(error?.response?.data?.message || "Tạo học sinh thất bại");
    }
  };

  const normalizeImportKey = (value: unknown) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const readCell = (row: Record<string, unknown>, keys: string[]) => {
    const entries = Object.entries(row).map(([key, value]) => [
      normalizeImportKey(key),
      value,
    ]);
    const found = entries.find(([key]) => keys.includes(String(key)));
    return found?.[1] ? String(found[1]).trim() : "";
  };

  const handleImportFile = async (file: File) => {
    setImportRows([]);
    setImportErrors([]);
    setImportResult(null);

    if (!classItem?.id) {
      setImportErrors(["Không tìm thấy mã lớp. Vui lòng tải lại trang lớp học."]);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const errors: string[] = [];
      const rows = rawRows.map((row, index) => {
        const parsed = {
          name: readCell(row, ["name", "fullname", "hovaten", "hoten"]),
          email: readCell(row, ["email", "mail"]),
          password: readCell(row, ["password", "matkhau"]),
          phoneNumber: readCell(row, ["phone", "phonenumber", "sdt", "sodienthoai"]),
          grade: Number(readCell(row, ["grade", "khoi", "lop", "khoilop"])),
          organizationId: classItem?.organizationId,
          classroomId: classItem?.id,
        };

        if (!parsed.name) errors.push(`Dòng ${index + 2}: thiếu tên`);
        if (!parsed.email) errors.push(`Dòng ${index + 2}: thiếu email`);
        if (!Number.isInteger(parsed.grade) || parsed.grade < 1 || parsed.grade > 5) {
          errors.push(`Dòng ${index + 2}: khối lớp phải từ 1 đến 5`);
        }

        return parsed;
      });

      setImportRows(rows);
      setImportErrors(errors);
    } catch (error) {
      console.error("Failed to read import file", error);
      setImportErrors(["Không đọc được file Excel"]);
    }
  };

  const handleImportStudents = async () => {
    if (!importRows.length || importErrors.length > 0) return;
    if (!classItem?.id || importRows.some((row) => !row.classroomId)) {
      setImportErrors(["classroomId là bắt buộc khi import học sinh vào lớp"]);
      return;
    }

    setIsImporting(true);
    try {
      const result = await bulkCreateStudents(importRows);
      setImportResult(result);
      await Promise.all([loadClassMembers(), loadAllStudents()]);
    } catch (error: any) {
      console.error("Failed to import students", error);
      alert(error?.response?.data?.message || "Import học sinh thất bại");
    } finally {
      setIsImporting(false);
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

      {/* Assigned Topics Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Chủ đề của lớp học
              </h2>
              <p className="text-sm text-gray-500">
                Gán các chủ đề trong kho của giáo viên vào lớp này
              </p>
            </div>
            <span className="text-sm text-gray-500">
              ({topics.length} chủ đề)
            </span>
          </div>
          <button
            onClick={openTopicModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm shadow-sm"
          >
            <Plus size={16} />
            Thêm Chủ Đề
          </button>
        </div>

        <div className="p-6">
          {isLessonsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="ml-2 text-gray-500">Đang tải chủ đề...</span>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">
                Lớp học chưa được gán chủ đề
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Chọn chủ đề từ kho của bạn để học sinh bắt đầu học.
              </p>
              <button
                onClick={openTopicModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm"
              >
                <Plus size={16} />
                Thêm Chủ Đề
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                    <FolderKanban size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900">
                      {topic.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {topic.description || "Chưa có mô tả"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-primary-700">
                      {topic.vocabularyCount || 0} từ vựng
                    </p>
                  </div>
                  <button
                    onClick={() => openTopicStats(topic)}
                    className="rounded-lg p-2 text-primary-600 hover:bg-primary-50"
                    title="Xem kết quả học sinh"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    disabled={removingTopicId === topic.id}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Gỡ khỏi lớp"
                  >
                    {removingTopicId === topic.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Class Lessons Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Bài học trong lớp
              </h2>
              <p className="text-sm text-gray-500">
                Giáo viên tạo bài học theo chủ đề cho lớp này
              </p>
            </div>
            <span className="text-sm text-gray-500">
              ({lessons.length} bài học)
            </span>
          </div>
          <button
            onClick={() => setIsCreateLessonModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm shadow-sm"
          >
            <Plus size={16} />
            Tạo Bài Học
          </button>
        </div>

        <div className="p-6">
          {isLessonsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="ml-2 text-gray-500">Đang tải bài học...</span>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">
                Chưa có bài học trong lớp này
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Tạo bài học đầu tiên để học sinh bắt đầu học theo lớp.
              </p>
              <button
                onClick={() => setIsCreateLessonModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm"
              >
                <Plus size={16} />
                Tạo Bài Học
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const topic = topics.find((item) => item.id === lesson.topic_id);
                return (
                  <div
                    key={lesson.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {lesson.name}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-full">
                          {topic?.name || "Không thuộc chủ đề"}
                        </span>
                      </div>
                      {lesson.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {lesson.description}
                        </p>
                      )}
                      {lesson.content && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {lesson.content}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lesson.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lesson.is_active ? "Hiển thị" : "Ẩn"}
                    </span>
                  </div>
                );
              })}
            </div>
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
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setIsCreateStudentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium text-sm shadow-sm"
            >
              <UserPlus size={16} />
              Tạo Học Sinh
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 text-primary-700 bg-primary-50 rounded-xl hover:bg-primary-100 font-medium text-sm"
            >
              <FileSpreadsheet size={16} />
              Import Excel
            </button>
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
            >
              <Plus size={16} />
              Thêm Học Sinh Có Sẵn
            </button>
          </div>
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

      {/* Create Lesson Modal */}
      <Modal
        isOpen={isTopicStatsOpen}
        onClose={() => setIsTopicStatsOpen(false)}
        title={`Kết quả: ${topicStatsTopic?.name || "Chủ đề"}`}
        maxWidth="max-w-6xl"
      >
        {isTopicStatsLoading ? (
          <div className="py-12 text-center text-gray-500">Đang tải kết quả...</div>
        ) : topicStats.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Chưa có học sinh hoặc chưa có dữ liệu.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-gray-100 text-gray-500"><th className="p-3">Học sinh</th><th className="p-3">Tiến độ</th><th className="p-3">Kiểm tra gần nhất</th><th className="p-3">Điểm kiểm tra cao nhất</th><th className="p-3">Lật thẻ gần nhất</th><th className="p-3">Điểm lật thẻ cao nhất</th></tr></thead>
              <tbody>{topicStats.map((student) => <tr key={student.studentId} className="border-b border-gray-50"><td className="p-3 font-semibold text-gray-800">{student.studentName}</td><td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary-600" style={{ width: `${student.progressPercent}%` }} /></div><span>{student.progressPercent}%</span></div></td><td className="p-3">{student.quizLatestScore}%</td><td className="p-3 font-semibold text-primary-700">{student.quizBestScore}%</td><td className="p-3">{student.gameLatestScore}</td><td className="p-3 font-semibold text-orange-600">{student.gameBestScore}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setSelectedTopicIds([]);
        }}
        title="Thêm chủ đề vào lớp"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Chọn một hoặc nhiều chủ đề trong kho của bạn để gán vào lớp{" "}
            <span className="font-semibold text-gray-900">{classItem.name}</span>.
          </p>

          {isTopicsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 size={24} className="mr-2 animate-spin" />
              Đang tải kho chủ đề...
            </div>
          ) : availableTopics.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-10 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 font-medium text-gray-700">
                Không còn chủ đề nào để thêm
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Hãy tạo chủ đề mới trong mục Quản lý chủ đề.
              </p>
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {availableTopics.map((topic) => {
                const selected = selectedTopicIds.includes(topic.id);
                return (
                  <button
                    type="button"
                    key={topic.id}
                    onClick={() => toggleTopicSelection(topic.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-primary-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                          selected
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {selected && <Check size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-900">
                          {topic.name}
                        </span>
                        <span className="mt-1 block text-sm text-gray-500 line-clamp-2">
                          {topic.description || "Chưa có mô tả"}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAssignTopics}
              disabled={selectedTopicIds.length === 0 || isAssigningTopics}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAssigningTopics && <Loader2 size={17} className="animate-spin" />}
              Thêm {selectedTopicIds.length || ""} chủ đề
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateLessonModalOpen}
        onClose={() => {
          setIsCreateLessonModalOpen(false);
          resetNewLesson();
        }}
        title="Tạo bài học"
        maxWidth="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={handleCreateLesson}>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Tên bài học <span className="text-red-500">*</span>
            </label>
            <input
              value={newLesson.name}
              onChange={(e) =>
                setNewLesson((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ví dụ: Bài 01: Chào hỏi cơ bản"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Chủ đề
            </label>
            <select
              value={newLesson.topicId}
              onChange={(e) =>
                setNewLesson((prev) => ({ ...prev, topicId: e.target.value }))
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Không thuộc chủ đề</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Mô tả
            </label>
            <textarea
              value={newLesson.description}
              onChange={(e) =>
                setNewLesson((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              placeholder="Mô tả ngắn về nội dung bài học"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Nội dung
            </label>
            <textarea
              value={newLesson.content}
              onChange={(e) =>
                setNewLesson((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={6}
              placeholder="Nhập hướng dẫn, mục tiêu hoặc nội dung chính của bài học"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 text-sm text-primary-700">
            Bài học sẽ tự động được gắn vào lớp: <b>{classItem.name}</b>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreateLessonModalOpen(false);
                resetNewLesson();
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreatingLesson}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isCreatingLesson && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {isCreatingLesson ? "Đang tạo..." : "Tạo bài học"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Student Modal */}
      <Modal
        isOpen={isCreateStudentModalOpen}
        onClose={() => {
          setIsCreateStudentModalOpen(false);
          resetNewStudent();
        }}
        title="Tạo tài khoản học sinh"
        maxWidth="max-w-lg"
      >
        <form className="space-y-4" onSubmit={handleCreateStudent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                value={newStudent.name}
                onChange={(e) =>
                  setNewStudent((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) =>
                  setNewStudent((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Mật khẩu
              </label>
              <input
                type="password"
                value={newStudent.password}
                onChange={(e) =>
                  setNewStudent((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Mac dinh 123456 neu de trong"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Số điện thoại
              </label>
              <input
                value={newStudent.phoneNumber}
                onChange={(e) =>
                  setNewStudent((prev) => ({
                    ...prev,
                    phoneNumber: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Khối lớp <span className="text-red-500">*</span>
              </label>
              <select
                value={newStudent.grade}
                onChange={(e) =>
                  setNewStudent((prev) => ({ ...prev, grade: e.target.value }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                required
              >
                <option value="">Chọn khối</option>
                {[1, 2, 3, 4, 5].map((grade) => (
                  <option key={grade} value={grade}>
                    Khoi {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateStudentModalOpen(false);
                resetNewStudent();
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
            >
              Huy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium"
            >
              Tạo và thêm vào lớp
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Students Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportRows([]);
          setImportErrors([]);
          setImportResult(null);
        }}
        title="Import danh sách học sinh"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
            File cần có các cột: <b>name</b>, <b>email</b>, <b>grade</b>.
            Cột tùy chọn: <b>password</b>, <b>phone</b>. Các tiêu đề tiếng
            Việt như Họ tên, Mật khẩu, Số điện thoại, Khối cũng được hỗ trợ.
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
          />

          {importErrors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              {importErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          {importRows.length > 0 && importErrors.length === 0 && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-700">
              San sang import {importRows.length} hoc sinh vao lop nay.
            </div>
          )}

          {importResult && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
              Import xong: {importResult.successCount} thành công,{" "}
              {importResult.failureCount} loi.
              {importResult.results
                ?.filter((item: any) => !item.success)
                .map((item: any) => (
                  <p key={`${item.row}-${item.email}`} className="mt-1">
                    Dòng {item.row}: {item.message}
                  </p>
                ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!importRows.length || importErrors.length > 0 || isImporting}
              onClick={handleImportStudents}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {isImporting ? "Đang import..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>

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
