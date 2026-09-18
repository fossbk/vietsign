"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, CheckCircle, ArrowRight, Trophy } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";

interface ChoiceQuizGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface QuizQuestion {
  id: number;
  promptType: "video" | "image" | "text";
  promptContent: string;
  options: {
    id: number;
    text: string;
    mediaUrl?: string;
    isCorrect: boolean;
  }[];
}

export const ChoiceQuizGame: React.FC<ChoiceQuizGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    setIsFinished(false);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerChecked(false);
    setCorrectCount(0);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const mediaList = data.media || [];
        const cfgQuestions = (data.game_config?.questions as QuizQuestion[]) || [];

        if (cfgQuestions.length > 0) {
          setQuestions(cfgQuestions);
        } else {
          // Generate questions from media list if no explicit game_config
          // Each media is a question, correct option is its own code/title, other options are distractors
          const generated: QuizQuestion[] = mediaList.map((m, idx) => {
            const correctText = m.media_code || `Ký hiệu ${idx + 1}`;
            // Pick distractors from other media
            const distractors = mediaList
              .filter((_, i) => i !== idx)
              .slice(0, 3)
              .map((d, dIdx) => ({
                id: d.media_id || (idx + 1) * 100 + dIdx,
                text: d.media_code || `Từ khác ${dIdx + 1}`,
                isCorrect: false,
              }));

            // Fallback distractors if list is small
            while (distractors.length < 3) {
              distractors.push({
                id: (idx + 1) * 1000 + distractors.length,
                text: `Lựa chọn ${distractors.length + 1}`,
                isCorrect: false,
              });
            }

            const options = [
              { id: m.media_id || idx + 1, text: correctText, isCorrect: true },
              ...distractors,
            ].sort(() => Math.random() - 0.5);

            return {
              id: m.media_id || idx + 1,
              promptType: m.media_type,
              promptContent: m.source_url,
              options,
            };
          });
          setQuestions(generated);
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được câu hỏi trắc nghiệm.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optId: number) => {
    if (isAnswerChecked) return;
    setSelectedOptionId(optId);
  };

  const handleCheckAnswer = () => {
    if (selectedOptionId === null || isAnswerChecked) return;
    setIsAnswerChecked(true);

    const selectedOpt = currentQ?.options.find((o) => o.id === selectedOptionId);
    if (selectedOpt?.isCorrect) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
    } else {
      // Finished all questions!
      const total = questions.length;
      const finalCorrect = correctCount;
      const calculatedScore = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;
      const calculatedStars = calculatedScore === 100 ? 3 : calculatedScore >= 70 ? 2 : 1;
      const isCompleted = calculatedScore >= (activity?.pass_score || 80);

      setIsFinished(true);
      setSubmitting(true);

      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

      if (activity) {
        try {
          await CurriculumModel.submitProgress(activity.activity_id, {
            score: calculatedScore,
            stars: calculatedStars,
            durationSeconds,
            isCompleted,
            gameResultDetails: {
              totalQuestions: total,
              correctAnswers: finalCorrect,
            },
          });
          if (isCompleted) {
            onComplete?.();
          }
        } catch (err) {
          console.error("Failed to submit quiz progress", err);
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang tải câu hỏi trắc nghiệm...</p>
      </div>
    );
  }

  if (error || !activity || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không có câu hỏi</h2>
        <p className="text-gray-500">{error || "Hoạt động này chưa có nội dung trắc nghiệm."}</p>
        <button
          onClick={loadData}
          className="mt-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors text-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // COMPLETED SCREEN
  // ─────────────────────────────────────────────
  if (isFinished) {
    const finalScore = Math.round((correctCount / questions.length) * 100);
    const finalStars = finalScore === 100 ? 3 : finalScore >= 70 ? 2 : 1;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in duration-500 px-6">
        <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <Trophy size={54} className="text-yellow-600" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">
            {finalScore >= 80 ? "Xuất sắc!" : "Hoàn thành bài tập!"}
          </h2>
          <p className="text-xl text-gray-600">
            Bạn đã trả lời đúng {correctCount} / {questions.length} câu hỏi
          </p>
        </div>

        <div className="flex gap-3 text-4xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i}>{i < finalStars ? "⭐" : "⚪"}</span>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-4">
          <div className="text-gray-500 text-sm mb-1">Điểm số của bạn</div>
          <div className="text-5xl font-black text-primary-600">{finalScore}</div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-xl hover:bg-primary-700 transition-colors shadow-lg"
        >
          <RotateCcw size={24} /> Làm lại bài trắc nghiệm
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          Quan sát ký hiệu và chạm vào đáp án đúng nhất.
        </p>
      </div>

      {/* Question Stepper Dots */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-primary-600 scale-125 ring-2 ring-primary-200"
                  : idx < currentIndex
                  ? "bg-emerald-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-primary-700">
          Câu {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question Stimulus: Video / Image / Text */}
      <div className="relative w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-md border-4 border-white flex items-center justify-center">
        {currentQ.promptType === "image" ? (
          <img
            src={currentQ.promptContent}
            alt="Câu hỏi"
            className="w-full h-full object-contain"
          />
        ) : (
          <VideoPlayer
            videoUrl={currentQ.promptContent}
            autoPlay
            loop
            showControls
            className="w-full h-full"
          />
        )}
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQ.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = opt.isCorrect;

          let cardStyle = "border-gray-200 bg-white hover:border-primary-400 hover:scale-[1.01]";
          let icon = null;

          if (isAnswerChecked) {
            if (isCorrect) {
              cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200";
              icon = "😊";
            } else if (isSelected && !isCorrect) {
              cardStyle = "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200 animate-shake";
              icon = "😢";
            } else {
              cardStyle = "border-gray-200 bg-gray-50 opacity-40";
            }
          } else if (isSelected) {
            cardStyle = "border-primary-600 bg-primary-50 text-primary-900 ring-4 ring-primary-100 scale-[1.02]";
          }

          return (
            <div
              key={opt.id}
              onClick={() => handleSelectOption(opt.id)}
              className={`relative p-5 min-h-[90px] rounded-2xl border-4 transition-all duration-200 cursor-pointer flex items-center justify-between shadow-sm select-none ${cardStyle}`}
            >
              <span className="text-xl font-bold w-full text-center px-2">
                {opt.text}
              </span>
              {icon && <span className="text-3xl ml-2 flex-shrink-0">{icon}</span>}
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      {!isAnswerChecked ? (
        <button
          onClick={handleCheckAnswer}
          disabled={selectedOptionId === null}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300 ${
            selectedOptionId !== null
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg scale-101"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle size={24} /> Kiểm tra câu trả lời
        </button>
      ) : (
        <button
          onClick={handleNextQuestion}
          className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all"
        >
          {currentIndex < questions.length - 1 ? (
            <>
              Câu tiếp theo <ArrowRight size={24} />
            </>
          ) : (
            <>
              Xem kết quả <Trophy size={24} />
            </>
          )}
        </button>
      )}
    </div>
  );
};
