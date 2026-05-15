"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAllExams } from "@/services/examService";
import { ExamItem } from "@/data/examsData";
import { DashboardLayout } from "@/shared/components/layout";
import {
  FileText,
  Search,
  Clock,
  CheckCircle,
  Award,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { Spin } from "antd";

export default function TakeExamList() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const loadExams = async () => {
      setLoading(true);
      try {
        const userJson = localStorage.getItem("user");
        const user = userJson ? JSON.parse(userJson) : null;

        const data = await fetchAllExams({
          studentId: user?.id || user?.user_id,
        });
        setExams(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === "all" ||
      (filterType === "PRACTICE" &&
        (exam.examType === "PRACTICE" || exam.examType === "PRACTICAL")) ||
      (filterType === "QUIZ" &&
        (exam.examType === "QUIZ" || exam.examType === "MULTIPLE_CHOICE"));
    return matchesSearch && matchesType;
  });

  const getExamTypeLabel = (type: string) => {
    if (type === "PRACTICE" || type === "PRACTICAL") return "Thực hành";
    return "Trắc nghiệm";
  };

  const getExamTypeColor = (type: string) => {
    if (type === "PRACTICE" || type === "PRACTICAL")
      return "bg-purple-100 text-purple-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary-600" />
              Làm bài kiểm tra
            </h1>
            <p className="text-gray-600 mt-1">
              Danh sách các bài kiểm tra dành cho bạn ({filteredExams.length}{" "}
              bài)
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Tìm kiếm tên bài kiểm tra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white font-medium"
              >
                <option value="all">Tất cả loại bài</option>
                <option value="QUIZ">Trắc nghiệm</option>
                <option value="PRACTICE">Thực hành</option>
              </select>
            </div>
          </div>
        </div>

        {/* Exams Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Bài kiểm tra
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Loại bài
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Trạng thái / Điểm
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Spin size="large" tip="Đang tải dữ liệu..." />
                    </td>
                  </tr>
                ) : filteredExams.length > 0 ? (
                  filteredExams.map((exam) => {
                    const isSubmitted = exam.isSubmitted;
                    const isPractical =
                      exam.examType === "PRACTICE" ||
                      exam.examType === "PRACTICAL";

                    return (
                      <tr
                        key={exam.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                              <FileText size={20} />
                            </div>
                            <span className="font-semibold text-gray-900">
                              {exam.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getExamTypeColor(exam.examType as string)}`}
                          >
                            {exam.type ||
                              getExamTypeLabel(exam.examType as string)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            {exam.duration || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isSubmitted ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 w-fit">
                                <CheckCircle size={14} />
                                Đã nộp
                              </span>
                              {exam.userScore !== undefined &&
                                exam.userScore !== null && (
                                  <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                                    <Award size={14} />
                                    {exam.userScore} điểm
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <AlertCircle size={14} />
                              Chưa làm
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isSubmitted ? (
                            <div className="flex items-center justify-end gap-2">
                              {!isPractical && (
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/take-exam/${exam.id}?review=true`,
                                    )
                                  }
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium text-sm shadow-sm"
                                >
                                  <CheckCircle size={16} />
                                  Xem kết quả
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  router.push(`/take-exam/${exam.id}?redo=true`)
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-medium text-sm shadow-sm"
                              >
                                <PlayCircle size={16} />
                                Làm lại
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                router.push(`/take-exam/${exam.id}`)
                              }
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-medium text-sm shadow-sm"
                            >
                              <PlayCircle size={16} />
                              Bắt đầu làm
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Không tìm thấy bài kiểm tra nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
