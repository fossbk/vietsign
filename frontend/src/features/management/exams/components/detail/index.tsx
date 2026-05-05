"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Plus,
  Layers,
  FileText,
  Users,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExamItem, examStatusConfig } from "@/data/examsData";
import { fetchExamById, updateExam, deleteExam } from "@/services/examService";
import { fetchAllClasses } from "@/services/classService";
import {
  fetchTopicsByClassroom,
  fetchVocabulariesByTopic,
  TopicItem,
} from "@/services/topicService";

import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { ModalChooseQuestions } from "../ModalChooseQuestions";
import { QuestionItem } from "@/data/questionsData";

export function ExamManagementDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = Number(params.id);
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [isEditing, setIsEditing] = useState(
    searchParams.get("edit") === "true",
  );
  const [editForm, setEditForm] = useState<Partial<ExamItem>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChooseModalOpen, setIsChooseModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classesMap, setClassesMap] = useState<Record<number, string>>({});
  const [classesList, setClassesList] = useState<any[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [vocabMap, setVocMap] = useState<Record<number, any[]>>({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [fetchedExam, classesData] = await Promise.all([
          fetchExamById(id),
          fetchAllClasses(),
        ]);

        if (fetchedExam) {
          // Data is already normalized by the service
          const mappedExam: ExamItem = {
            ...fetchedExam,
            date: new Date(
              fetchedExam.createdAt || new Date(),
            ).toLocaleDateString("vi-VN"),
            time: new Date(
              fetchedExam.createdAt || new Date(),
            ).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            students: fetchedExam.students || 0,
          };
          setExam(mappedExam);
          setEditForm({ ...mappedExam });
        }

        setClassesList(classesData);
        const map: Record<number, string> = {};
        classesData.forEach((c) => {
          map[c.id] = c.name;
        });
        setClassesMap(map);
      } catch (error) {
        console.error("Failed to load exam or classes", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (exam?.title) {
      document.title = `${exam.title} - Quản lý bài thi - VietSignSchool`;
    }
  }, [exam]);

  useEffect(() => {
    if (isEditing && (editForm.classId || exam?.classId)) {
      loadTopics(Number(editForm.classId || exam?.classId));
    }
  }, [isEditing, editForm.classId, exam?.classId]);

  const loadTopics = async (cid: number) => {
    const data = await fetchTopicsByClassroom(cid);
    setTopics(data);

    // Also load vocabularies for existing practice questions
    if (editForm.practiceQuestions) {
      editForm.practiceQuestions.forEach((pq) => {
        if (pq.topicId) loadVocabs(Number(pq.topicId));
      });
    }
  };

  const loadVocabs = async (tid: number) => {
    if (vocabMap[tid]) return;
    const data = await fetchVocabulariesByTopic(tid);
    setVocMap((prev) => ({ ...prev, [tid]: data }));
  };

  const getClassName = (classId: number): string => {
    return classesMap[classId] || "Không xác định";
  };

  const handleSave = async () => {
    if (exam && editForm) {
      if (!editForm.title?.trim()) {
        alert("Tên bài kiểm tra là bắt buộc!");
        return;
      }

      if (
        (editForm.examType === "PRACTICE" ||
          editForm.examType === "PRACTICAL") &&
        (editForm.practiceQuestions || []).some((pq) => !pq.content?.trim())
      ) {
        alert("Vui lòng nhập nội dung cho tất cả các câu hỏi thực hành!");
        return;
      }

      try {
        // Optimistic update
        const updatedItem = { ...exam, ...editForm } as ExamItem;
        setExam(updatedItem);
        setIsEditing(false);

        // Map backend Functional Type
        let backendType = "MULTIPLE_CHOICE";
        if (
          editForm.examType === "PRACTICE" ||
          editForm.examType === "PRACTICAL" ||
          editForm.type === "Thực hành"
        ) {
          backendType = "PRACTICAL";
        }

        const cleanedPracticeQuestions = (editForm.practiceQuestions || []).map(
          (pq) => ({
            content: pq.content,
            topicId: pq.topicId ? Number(pq.topicId) : null,
            vocabularyId: pq.vocabularyId ? Number(pq.vocabularyId) : null,
          }),
        );

        // Map back to backend fields
        await updateExam(exam.id, {
          name: editForm.title,
          description: editForm.description,
          exam_type: backendType,
          class_room_id: editForm.classId,
          duration_minutes: parseInt(editForm.duration || "60"),
          total_points: editForm.questions,
          passing_score: editForm.passingScore,
          is_active: editForm.status === "ongoing",
          practice_questions: cleanedPracticeQuestions,
          question_ids: editForm.questionIds,
        });
      } catch (error) {
        console.error("Failed to update exam", error);
      }
    }
  };

  const handleDelete = async () => {
    if (exam) {
      try {
        await deleteExam(exam.id);
        router.push("/exams-management");
      } catch (error) {
        console.error("Failed to delete exam", error);
      }
    }
  };

  const handleQuestionsSelected = (questions: QuestionItem[]) => {
    setEditForm({
      ...editForm,
      questionIds: questions.map((q) => q.id),
      questionsList: questions,
      questions: questions.length, // Update score/question count display
    });
  };

  const removeQuestion = (id: number) => {
    const newList = (editForm.questionsList || []).filter((q) => q.id !== id);
    setEditForm({
      ...editForm,
      questionIds: newList.map((q) => q.id),
      questionsList: newList,
      questions: newList.length,
    });
  };

  if (!exam) {
    if (isLoading)
      return (
        <div className="flex justify-center py-20 text-gray-500">
          Đang tải...
        </div>
      );
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Không tìm thấy bài kiểm tra
        </h2>
        <button
          onClick={() => router.push("/exams-management")}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const statusInfo =
    examStatusConfig[exam.status] || examStatusConfig["ongoing"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => router.push("/exams-management")}
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
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <FileText size={32} className="text-white" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">{exam.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                    {statusInfo.label}
                  </span>
                  {exam.type && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                      {exam.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-white text-center">
              <div>
                <p className="text-3xl font-bold">{exam.questions}</p>
                <p className="text-xs text-white/80">Điểm</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{exam.students}</p>
                <p className="text-xs text-white/80">Học sinh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Tên bài kiểm tra
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg font-medium"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 text-lg font-bold">
                  {exam.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Lớp học
              </label>
              {isEditing ? (
                <select
                  value={editForm.classId || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      classId: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-gray-400" />
                  {getClassName(exam.classId)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Loại bài thi
              </label>
              {isEditing ? (
                <select
                  value={editForm.type || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditForm({
                      ...editForm,
                      type: val,
                      examType:
                        val === "Thực hành" ? "PRACTICAL" : "MULTIPLE_CHOICE",
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="Định kỳ">Định kỳ</option>
                  <option value="Giữa kỳ">Giữa kỳ</option>
                  <option value="Cuối kỳ">Cuối kỳ</option>
                  <option value="Thực hành">Thực hành</option>
                  <option value="Đầu vào">Đầu vào</option>
                  <option value="Online">Online</option>
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-700">
                    {exam.type}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Ngày thi
              </label>
              <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                {exam.date}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Giờ thi
              </label>
              <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-gray-400" />
                {exam.time}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Thời lượng
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.duration || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, duration: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">
                  {exam.duration}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Tổng điểm
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={editForm.questions || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      questions: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <FileText size={18} className="text-gray-400" />
                  {exam.questions}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Điểm đạt tối thiểu
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={editForm.passingScore || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      passingScore: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-gray-400" />
                  {exam.passingScore}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Số học sinh
              </label>
              <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                {exam.students} học sinh
              </p>
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
                      status: e.target.value as ExamItem["status"],
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="ongoing">Đang diễn ra</option>
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

            {(exam.description || isEditing) && (
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
                  <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 line-clamp-3">
                    {exam.description || "Không có mô tả"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Exam Content Section (Questions / Practice) */}
        <div className="px-8 pb-8 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-primary-600" />
              Nội dung bài thi{" "}
              {exam.examType === "PRACTICE" || exam.examType === "PRACTICAL"
                ? "(Thực hành)"
                : "(Trắc nghiệm)"}
            </h3>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (
                    exam.examType === "PRACTICE" ||
                    exam.examType === "PRACTICAL" ||
                    editForm.examType === "PRACTICE" ||
                    editForm.examType === "PRACTICAL"
                  ) {
                    const current = editForm.practiceQuestions || [];
                    setEditForm({
                      ...editForm,
                      practiceQuestions: [
                        ...current,
                        { content: "", topicId: "", vocabularyId: "" },
                      ],
                    });
                  } else {
                    setIsChooseModalOpen(true);
                  }
                }}
                className="text-sm text-primary-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus size={16} />{" "}
                {exam.examType === "PRACTICE" ||
                exam.examType === "PRACTICAL" ||
                editForm.examType === "PRACTICE" ||
                editForm.examType === "PRACTICAL"
                  ? "Thêm câu hỏi"
                  : "Thay đổi câu hỏi"}
              </button>
            )}
          </div>

          {exam.examType === "PRACTICE" ||
          exam.examType === "PRACTICAL" ||
          editForm.examType === "PRACTICE" ||
          editForm.examType === "PRACTICAL" ? (
            <div className="space-y-4">
              {(isEditing
                ? editForm.practiceQuestions || []
                : exam.practiceQuestions || []
              ).map((q: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${isEditing ? "bg-gray-50/50 border-gray-100 relative group" : "bg-white border-gray-100 shadow-sm"}`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      {/* Read-only context: topic / vocabulary */}
                      {(q.topic_name || q.vocabulary_content) && (
                        <p className="text-xs text-gray-400 px-1">
                          Chủ đề: <span className="font-medium text-gray-600">{q.topic_name || "—"}</span>
                          {q.vocabulary_content && (
                            <> • Từ vựng: <span className="font-medium text-gray-600">{q.vocabulary_content}</span></>
                          )}
                        </p>
                      )}
                      <input
                        placeholder="Nhập nội dung câu hỏi thực hành..."
                        value={q.content || q.contentFromExamVocabulary || ""}
                        onChange={(e) => {
                          const list = [...(editForm.practiceQuestions || [])];
                          list[idx] = { ...list[idx], content: e.target.value };
                          setEditForm({ ...editForm, practiceQuestions: list });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>

                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">
                          Câu {idx + 1}: {q.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          Chủ đề: {q.topic_name || "Mặc định"} • Từ vựng:{" "}
                          {q.vocabulary_content || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                  {isEditing &&
                    (editForm.practiceQuestions?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const list = (
                            editForm.practiceQuestions || []
                          ).filter((_: any, i: number) => i !== idx);
                          setEditForm({ ...editForm, practiceQuestions: list });
                        }}
                        className="absolute -right-2 -top-2 w-7 h-7 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                </div>
              ))}
              {isEditing && (editForm.practiceQuestions?.length || 0) === 0 && (
                <div className="py-8 text-center text-gray-400 italic">
                  Chưa có câu hỏi thực hành
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isEditing
                ? editForm.questionsList || []
                : exam.questionsList || []
              ).map((q: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-3 relative group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {q.content}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {q.question_type || "Trắc nghiệm"}
                    </p>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="absolute -right-2 -top-2 w-7 h-7 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {((isEditing
                ? editForm.questionsList?.length
                : exam.questionsList?.length) || 0) === 0 && (
                <div className="md:col-span-2 py-8 text-center text-gray-400 italic">
                  Danh sách câu hỏi đang được cập nhật
                </div>
              )}
            </div>
          )}
        </div>

        <ModalChooseQuestions
          isOpen={isChooseModalOpen}
          onClose={() => setIsChooseModalOpen(false)}
          onConfirm={handleQuestionsSelected}
          classId={editForm.classId || exam.classId}
          initialSelectedIds={editForm.questionIds || exam.questionIds}
        />

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({ ...exam });
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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa bài kiểm tra "${exam.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
