"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react";
import CurriculumModel, { CurriculumLesson } from "@/domain/entities/Curriculum";

const LEVELS = [
  { code: "L1", label: "Lớp 1", active: true },
  { code: "L2", label: "Lớp 2", active: false },
  { code: "L3", label: "Lớp 3", active: false },
  { code: "L4", label: "Lớp 4", active: false },
  { code: "L5", label: "Lớp 5", active: false },
];

const TOPICS = [
  { code: "ALL", label: "Tất cả chủ đề" },
  { code: "BT", label: "Chữ cái & Số (Bản thân)" },
  { code: "GD", label: "Gia đình" },
  { code: "NT", label: "Nhà trường" },
  { code: "TN", label: "Thiên nhiên & Đất nước" },
];

const GAME_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  FlipCardViewer: { label: "Thẻ lật thông minh", icon: "🃏", color: "bg-blue-50 text-blue-700 border-blue-200" },
  LineMatchingGame: { label: "Nối ký hiệu - từ", icon: "🔗", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ChoiceQuizGame: { label: "Trắc nghiệm ký hiệu", icon: "❓", color: "bg-amber-50 text-amber-700 border-amber-200" },
  JigsawPuzzleGame: { label: "Ghép hình ký hiệu", icon: "🧩", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BucketDropGame: { label: "Kéo thả vào giỏ", icon: "🧺", color: "bg-orange-50 text-orange-700 border-orange-200" },
  MemoryCardGame: { label: "Lật thẻ tìm cặp", icon: "🧠", color: "bg-pink-50 text-pink-700 border-pink-200" },
  SequenceOrderGame: { label: "Sắp xếp theo thứ tự", icon: "🔢", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  VideoPracticeRecorder: { label: "Quay video thực hành", icon: "📹", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function CurriculumList() {
  const [selectedLevel, setSelectedLevel] = useState("L1");
  const [selectedTopic, setSelectedTopic] = useState("ALL");
  const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Map of expanded lesson codes to show activity lists
  const [expandedLessonCode, setExpandedLessonCode] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<Record<string, CurriculumLesson>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const fetchLessonDetail = useCallback((code: string) => {
    setLoadingDetails((prev) => ({ ...prev, [code]: true }));
    CurriculumModel.getLessonByCode(code)
      .then((detail) => {
        setLessonDetails((prev) => ({ ...prev, [code]: detail }));
      })
      .catch((err) => {
        console.error("Failed to load lesson detail", err);
      })
      .finally(() => {
        setLoadingDetails((prev) => ({ ...prev, [code]: false }));
      });
  }, []);

  const handleToggleLesson = useCallback((code: string) => {
    if (expandedLessonCode === code) {
      setExpandedLessonCode(null);
      return;
    }
    setExpandedLessonCode(code);
    if (!lessonDetails[code]) fetchLessonDetail(code);
  }, [expandedLessonCode, fetchLessonDetail, lessonDetails]);

  // Fetch lessons
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params: { level?: string; topic?: string } = { level: selectedLevel };
    if (selectedTopic !== "ALL") params.topic = selectedTopic;

    CurriculumModel.getLessons(params)
      .then((list) => {
        setLessons(list);
        // Auto-expand first lesson if available
        if (list && list.length > 0) {
          setExpandedLessonCode(list[0].lesson_code);
          fetchLessonDetail(list[0].lesson_code);
        }
      })
      .catch((err) => {
        console.error("Failed to load curriculum lessons", err);
        setLessons([]);
      })
      .finally(() => setLoading(false));
  }, [fetchLessonDetail, selectedLevel, selectedTopic]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 rounded-3xl p-8 md:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> Khung chương trình giáo dục phổ thông
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Học Ngôn Ngữ Ký Hiệu
          </h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed">
            Chương trình chuẩn hỗ trợ dạy và học ký hiệu dành riêng cho học sinh khiếm thính từ Lớp 1 đến Lớp 5.
          </p>
        </div>
        <div className="absolute right-6 -bottom-6 opacity-15 hidden md:block pointer-events-none">
          <GraduationCap size={260} />
        </div>
      </div>

      {/* Level Tabs (Lớp 1 - 5) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {LEVELS.map((lvl) => {
          const isSelected = selectedLevel === lvl.code;
          return (
            <button
              key={lvl.code}
              onClick={() => setSelectedLevel(lvl.code)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base whitespace-nowrap transition-all select-none ${
                isSelected
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-200 scale-102"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
              }`}
            >
              <Layers size={18} />
              {lvl.label}
              {!lvl.active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 ml-1">
                  Sắp mở
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Topics Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TOPICS.map((topic) => {
          const isSelected = selectedTopic === topic.code;
          return (
            <button
              key={topic.code}
              onClick={() => setSelectedTopic(topic.code)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-gray-900 text-white shadow"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* Lessons List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="text-gray-500 font-medium">Đang tải danh sách bài học...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <BookOpen size={48} className="mx-auto text-gray-300" />
          <h3 className="text-xl font-bold text-gray-800">Chưa có bài học cho cấp độ này</h3>
          <p className="text-gray-500 text-sm">Các bài học đang được ban biên tập xây dựng và sẽ sớm ra mắt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => {
            const isExpanded = expandedLessonCode === lesson.lesson_code;
            const currentDetail = lessonDetails[lesson.lesson_code];
            const isLoadingActivities = loadingDetails[lesson.lesson_code];
            const activities = currentDetail?.activities || [];

            return (
              <div
                key={lesson.lesson_code}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Lesson Header Accordion Trigger */}
                <div
                  onClick={() => handleToggleLesson(lesson.lesson_code)}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-lg">
                        {lesson.lesson_code}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {lesson.content_status === "ready" ? "Sẵn sàng học" : "Đang biên soạn"}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-gray-900">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="text-gray-500 text-sm">{lesson.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 font-bold uppercase">Hoạt động</span>
                      <div className="text-base font-black text-gray-800">
                        {lesson.total_activities || activities.length || "Đa dạng"} trò chơi
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Activities List */}
                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-gray-100 bg-gray-50/40">
                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-8 gap-3 text-gray-400 text-sm">
                        <Loader2 className="animate-spin" size={20} />
                        Đang tải các hoạt động...
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        Bài học chưa có hoạt động nào.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {activities.map((act) => {
                          const typeCfg = GAME_TYPE_LABELS[act.game_type] || {
                            label: act.game_type,
                            icon: "🎮",
                            color: "bg-gray-50 text-gray-700 border-gray-200",
                          };

                          return (
                            <Link
                              key={act.activity_code}
                              href={`/curriculum/${lesson.lesson_code}/${act.activity_code}`}
                              className="group p-5 rounded-2xl bg-white border border-gray-200/70 hover:border-primary-500 hover:shadow-lg transition-all flex flex-col justify-between gap-4"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${typeCfg.color}`}
                                  >
                                    <span>{typeCfg.icon}</span>
                                    <span>{typeCfg.label}</span>
                                  </span>
                                  <span className="text-[11px] font-bold text-gray-400">
                                    {act.activity_code}
                                  </span>
                                </div>

                                <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                                  {act.title}
                                </h4>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <span className="text-xs font-semibold text-gray-500">
                                  Điểm đạt: {Math.round(act.pass_score)}đ
                                </span>
                                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 group-hover:translate-x-1 transition-transform">
                                  Vào học <Play size={14} className="fill-current" />
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
