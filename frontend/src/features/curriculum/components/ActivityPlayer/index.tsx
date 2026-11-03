"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import CurriculumModel, { CurriculumActivity, CurriculumLesson } from "@/domain/entities/Curriculum";
import {
  FlipCardViewer,
  LineMatchingGame,
  ChoiceQuizGame,
  JigsawPuzzleGame,
  BucketDropGame,
  MemoryCardGame,
  SequenceOrderGame,
  VideoPracticeRecorder,
} from "../index";

export function ActivityPlayer() {
  const params = useParams();
  const router = useRouter();

  const lessonCode = params.lessonCode as string;
  const activityCode = params.activityCode as string;

  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [lesson, setLesson] = useState<CurriculumLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityCode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    Promise.all([
      CurriculumModel.getActivityByCode(activityCode),
      lessonCode ? CurriculumModel.getLessonByCode(lessonCode) : Promise.resolve(null),
    ])
      .then(([actData, lessonData]) => {
        setActivity(actData);
        if (lessonData) setLesson(lessonData);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được hoạt động.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode, lessonCode]);

  // Find previous and next activities in the same lesson
  const activities = lesson?.activities || [];
  const currentIndex = activities.findIndex((a) => a.activity_code === activityCode);
  const prevActivity = currentIndex > 0 ? activities[currentIndex - 1] : null;
  const nextActivity = currentIndex >= 0 && currentIndex < activities.length - 1 ? activities[currentIndex + 1] : null;

  const handleComplete = () => {
    console.log(`Activity ${activityCode} completed!`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang tải hoạt động học tập...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không tìm thấy hoạt động</h2>
        <p className="text-gray-500">{error || "Mã hoạt động không hợp lệ hoặc đã bị gỡ bỏ."}</p>
        <button
          onClick={() => router.push("/curriculum")}
          className="mt-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors text-lg"
        >
          Quay lại danh mục bài học
        </button>
      </div>
    );
  }

  // Render game component dynamically
  const renderGame = () => {
    switch (activity.game_type) {
      case "FlipCardViewer":
        return <FlipCardViewer activityCode={activityCode} onComplete={handleComplete} />;
      case "LineMatchingGame":
        return <LineMatchingGame activityCode={activityCode} onComplete={handleComplete} />;
      case "ChoiceQuizGame":
        return <ChoiceQuizGame activityCode={activityCode} onComplete={handleComplete} />;
      case "JigsawPuzzleGame":
        return <JigsawPuzzleGame activityCode={activityCode} onComplete={handleComplete} />;
      case "BucketDropGame":
        return <BucketDropGame activityCode={activityCode} onComplete={handleComplete} />;
      case "MemoryCardGame":
        return <MemoryCardGame activityCode={activityCode} onComplete={handleComplete} />;
      case "SequenceOrderGame":
        return <SequenceOrderGame activityCode={activityCode} onComplete={handleComplete} />;
      case "VideoPracticeRecorder":
        return <VideoPracticeRecorder activityCode={activityCode} onComplete={handleComplete} />;
      default:
        return (
          <div className="p-8 text-center text-gray-500 bg-white rounded-3xl border">
            Hoạt động này thuộc loại trò chơi chưa hỗ trợ: <b>{activity.game_type}</b>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Breadcrumbs & Navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/curriculum")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <Link href="/curriculum" className="text-gray-500 hover:text-primary-600 font-medium">
              Chương trình
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 font-medium truncate max-w-[160px] md:max-w-none">
              {lesson?.title || lessonCode}
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-primary-600 font-bold truncate max-w-[200px]">
              {activity.title}
            </span>
          </div>
        </div>

        {/* Prev / Next activity buttons in lesson */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {prevActivity && (
            <button
              onClick={() => router.push(`/curriculum/${lessonCode}/${prevActivity.activity_code}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft size={14} /> Hoạt động trước
            </button>
          )}
          {nextActivity && (
            <button
              onClick={() => router.push(`/curriculum/${lessonCode}/${nextActivity.activity_code}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
            >
              Hoạt động sau <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Game Container */}
      <div className="bg-gradient-to-b from-gray-50/50 to-white rounded-3xl p-2 md:p-6">
        {renderGame()}
      </div>
    </div>
  );
}
