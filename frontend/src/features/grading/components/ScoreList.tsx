"use client";

import React, { useState, useEffect } from "react";
import { Table, Input, Button, Tag, Select, Space } from "antd";
import { useRouter } from "next/navigation";
import { fetchAllPracticalSubmissions } from "@/services/examService";
import {
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Award,
  FileText,
  Filter,
} from "lucide-react";

export default function ScoreList() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const submissions = await fetchAllPracticalSubmissions();

      const entries = (Array.isArray(submissions) ? submissions : []).map(
        (sub: any) => ({
          examId: sub.exam_id,
          examName: sub.examName || "Bài kiểm tra",
          examType: sub.exam_type || "PRACTICAL",
          classRoomName: sub.classRoomName || "N/A",
          userId: sub.studentId,
          userName: sub.studentName || "N/A",
          score: sub.score,
          isGraded: sub.is_graded === 1 || sub.score !== null,
          attemptId: sub.attempt_id,
          startedAt: sub.started_at,
          finishedAt: sub.finished_at,
        }),
      );

      setDataList(entries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = dataList.filter((d) => {
    const matchesName = d.examName
      .toLowerCase()
      .includes(filterName.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "graded" && d.isGraded) ||
      (filterStatus === "pending" && !d.isGraded);
    const matchesType =
      filterType === "all" ||
      (filterType === "PRACTICAL" && d.examType === "PRACTICAL") ||
      (filterType === "MULTIPLE_CHOICE" &&
        d.examType === "MULTIPLE_CHOICE");
    return matchesName && matchesStatus && matchesType;
  });

  const handleViewDetail = (record: any) => {
    if (record.examType === "MULTIPLE_CHOICE") {
      router.push(
        `/take-exam/${record.examId}?review=true&studentId=${record.userId}`,
      );
    } else {
      router.push(`/grading/${record.examId}/${record.userId}`);
    }
  };

  const handleGrade = (record: any) => {
    router.push(`/grading/${record.examId}/${record.userId}`);
  };

  const getExamTypeTag = (type: string) => {
    if (type === "PRACTICAL") {
      return (
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
          Thực hành
        </span>
      );
    }
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
        Trắc nghiệm
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-600" />
          Chấm điểm & Kết quả
        </h1>
        <p className="text-gray-600 mt-1">
          Danh sách bài kiểm tra đã nộp ({filteredData.length} bài)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Tìm theo tên bài kiểm tra hoặc học sinh..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-sm"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chưa chấm</option>
              <option value="graded">Đã chấm</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-white text-sm"
            >
              <option value="all">Tất cả loại</option>
              <option value="PRACTICAL">Thực hành</option>
              <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[5%]">
                  STT
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[25%]">
                  Tên bài kiểm tra
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[12%]">
                  Loại
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[15%]">
                  Lớp
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[18%]">
                  Học sinh
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 w-[10%]">
                  Điểm
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[15%]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((record, index) => (
                  <tr
                    key={`${record.examId}-${record.userId}-${record.attemptId}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetail(record)}
                        className="font-medium text-blue-600 hover:underline text-left"
                      >
                        {record.examName}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {getExamTypeTag(record.examType)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.classRoomName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {record.userName}
                    </td>
                    <td className="px-6 py-4">
                      {record.isGraded ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                          <Award size={14} />
                          {typeof record.score === "number"
                            ? record.score.toFixed(1)
                            : record.score}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                          <Clock size={14} />
                          Chưa chấm
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.isGraded ? (
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium text-sm shadow-sm"
                        >
                          <Eye size={16} />
                          Xem chi tiết
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrade(record)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-medium text-sm shadow-sm"
                        >
                          <Edit size={16} />
                          Chấm điểm
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">Không có bài kiểm tra nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
