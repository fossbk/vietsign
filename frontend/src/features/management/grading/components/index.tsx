"use client";

import {
  PenLine,
  Filter,
  CheckCircle,
  Clock,
  FileText,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  mockSubmissions,
  submissionStatusConfig,
  SubmissionItem,
} from "@/data";
import { fetchAllSubmissions } from "@/services/submissionService";
import { fetchAllExams } from "@/services/examService";
import { fetchAllClasses } from "@/services/classService";
import { fetchUsersByRole } from "@/services/userService";
import { Pagination, usePagination } from "@/shared/components/common/Pagination";

const ITEMS_PER_PAGE = 3;


export function GradingManagement() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lookups
  const [studentsMap, setStudentsMap] = useState<Record<number, string>>({});
  const [examsMap, setExamsMap] = useState<Record<number, string>>({});
  const [classesMap, setClassesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [subs, exams, classes, students] = await Promise.all([
          fetchAllSubmissions(),
          fetchAllExams(),
          fetchAllClasses(),
          fetchUsersByRole("STUDENT"),
        ]);

        setSubmissions(subs);

        const examMap: Record<number, string> = {};
        exams.forEach((e) => (examMap[e.id] = e.title));
        setExamsMap(examMap);

        const classMap: Record<number, string> = {};
        classes.forEach((c) => (classMap[c.id] = c.name));
        setClassesMap(classMap);

        const studentMap: Record<number, string> = {};
        // Ensure students is array
        (students || []).forEach((s: s) => (studentMap[s.id] = s.name));
        setStudentsMap(studentMap);
      } catch (error) {
        console.error("Failed to load grading data", error);
        setSubmissions(mockSubmissions);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper functions để lấy tên từ Map
  const getStudentName = (studentId: number): string => {
    return studentsMap[studentId] || "Không xác định";
  };

  const getExamTitle = (examId: number): string => {
    return examsMap[examId] || "Không xác định";
  };

  const getClassName = (classId: number): string => {
    return classesMap[classId] || "Không xác định";
  };

  const filteredSubmissions = submissions.filter(
    (sub) => filterStatus === "all" || sub.status === filterStatus
  );
  const {
      currentPage,
      totalPages,
      paginatedItems,
      setCurrentPage,
  } = usePagination(filteredSubmissions, ITEMS_PER_PAGE);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <PenLine className="w-8 h-8 text-primary-600" />
            Chấm điểm
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 text-sm font-medium bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Chấm điểm bài làm của học sinh</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">Chờ chấm điểm</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{gradedCount}</p>
              <p className="text-sm text-gray-500">Đã chấm</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ chấm</option>
            <option value="graded">Đã chấm</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedItems.map((sub, index) => {
          if (!sub)
            return (
              <div
                key={`empty-${index}`}
                className="h-[110px]"
                aria-hidden="true"
              />
            );

          const statusConfig = submissionStatusConfig[sub.status] || {
            label: sub.status,
            color: "bg-gray-100",
          };
          const studentName = getStudentName(sub.studentId);
          const examTitle = getExamTitle(sub.examId);
          const className = getClassName(sub.classId);

          return (
            <div
              key={sub.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                    {studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {studentName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <FileText size={16} className="text-gray-400" />
                        <span>{examTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={16} className="text-gray-400" />
                        <span>{className}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} className="text-gray-400" />
                        <span>{sub.submittedAt}</span>
                      </div>
                      {sub.duration && (
                        <span className="text-gray-400">({sub.duration})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {sub.score !== null && sub.score !== undefined && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">
                        {sub.score}
                      </p>
                      <p className="text-xs text-gray-500">Điểm</p>
                    </div>
                  )}
                  <button className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100">
                    {sub.status === "pending" ? "Chấm điểm" : "Xem chi tiết"}{" "}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

          {!isLoading && filteredSubmissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredSubmissions.length}
              filteredItems={filteredSubmissions.length}
              itemName="bài nộp"
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    );
  }
