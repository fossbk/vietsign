"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  HelpCircle,
  Search,
  Plus,
  Filter,
  Trash2,
  Eye,
  FileQuestion,
  Image as ImageIcon,
  Video,
  Loader2,
  Edit,
  BookOpen,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/core/store";
import {
  fetchAllQuestions,
  createQuestion,
  deleteQuestion,
} from "@/services/questionService";
import { fetchAllClasses } from "@/services/classService";
import { fetchAllOrganizations } from "@/services/organizationService";
import { OrganizationItem } from "@/data";
import { uploadFile } from "@/services/uploadService";
import {
  Pagination,
  usePagination,
} from "@/shared/components/common/Pagination";
import { Modal } from "@/shared/components/common/Modal";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { removeVietnameseTones } from "@/shared/utils/text";

const QUESTIONS_PER_PAGE = 10;

export function QuestionsManagement() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User role from Redux
  const { user } = useSelector((state: RootState) => state.admin);
  const userRole = user?.role?.role || user?.code;
  const isAdmin = ["Admin", "ADMIN", "SUPER_ADMIN", "TEST"].includes(userRole);
  const isFacilityManager = [
    "FacilityManager",
    "FACILITY_MANAGER",
    "CENTER_ADMIN",
    "SCHOOL_ADMIN",
  ].includes(userRole);
  const isTeacher = userRole === "Teacher" || userRole === "TEACHER";
  const userOrgId = user?.organizationId || (user as any)?.organization_id;
  const userId = user?.id || (user as any)?.user_id;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [classesMap, setClassesMap] = useState<Record<number, string>>({});
  const [classOrgMap, setClassOrgMap] = useState<Record<number, number | null>>(
    {},
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First load facilities and classes to build query params
      const [facilitiesData, classesData] = await Promise.all([
        fetchAllOrganizations().catch((err) => {
          console.error("❌ [loadData] Fetch organizations failed:", err);
          return [];
        }),
        fetchAllClasses().catch((err) => {
          console.error("❌ [loadData] Fetch classes failed:", err);
          return [];
        }),
      ]);

      console.log("📋 [loadData] classesData received:", classesData);
      console.log("📋 [loadData] classesData length:", classesData?.length);
      console.log("📋 [loadData] User role:", userRole, "| userId:", userId, "| isTeacher:", isTeacher);

      setFacilities(facilitiesData || []);

      // Deduplicate classes by id, prioritising entries where teacherId matches the current user
      const uniqueClasses: any[] = [];
      const seenClassIds = new Set<number>();
      if (isTeacher && userId) {
        // First pass: add entries where teacherId matches current user
        (classesData as any[]).forEach((c: any) => {
          if (Number(c.teacherId) === Number(userId) && !seenClassIds.has(c.id)) {
            uniqueClasses.push(c);
            seenClassIds.add(c.id);
          }
        });
        // Second pass: add remaining classes not yet added
        (classesData as any[]).forEach((c: any) => {
          if (!seenClassIds.has(c.id)) {
            uniqueClasses.push(c);
            seenClassIds.add(c.id);
          }
        });
      } else {
        (classesData as any[]).forEach((c: any) => {
          if (!seenClassIds.has(c.id)) {
            uniqueClasses.push(c);
            seenClassIds.add(c.id);
          }
        });
      }
      console.log("📋 [loadData] uniqueClasses to set:", uniqueClasses.length, uniqueClasses.map((c: any) => ({ id: c.id, name: c.name })));      
      setClasses(uniqueClasses);

      // Build class maps
      const map: Record<number, string> = {};
      const orgMap: Record<number, number | null> = {};
      uniqueClasses.forEach((c: any) => {
        map[c.id] = c.name;
        orgMap[c.id] = c.organizationId || c.organization_id || null;
      });
      setClassesMap(map);
      setClassOrgMap(orgMap);

      // Build questions query params based on role
      let questionsQuery: any = {};

      if (!isAdmin) {
        let allowedClassIds: number[] = [];

        if (isTeacher && userId) {
          // TEACHER: get classes they teach (from class_teacher table)
          allowedClassIds = (classesData as any[])
            .filter((c: any) => Number(c.teacherId) === Number(userId))
            .map((c: any) => c.id);

          // Fallback: if not assigned to any class via class_teacher, use org-based classes
          if (allowedClassIds.length === 0 && userOrgId) {
            allowedClassIds = (classesData as any[])
              .filter(
                (c: any) =>
                  Number(c.organizationId || c.organization_id) ===
                  Number(userOrgId),
              )
              .map((c: any) => c.id);
          }
          // Deduplicate
          allowedClassIds = [...new Set(allowedClassIds)];
        } else if (isFacilityManager && userOrgId) {
          // FACILITY_MANAGER: get classes in their org hierarchy
          const userOrg = facilitiesData.find((f: any) => f.id === userOrgId);
          if (userOrg) {
            let allowedSchoolIds: number[] = [];

            if (userOrg.type === "PROVINCE") {
              const childDeptIds = facilitiesData
                .filter(
                  (f: any) =>
                    f.type === "DEPARTMENT" && f.parentId === userOrgId,
                )
                .map((f: any) => f.id);
              allowedSchoolIds = facilitiesData
                .filter(
                  (f: any) =>
                    f.type === "SCHOOL" &&
                    f.parentId !== null &&
                    childDeptIds.includes(f.parentId),
                )
                .map((f: any) => f.id);
            } else if (userOrg.type === "DEPARTMENT") {
              allowedSchoolIds = facilitiesData
                .filter(
                  (f: any) => f.type === "SCHOOL" && f.parentId === userOrgId,
                )
                .map((f: any) => f.id);
            } else if (userOrg.type === "SCHOOL") {
              allowedSchoolIds = [userOrgId];
            }

            allowedClassIds = classesData
              .filter((c: any) =>
                allowedSchoolIds.includes(
                  c.organizationId || c.organization_id,
                ),
              )
              .map((c: any) => c.id);
          }
        }

        if (allowedClassIds.length > 0) {
          questionsQuery.class_room_ids = allowedClassIds.join(",");
        } else {
          // No allowed classes, set empty result
          setQuestions([]);
          setIsLoading(false);
          return;
        }
      }

      // Fetch questions with query params
      const questionsData = await fetchAllQuestions(questionsQuery);
      setQuestions(questionsData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isFacilityManager, isTeacher, userId, userOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Role-based filtering logic
  // NOTE: Dữ liệu đã được lọc server-side dựa trên query params (class_room_ids)
  // Hàm này giữ lại để backward compatibility
  const getQuestionsByRole = useCallback((): any[] => {
    // Dữ liệu đã được lọc từ server, trả về trực tiếp
    return questions;
  }, [questions]);

  const roleFilteredQuestions = useMemo(
    () => getQuestionsByRole(),
    [getQuestionsByRole],
  );

  // Helper để tạo mô tả theo role
  const getRoleDescription = (): string => {
    if (isAdmin) {
      return `Quản lý tất cả câu hỏi trong hệ thống (${roleFilteredQuestions.length} câu)`;
    }
    if (isFacilityManager) {
      const userOrg = facilities.find((f) => f.id === userOrgId);
      if (userOrg) {
        return `Quản lý câu hỏi trong phạm vi ${userOrg.name} (${roleFilteredQuestions.length} câu)`;
      }
    }
    if (isTeacher) {
      return `Các câu hỏi trong lớp bạn phụ trách (${roleFilteredQuestions.length} câu)`;
    }
    return `Quản lý câu hỏi (${roleFilteredQuestions.length} câu)`;
  };

  // Filtering with search and class filter
  const filteredQuestions = useMemo(() => {
    return roleFilteredQuestions.filter((q) => {
      const normalizedQuery = removeVietnameseTones(searchQuery);
      const matchesSearch = removeVietnameseTones(q.content || "").includes(
        normalizedQuery,
      );
      const matchesClass =
        filterClass === "all" || String(q.classId) === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [roleFilteredQuestions, searchQuery, filterClass]);

  const {
    currentPage,
    totalPages,
    paginatedItems,
    paddedItems,
    setCurrentPage,
  } = usePagination(filteredQuestions, QUESTIONS_PER_PAGE);

  const handleView = (item: any) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      try {
        await deleteQuestion(selectedItem.id);
        setQuestions((prev) => prev.filter((q) => q.id !== selectedItem.id));
        setIsDeleteModalOpen(false);
        setSelectedItem(null);
      } catch (error) {
        console.error("Delete failed", error);
        alert("Xóa thất bại");
      }
    }
  };

  const getClassName = (classId: number) =>
    classesMap[classId] || "Không xác định";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary-600" />
            Quản lý câu hỏi
          </h1>
          <p className="text-gray-600 mt-1">{getRoleDescription()}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={20} />
          Tạo câu hỏi mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all h-[42px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-[42px] w-[42px] flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
              <Filter size={20} />
            </div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-[42px] px-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tất cả lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[35%]">
                      Nội dung câu hỏi
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                      Loại câu hỏi
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                      Lớp học
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                      Đính kèm
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[20%]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.map((q) => (
                    <tr
                      key={q.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleView(q)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-sm overflow-hidden border border-gray-100">
                            <FileQuestion size={20} />
                          </div>
                          <p
                            className="font-medium text-gray-900 truncate"
                            title={q.content}
                          >
                            {q.content}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            q.questionType === "PRACTICE"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-green-50 text-green-700 border border-green-100"
                          }`}
                        >
                          {q.questionType === "PRACTICE"
                            ? "Thực hành"
                            : "Trắc nghiệm"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-gray-400" />
                          <span className="truncate">
                            {getClassName(q.classId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {q.image && (
                            <span
                              className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"
                              title="Hình ảnh"
                            >
                              <ImageIcon size={16} />
                            </span>
                          )}
                          {q.video && (
                            <span
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg"
                              title="Video"
                            >
                              <Video size={16} />
                            </span>
                          )}
                          {!q.image && !q.video && (
                            <span className="text-gray-400 text-xs italic">
                              Không có
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleView(q)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditClick(q)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(q)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredQuestions.length === 0 && (
              <div className="p-12 text-center border-t border-gray-100">
                <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Không tìm thấy câu hỏi
                </h3>
                <p className="text-gray-500">Thử tìm kiếm với nội dung khác</p>
              </div>
            )}

            {filteredQuestions.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={QUESTIONS_PER_PAGE}
                totalItems={filteredQuestions.length}
                filteredItems={filteredQuestions.length}
                itemName="câu hỏi"
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo câu hỏi mới"
      >
        <CreateQuestionForm
          onClose={() => setIsCreateModalOpen(false)}
          classes={classes}
          refresh={loadData}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedItem(null);
        }}
        title="Chi tiết câu hỏi"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Nội dung câu hỏi</label>
              <p className="font-medium text-gray-900 mt-1">
                {selectedItem.content}
              </p>
            </div>
            {selectedItem.explanation && (
              <div>
                <label className="text-sm text-gray-500">
                  Giải thích / Đáp án
                </label>
                <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg text-sm">
                  {selectedItem.explanation}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">Lớp học</label>
              <p className="font-medium text-gray-900 mt-1">
                {getClassName(selectedItem.classId)}
              </p>
            </div>
            {selectedItem.image && (
              <div>
                <label className="text-sm text-gray-500">
                  Hình ảnh minh họa
                </label>
                <img
                  src={selectedItem.image}
                  alt="Minh họa"
                  className="mt-2 max-h-48 rounded-lg border border-gray-200"
                />
              </div>
            )}
            {selectedItem.video && (
              <div>
                <label className="text-sm text-gray-500">Video minh họa</label>
                <video
                  controls
                  className="mt-2 w-full max-h-48 rounded-lg border border-gray-200"
                >
                  <source src={selectedItem.video} />
                </video>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
              >
                <Edit size={18} />
                Chỉnh sửa
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Chỉnh sửa câu hỏi"
      >
        {selectedItem && (
          <EditQuestionForm
            onClose={() => setIsEditModalOpen(false)}
            classes={classes}
            refresh={loadData}
            initialData={selectedItem}
          />
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa câu hỏi"
        message="Bạn có chắc chắn muốn xóa câu hỏi này không?"
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}

function CreateQuestionForm({
  onClose,
  classes,
  refresh,
}: {
  onClose: () => void;
  classes: any[];
  refresh: () => void;
}) {
  // Get current user from Redux to pass creatorId
  const { user } = useSelector((state: RootState) => state.admin);
  const userId = user?.id || (user as any)?.user_id;

  const [formData, setFormData] = useState({
    content: "",
    explanation: "",
    classId: "",
    questionType: "ONE_ANSWER",
    fileType: "NOT_EXISTED",
  });
  const [answers, setAnswers] = useState<any[]>([
    { content: "", correct: true, fileType: "TEXT", file: null },
    { content: "", correct: false, fileType: "TEXT", file: null },
  ]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAnswer = () => {
    setAnswers([
      ...answers,
      { content: "", correct: false, fileType: "TEXT", file: null },
    ]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const updateAnswer = (index: number, field: string, value: any) => {
    const newAnswers = [...answers];
    if (field === "correct" && formData.questionType === "ONE_ANSWER") {
      newAnswers.forEach((ans, i) => (ans.correct = i === index));
    } else {
      newAnswers[index][field] = value;
    }
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageLocation = "";
      let videoLocation = "";

      if (imageFile) {
        imageLocation = await uploadFile(imageFile, "question");
      }
      if (videoFile) {
        videoLocation = await uploadFile(videoFile, "question");
      }

      // Process answers
      const processedAnswers = await Promise.all(
        answers.map(async (ans) => {
          let loc = "";
          if (ans.file instanceof File) {
            loc = await uploadFile(ans.file, "question");
          }
          return {
            content: ans.content,
            correct: ans.correct,
            fileType: ans.fileType,
            imageLocation: ans.fileType === "NOT_EXISTED" && loc ? loc : "",
            videoLocation:
              ans.fileType === "NOT_EXISTED" &&
              loc &&
              !loc.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
                ? loc
                : "",
          };
        }),
      );

      const selectedClass = classes.find(
        (c) => String(c.id) === String(formData.classId),
      );
      const organizationId = selectedClass?.organizationId || null;

      console.log("Submitting question form data:", formData);

      if (!formData.content?.trim()) {
        alert("Nội dung câu hỏi là bắt buộc!");
        setIsSubmitting(false);
        return;
      }

      await createQuestion({
        content: formData.content,
        explanation: formData.explanation,
        classroomId: Number(formData.classId) || null,
        organizationId,
        creatorId: userId, // Add creatorId
        imageLocation,
        videoLocation,
        questionType: formData.questionType,
        fileType: formData.fileType,
        answerReqs: processedAnswers,
      });

      refresh();
      onClose();
    } catch (error: any) {
      console.error("Create error", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Tạo câu hỏi thất bại";
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Kiểu câu hỏi <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.questionType}
            onChange={(e) =>
              setFormData({ ...formData, questionType: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="ONE_ANSWER">Một đáp án</option>
            <option value="MULTIPLE_ANSWERS">Nhiều đáp án</option>
            <option value="PRACTICE">Thực hành</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Lớp học <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.classId}
            onChange={(e) =>
              setFormData({ ...formData, classId: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Chọn lớp học</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Nội dung câu hỏi <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Lựa chọn câu hỏi (Media)
        </label>
        <select
          value={formData.fileType}
          onChange={(e) =>
            setFormData({ ...formData, fileType: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="TEXT">Không đính kèm file</option>
          <option value="NOT_EXISTED">Tải lên mới</option>
          <option value="EXISTED">Chọn từ dữ liệu có sẵn</option>
        </select>
      </div>

      {formData.fileType === "NOT_EXISTED" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Hình ảnh
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Video</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>
      )}

      {formData.questionType !== "PRACTICE" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Danh sách đáp án
            </label>
            <button
              type="button"
              onClick={addAnswer}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus size={14} /> Thêm đáp án
            </button>
          </div>
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div
                key={index}
                className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type={
                      formData.questionType === "ONE_ANSWER"
                        ? "radio"
                        : "checkbox"
                    }
                    checked={answer.correct}
                    onChange={(e) =>
                      updateAnswer(index, "correct", e.target.checked)
                    }
                    name="correct-answer"
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={answer.content}
                    onChange={(e) =>
                      updateAnswer(index, "content", e.target.value)
                    }
                    placeholder={`Đáp án ${index + 1}`}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeAnswer(index)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 pl-7 text-[10px]">
                  <select
                    value={answer.fileType}
                    onChange={(e) =>
                      updateAnswer(index, "fileType", e.target.value)
                    }
                    className="bg-transparent border-none outline-none text-gray-500 cursor-pointer"
                  >
                    <option value="TEXT">Chỉ chữ</option>
                    <option value="NOT_EXISTED">Tải media</option>
                  </select>
                  {answer.fileType === "NOT_EXISTED" && (
                    <input
                      type="file"
                      onChange={(e) =>
                        updateAnswer(index, "file", e.target.files?.[0])
                      }
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Giải thích
        </label>
        <textarea
          value={formData.explanation}
          onChange={(e) =>
            setFormData({ ...formData, explanation: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px]"
          placeholder="Nhập giải thích cho đáp án đúng..."
        />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          {isSubmitting ? "Đang xử lý..." : "Tạo câu hỏi"}
        </button>
      </div>
    </form>
  );
}
function EditQuestionForm({
  onClose,
  classes,
  refresh,
  initialData,
}: {
  onClose: () => void;
  classes: any[];
  refresh: () => void;
  initialData: any;
}) {
  const [formData, setFormData] = useState({
    content: initialData.content || "",
    explanation: initialData.explanation || "",
    classId: String(initialData.classId || ""),
    questionType: initialData.questionType || "ONE_ANSWER",
    fileType: initialData.fileType || "TEXT",
  });
  const [answers, setAnswers] = useState<any[]>(
    initialData.answers?.length
      ? initialData.answers.map((a: any) => ({
          ...a,
          fileType: a.fileType || "TEXT",
          file: null,
        }))
      : [
          { content: "", correct: true, fileType: "TEXT", file: null },
          { content: "", correct: false, fileType: "TEXT", file: null },
        ],
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAnswer = () => {
    setAnswers([
      ...answers,
      { content: "", correct: false, fileType: "TEXT", file: null },
    ]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const updateAnswer = (index: number, field: string, value: any) => {
    const newAnswers = [...answers];
    if (field === "correct" && formData.questionType === "ONE_ANSWER") {
      newAnswers.forEach((ans, i) => (ans.correct = i === index));
    } else {
      newAnswers[index][field] = value;
    }
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageLocation = initialData.image;
      let videoLocation = initialData.video;

      if (imageFile) {
        imageLocation = await uploadFile(imageFile, "question");
      }
      if (videoFile) {
        videoLocation = await uploadFile(videoFile, "question");
      }

      // Process answers
      const processedAnswers = await Promise.all(
        answers.map(async (ans) => {
          let loc = ans.imageLocation || ans.videoLocation || "";
          if (ans.file instanceof File) {
            loc = await uploadFile(ans.file, "question");
          }
          return {
            id: ans.id,
            content: ans.content,
            correct: ans.correct,
            fileType: ans.fileType,
            imageLocation:
              ans.fileType === "NOT_EXISTED" || ans.imageLocation ? loc : "",
            videoLocation:
              ans.fileType === "NOT_EXISTED" || ans.videoLocation ? loc : "",
          };
        }),
      );

      const { updateQuestion } = await import("@/services/questionService");
      const selectedClass = classes.find(
        (c) => String(c.id) === String(formData.classId),
      );
      const organizationId = selectedClass?.organizationId || null;

      await updateQuestion(initialData.id, {
        content: formData.content,
        explanation: formData.explanation,
        classId: Number(formData.classId),
        organizationId,
        imageLocation,
        videoLocation,
        questionType: formData.questionType,
        answerReqs: processedAnswers,
      });

      refresh();
      onClose();
    } catch (error) {
      console.error("Update error", error);
      alert("Cập nhật câu hỏi thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Kiểu câu hỏi <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.questionType}
            onChange={(e) =>
              setFormData({ ...formData, questionType: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="ONE_ANSWER">Một đáp án</option>
            <option value="MULTIPLE_ANSWERS">Nhiều đáp án</option>
            <option value="PRACTICE">Thực hành</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Lớp học <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.classId}
            onChange={(e) =>
              setFormData({ ...formData, classId: e.target.value })
            }
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Chọn lớp học</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Nội dung câu hỏi <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Hình ảnh mô tả
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Video mô tả
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
      </div>

      {formData.questionType !== "PRACTICE" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Danh sách đáp án
            </label>
            <button
              type="button"
              onClick={addAnswer}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus size={14} /> Thêm đáp án
            </button>
          </div>
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div
                key={index}
                className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type={
                      formData.questionType === "ONE_ANSWER"
                        ? "radio"
                        : "checkbox"
                    }
                    checked={answer.correct}
                    onChange={(e) =>
                      updateAnswer(index, "correct", e.target.checked)
                    }
                    name="correct-answer"
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={answer.content}
                    onChange={(e) =>
                      updateAnswer(index, "content", e.target.value)
                    }
                    placeholder={`Đáp án ${index + 1}`}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeAnswer(index)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 pl-7 text-[10px]">
                  <select
                    value={answer.fileType}
                    onChange={(e) =>
                      updateAnswer(index, "fileType", e.target.value)
                    }
                    className="bg-transparent border-none outline-none text-gray-500 cursor-pointer"
                  >
                    <option value="TEXT">Chỉ chữ</option>
                    <option value="NOT_EXISTED">Tải media</option>
                  </select>
                  {answer.fileType === "NOT_EXISTED" && (
                    <input
                      type="file"
                      onChange={(e) =>
                        updateAnswer(index, "file", e.target.files?.[0])
                      }
                      className="flex-1"
                    />
                  )}
                  {(answer.imageLocation || answer.videoLocation) && (
                    <span className="text-primary-600 italic">Đã có media</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Giải thích
        </label>
        <textarea
          value={formData.explanation}
          onChange={(e) =>
            setFormData({ ...formData, explanation: e.target.value })
          }
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px]"
          placeholder="Nhập giải thích cho đáp án đúng..."
        />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
