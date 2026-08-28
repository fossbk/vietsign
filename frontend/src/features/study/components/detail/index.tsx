"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Video,
  FileText,
  Play,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Download,
  Users,
  ClipboardCheck,
  FolderOpen,
  File,
  Link as LinkIcon,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ClassItem, statusConfig } from "@/data/classesData";
import {
  fetchClassById,
  fetchClassroomStudents,
  addStudentToClassroom,
  removeStudentFromClassroom,
  ClassMember,
} from "@/services/classService";
import { fetchUserById, fetchUsersByRole } from "@/services/userService";
import {
  fetchLessonsByClassroom,
  Lesson,
  deleteLesson,
} from "@/services/lessonService";
import {
  fetchExamsByClassroom,
  ExamItem,
  deleteExam,
} from "@/services/examService";
import {
  fetchAllOrganizations,
  type OrganizationItem,
} from "@/services/organizationService";
import Link from "next/link";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { toast } from "react-hot-toast";
import { Modal } from "@/shared/components/common/Modal";
import { LessonModal } from "./LessonModal";
import { ExamModal } from "./ExamModal";
import { fetchTopicsByClassroom, TopicItem } from "@/services/topicService";
import { fetchLessonStatistics } from "@/services/lessonService";

type TabType = "lessons" | "topics" | "exams" | "members";
type DeleteType = "lesson" | "exam" | "member" | null;

export function StudyDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [teacherName, setTeacherName] = useState<string>("Đang tải...");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("lessons");

  // Permission state
  const [isTeacher, setIsTeacher] = useState(false);

  // Data states
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [lessonStats, setLessonStats] = useState<any>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Lesson/Exam Modal States
  const [lessonModal, setLessonModal] = useState<{
    isOpen: boolean;
    data: Lesson | null;
  }>({
    isOpen: false,
    data: null,
  });
  const [examModal, setExamModal] = useState<{
    isOpen: boolean;
    data: ExamItem | null;
  }>({
    isOpen: false,
    data: null,
  });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: DeleteType;
    itemId: number | null;
    itemName: string;
  }>({
    isOpen: false,
    type: null,
    itemId: null,
    itemName: "",
  });

  const loadData = async () => {
    // ... existing loadData logic ...
    setIsLoading(true);
    try {
      // 1. Fetch Class
      const fetchedClass = await fetchClassById(id);
      if (fetchedClass) {
        setClassItem(fetchedClass);

        // Role check
        if (typeof window !== "undefined") {
          const userStr = localStorage.getItem("user");
          const user = userStr ? JSON.parse(userStr) : null;
          const role = user?.role || user?.code;
          const teacherRoles = [
            "TEACHER",
            "ADMIN",
            "SUPER_ADMIN",
            "CENTER_ADMIN",
            "SCHOOL_ADMIN",
          ];
          setIsTeacher(teacherRoles.includes(role));
        }

        if (fetchedClass.teacherId) {
          try {
            const t = await fetchUserById(fetchedClass.teacherId);
            setTeacher(t);
            setTeacherName(t?.name || "Không xác định");
          } catch (e) {
            console.error("Failed to fetch teacher", e);
            setTeacherName("Lỗi tải thông tin GV");
          }
        }

        const [lessonsData, topicsData, examsData, membersData, orgsData] =
          await Promise.all([
            fetchLessonsByClassroom(id),
            fetchTopicsByClassroom(id),
            fetchExamsByClassroom(id),
            fetchClassroomStudents(id),
            fetchAllOrganizations(),
          ]);

        setLessons(lessonsData);
        setTopics(topicsData);
        setExams(examsData);
        setClassMembers(membersData);
        setOrganizations(orgsData);

        try {
          const stats = await fetchLessonStatistics(id);
          setLessonStats(stats);
        } catch (e) {
          console.error("Failed to fetch lesson stats", e);
        }
      } else {
        setClassItem(null);
      }
    } catch (error) {
      console.error("Failed to load class data", error);
      toast.error("Lỗi tải dữ liệu lớp học");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (isAddMemberOpen && allStudents.length === 0) {
      fetchUsersByRole("STUDENT").then(setAllStudents).catch(console.error);
    }
  }, [isAddMemberOpen]);

  const handleAdd = (type: TabType) => {
    switch (type) {
      case "lessons":
        setLessonModal({ isOpen: true, data: null });
        break;
      case "exams":
        setExamModal({ isOpen: true, data: null });
        break;
      case "members":
        setIsAddMemberOpen(true);
        break;
    }
  };

  const handleEdit = (type: TabType, itemId: number) => {
    switch (type) {
      case "lessons":
        const lesson = lessons.find((l) => l.id === itemId);
        if (lesson) setLessonModal({ isOpen: true, data: lesson });
        break;
      case "exams":
        const exam = exams.find((e) => e.id === itemId);
        if (exam) setExamModal({ isOpen: true, data: exam });
        break;
    }
  };

  const handleDeleteClick = (
    type: DeleteType,
    itemId: number,
    itemName: string,
  ) => {
    setDeleteModal({
      isOpen: true,
      type,
      itemId,
      itemName,
    });
  };

  const handleConfirmDelete = async () => {
    const { type, itemId } = deleteModal;
    if (!type || !itemId || !classItem) return;

    try {
      switch (type) {
        case "lesson":
          await deleteLesson(itemId);
          setLessons((prev) => prev.filter((i) => i.id !== itemId));
          toast.success("Đã xóa bài học");
          break;
        case "exam":
          await deleteExam(itemId);
          setExams((prev) => prev.filter((i) => i.id !== itemId));
          toast.success("Đã xóa bài kiểm tra");
          break;
        case "member":
          await removeStudentFromClassroom(classItem.id, itemId);
          setClassMembers((prev) => prev.filter((m) => m.userId !== itemId)); // Assuming itemId passed is userId
          toast.success("Đã xóa thành viên khỏi lớp");
          break;
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Xóa thất bại");
    } finally {
      setDeleteModal({ isOpen: false, type: null, itemId: null, itemName: "" });
    }
  };

  const handleAddMember = async (studentId: number) => {
    if (!classItem) return;
    setIsAddingMember(true);
    try {
      await addStudentToClassroom(classItem.id, studentId);
      toast.success("Đã thêm học sinh vào lớp");

      // Reload members
      const membersData = await fetchClassroomStudents(classItem.id);
      setClassMembers(membersData);
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || "Thêm học sinh thất bại";
      toast.error(msg);
    } finally {
      setIsAddingMember(false);
    }
  };

  const filteredStudentsToAdd = allStudents.filter(
    (student) =>
      !classMembers.some((m) => m.userId === student.id) &&
      (student.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())),
  );

  const getFacilityName = (organizationId: number | null): string => {
    if (organizationId === null) return "Online";
    const facility = organizations.find((f) => f.id === organizationId);
    return facility?.name || "Không xác định";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-gray-500">Đang tải...</div>
    );
  }

  if (!classItem) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Không tìm thấy lớp học
        </h2>
        <button
          onClick={() => router.push("/study")}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const statusInfo = statusConfig[classItem.status] || {
    label: classItem.status || "Không xác định",
    color: "bg-gray-100 text-gray-800",
  };
  const completedLessons = lessons.filter((l: any) => l.completed).length; // Type assertion if needed

  const tabs = [
    {
      id: "lessons" as TabType,
      label: "Bài học",
      icon: BookOpen,
      count: lessons.length,
    },
    {
      id: "topics" as TabType,
      label: "Học theo chủ đề",
      icon: FolderOpen,
      count: topics.length,
    },
    {
      id: "exams" as TabType,
      label: "Kiểm tra",
      icon: ClipboardCheck,
      count: exams.length,
    },
    {
      id: "members" as TabType,
      label: "Thành viên",
      icon: Users,
      count: classMembers.length + (teacher ? 1 : 0),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Navigation */}
      <div className="flex items-center">
        <button
          onClick={() => router.push("/study")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span>Quay lại khóa học</span>
        </button>
        <div className="ml-auto">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Class Header Information */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32 opacity-10 blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm border border-white/10">
                  {/* Level hardcoded as logic not clear from ClassItem */}
                  Cơ bản
                </span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm border border-white/10">
                  {classItem.classLevel}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-3 leading-tight">
                {classItem.name}
              </h1>
              <p className="text-primary-100 text-lg mb-6 max-w-2xl">
                {classItem.description ||
                  "Khóa học ngôn ngữ ký hiệu chuyên sâu"}
              </p>

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary-200" />
                  <span>GV: {teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary-200" />
                  <span>{getFacilityName(classItem.organizationId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary-200" />
                  <span>
                    {classItem.startDate} - {classItem.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary-200" />
                  <span>{classItem.schedule}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto justify-between items-center pr-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          {isTeacher && activeTab !== "topics" && (
            <button
              onClick={() => handleAdd(activeTab)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              <Plus size={16} /> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Topics Tab - read-only learning view */}
        {activeTab === "topics" && (
          <div className="p-6">
            {topics.length === 0 ? (
              <div className="py-14 text-center">
                <FolderOpen className="mx-auto h-14 w-14 text-gray-300" />
                <h3 className="mt-4 font-semibold text-gray-800">
                  Lớp học chưa có chủ đề
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Giáo viên sẽ thêm chủ đề học tập cho lớp.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {topics.map((topic) => {
                  const topicLessons = lessons.filter(
                    (lesson) => lesson.topic_id === topic.id,
                  );
                  return (
                    <article
                      key={topic.id}
                      className="rounded-xl border border-gray-100 bg-white p-5 transition hover:border-primary-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                          <FolderOpen size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {topic.name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {topic.description || "Chủ đề học tập của lớp"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-primary-700">
                              {topic.vocabularyCount || 0} từ vựng
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                              {topicLessons.length} bài học
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("lessons")}
                        className="mt-5 w-full rounded-xl bg-primary-50 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                      >
                        Xem bài học theo chủ đề
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === "lessons" && (
          <div className="p-6 space-y-8">
            {/* Statistics Summary */}
            {lessonStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <div className="text-xs text-primary-600 font-medium uppercase tracking-wider">
                      Tổng số bài học
                    </div>
                    <div className="text-2xl font-bold text-primary-900">
                      {lessonStats.total || 0}
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-green-600 shadow-sm">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div className="text-xs text-green-600 font-medium uppercase tracking-wider">
                      Đã hoàn thành
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {lessons.filter((l) => l.completed).length} /{" "}
                      {lessons.length}
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="text-xs text-amber-600 font-medium uppercase tracking-wider">
                      Đang giảng dạy
                    </div>
                    <div className="text-2xl font-bold text-amber-900">
                      {lessons.filter((l) => l.is_active).length} bài học
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lessons.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen size={40} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Chưa có bài học nào
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-1">
                  Bắt đầu thêm giáo trình của bạn để sinh viên có thể học tập.
                </p>
              </div>
            )}

            {/* Grouped by Topic */}
            {topics.map((topic) => {
              const topicLessons = lessons.filter(
                (l) => l.topic_id === topic.id,
              );
              if (topicLessons.length === 0 && !isTeacher) return null;

              return (
                <div key={topic.id} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                      <FolderOpen size={18} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {topic.name}
                    </h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {topicLessons.length} bài học
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {topicLessons.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
                        Chưa có bài học trong chủ đề này
                      </div>
                    )}
                    {topicLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md hover:shadow-primary-500/5 transition-all bg-white"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            lesson.completed
                              ? "bg-green-100 text-green-600"
                              : "bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white"
                          }`}
                        >
                          {lesson.completed ? (
                            <CheckCircle size={24} />
                          ) : (
                            <Play size={24} />
                          )}
                        </div>

                        <Link
                          href={`/study/${classItem.id}/${lesson.id}`}
                          className="flex-1 min-w-0"
                        >
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                            {lesson.name}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FileText size={12} />
                              {lesson.difficulty_level}
                            </span>
                            {lesson.description && (
                              <span className="text-xs text-gray-400 truncate">
                                {lesson.description}
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isTeacher && (
                            <>
                              <button
                                onClick={() => handleEdit("lessons", lesson.id)}
                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    "lesson",
                                    lesson.id,
                                    lesson.name,
                                  )
                                }
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/study/${classItem.id}/${lesson.id}`}
                            className="p-2 text-gray-400 hover:text-primary-600"
                          >
                            <ChevronRight size={20} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Lessons */}
            {lessons.filter((l) => !l.topic_id).length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Bài học bổ sung
                  </h3>
                </div>
                <div className="grid gap-3">
                  {lessons
                    .filter((l) => !l.topic_id)
                    .map((lesson) => (
                      <div
                        key={lesson.id}
                        className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all bg-white"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            lesson.completed
                              ? "bg-green-100 text-green-600"
                              : "bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white"
                          }`}
                        >
                          {lesson.completed ? (
                            <CheckCircle size={24} />
                          ) : (
                            <Play size={24} />
                          )}
                        </div>

                        <Link
                          href={`/study/${classItem.id}/${lesson.id}`}
                          className="flex-1 min-w-0"
                        >
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {lesson.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {lesson.description || "Tài liệu học tập bổ sung"}
                          </p>
                        </Link>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isTeacher && (
                            <>
                              <button
                                onClick={() => handleEdit("lessons", lesson.id)}
                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    "lesson",
                                    lesson.id,
                                    lesson.name,
                                  )
                                }
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                          <Link href={`/study/${classItem.id}/${lesson.id}`}>
                            <ChevronRight size={20} />
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === "exams" && (
          <div className="divide-y divide-gray-100">
            {exams.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Chưa có bài kiểm tra nào
              </div>
            )}
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
                  <ClipboardCheck size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {exam.title || exam.name || ""}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {exam.questions} câu hỏi • {exam.duration} phút
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isTeacher ? (
                    <>
                      <button
                        onClick={() => handleEdit("exams", exam.id)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        <Pencil size={16} />
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteClick(
                            "exam",
                            exam.id,
                            exam.title || exam.name || "",
                          )
                        }
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => router.push(`/take-exam/${exam.id}`)}
                      className="px-4 py-2 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors flex items-center gap-2"
                    >
                      <Play size={16} />
                      Làm bài
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[40%]">
                      Thành viên
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                      Vai trò
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                      Ngày tham gia
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                      Trạng thái
                    </th>
                    {isTeacher && <th className="px-6 py-4 w-[10%]"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Render Teacher First */}
                  {teacher && (
                    <tr className="group hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold uppercase">
                            {teacher.avatar ? (
                              <img
                                src={teacher.avatar}
                                alt={teacher.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              teacher.name?.charAt(0) || "T"
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {teacher.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {teacher.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Giáo viên
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {/* Teacher join date unknown, skip or show class start date */}
                        -
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Trực tuyến
                        </span>
                      </td>
                      {isTeacher && <td className="px-6 py-4"></td>}
                    </tr>
                  )}

                  {/* Students Rows */}
                  {classMembers.map((student) => {
                    const isOnline = student.status === "online";
                    return (
                      <tr
                        key={student.id} // Assuming student.id is unique class_student_id or user_id
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 min-w-[40px] rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold overflow-hidden border border-gray-100 shadow-sm">
                              {student.avatar ? (
                                <img
                                  src={student.avatar}
                                  alt={student.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (student.name || "S").charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {student.name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Học viên
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.joinDate || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <div className="w-2 h-2 rounded-full bg-green-600"></div>
                              Trực tuyến
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              Ngoại tuyến
                            </span>
                          )}
                        </td>
                        {isTeacher && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                handleDeleteClick(
                                  "member",
                                  student.userId, // Use userId for removal
                                  student.name,
                                )
                              }
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              title="Xóa học viên khỏi lớp"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {classMembers.length === 0 && !teacher && (
                <div className="p-12 text-center text-gray-500">
                  Chưa có thành viên nào trong lớp học này.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${
          deleteModal.type === "lesson"
            ? "bài học"
            : deleteModal.type === "exam"
              ? "bài kiểm tra"
              : "thành viên"
        } "${deleteModal.itemName}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa ngay"
        cancelText="Hủy bỏ"
        type="danger"
      />

      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Thêm học sinh vào lớp"
      >
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm học sinh theo tên hoặc email..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <User size={18} />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredStudentsToAdd.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Không tìm thấy học sinh nào hoặc đã có trong lớp.
              </p>
            ) : (
              filteredStudentsToAdd.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                      {student.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(student.id)}
                    disabled={isAddingMember}
                    className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isAddingMember ? "Đang thêm..." : "Thêm"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {classItem && (
        <>
          <LessonModal
            isOpen={lessonModal.isOpen}
            onClose={() => setLessonModal({ ...lessonModal, isOpen: false })}
            onSuccess={loadData}
            classId={classItem.id}
            organizationId={classItem.organizationId}
            initialData={lessonModal.data}
          />

          <ExamModal
            isOpen={examModal.isOpen}
            onClose={() => setExamModal({ ...examModal, isOpen: false })}
            onSuccess={loadData}
            classId={classItem.id}
            organizationId={classItem.organizationId}
            initialData={examModal.data}
          />
        </>
      )}
    </div>
  );
}
