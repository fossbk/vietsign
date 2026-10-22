"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  BookOpen,
  Clock,
  BarChart,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { SelfLearnCourse } from "@/data/selfLearnData";
import { fetchAllCourses } from "@/services/learnService";
import Link from "next/link";

export const Learn: React.FC = () => {
  const [courses, setCourses] = useState<SelfLearnCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllCourses();
        setCourses(data);
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary-600" />
            Tự học ngôn ngữ ký hiệu
          </h1>
          <p className="text-gray-600 mt-1">
            Các khóa học có sẵn dành cho học viên tự do ({courses.length} khóa
            học)
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900 dark:to-blue-900 border border-primary-100 dark:border-primary-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">
              Học mọi lúc, mọi nơi
            </h3>
            <p className="text-gray-600 text-sm">
              Bạn là học viên tự do muốn học ngôn ngữ ký hiệu? Các khóa học này
              được thiết kế để bạn có thể tự học mà không cần lớp học hay giáo
              viên. Chọn một khóa học phù hợp và bắt đầu hành trình của bạn!
            </p>
          </div>
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500">Đang tải khóa học...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length > 0 ? (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
              >
                <div
                  className={`h-32 ${course.colorClass} p-6 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="absolute top-4 right-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/10`}
                    >
                      {course.level}
                    </span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-white font-bold text-xl line-clamp-2">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {course.subtitle}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={14} className="text-primary-500" />
                      <span>{course.totalLessons} bài học</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-primary-500" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart size={14} className="text-primary-500" />
                      <span>{course.level}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Tiến độ</span>
                      <span className="font-semibold text-primary-600">
                        {course.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <Link
                      href={`/learn/${course.id}`}
                      className="w-full py-2.5 bg-primary-50 text-primary-600 font-medium rounded-xl hover:bg-primary-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      Bắt đầu học
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có khóa học nào
              </h3>
              <p className="text-gray-500">
                Các khóa học đang được cập nhật, vui lòng quay lại sau.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
