"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, CheckCircle } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";
import { getMediaLabel, shuffle } from "../gameUtils";

interface LineMatchingGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface MatchPairItem {
  id: number;
  media: CurriculumMedia;
  targetText: string;
}

const LINE_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
];

export const LineMatchingGame: React.FC<LineMatchingGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left items (videos/images) and Right items (shuffled texts)
  const [leftItems, setLeftItems] = useState<MatchPairItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchPairItem[]>([]);

  // Selected left item id currently awaiting a match
  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);

  // matches: leftId -> rightId
  const [matches, setMatches] = useState<Record<number, number>>({});

  // evaluation state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Refs for calculating line coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const leftDotRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const rightDotRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const startTimeRef = useRef<number>(Date.now());

  // Force re-render for SVG lines on resize
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const handleResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch data
  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    setIsSubmitted(false);
    setMatches({});
    setSelectedLeftId(null);
    setSubmitError(null);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const mediaList = data.media || [];
        // Build pairs
        const pairs: MatchPairItem[] = mediaList.map((m, idx) => {
          return {
            id: m.media_id,
            media: m,
            targetText: getMediaLabel(data, m, idx),
          };
        });

        setLeftItems(pairs);
        // Shuffle right items
        setRightItems(shuffle(pairs));
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được trò chơi nối từ.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click handling
  const handleLeftClick = (id: number) => {
    if (isSubmitted) return;
    // If already selected, deselect
    if (selectedLeftId === id) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(id);
    }
  };

  const handleRightClick = (rightId: number) => {
    if (isSubmitted) return;
    if (selectedLeftId !== null) {
      // Create or replace match
      setMatches((prev) => {
        const next = { ...prev };
        // Remove if rightId was already connected to another leftId
        Object.keys(next).forEach((k) => {
          if (next[Number(k)] === rightId) delete next[Number(k)];
        });
        next[selectedLeftId] = rightId;
        return next;
      });
      setSelectedLeftId(null);
    }
  };

  const handleRemoveMatch = (leftId: number) => {
    if (isSubmitted) return;
    setMatches((prev) => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  };

  // Check answers and submit
  const handleCheck = async () => {
    if (!activity || isSubmitted || submitting) return;

    let correctCount = 0;
    const total = leftItems.length;

    leftItems.forEach((item) => {
      if (matches[item.id] === item.id) {
        correctCount++;
      }
    });

    const calculatedScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const calculatedStars = calculatedScore === 100 ? 3 : calculatedScore >= 70 ? 2 : 1;
    const isCompleted = calculatedScore >= (activity.pass_score || 80);

    setScore(calculatedScore);
    setStars(calculatedStars);
    setIsSubmitted(true);
    setSubmitting(true);
    setSubmitError(null);

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await CurriculumModel.submitProgress(activity.activity_id, {
        score: calculatedScore,
        stars: calculatedStars,
        durationSeconds,
        isCompleted,
        gameResultDetails: {
          totalPairs: total,
          correctPairs: correctCount,
          matches,
        },
      });
      if (isCompleted) {
        onComplete?.();
      }
    } catch (err) {
      console.error("Failed to submit line matching progress", err);
      setSubmitError("Đã chấm kết quả nhưng chưa lưu được tiến độ. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute SVG line paths
  const lines = useMemo(() => {
    void resizeTick;
    if (!containerRef.current) return [];
    const containerRect = containerRef.current.getBoundingClientRect();

    return Object.entries(matches).map(([leftIdStr, rightId], idx) => {
      const leftId = Number(leftIdStr);
      const leftDot = leftDotRefs.current[leftId];
      const rightDot = rightDotRefs.current[rightId];

      if (!leftDot || !rightDot) return null;

      const leftRect = leftDot.getBoundingClientRect();
      const rightRect = rightDot.getBoundingClientRect();

      const x1 = leftRect.left + leftRect.width / 2 - containerRect.left;
      const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
      const x2 = rightRect.left + rightRect.width / 2 - containerRect.left;
      const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

      // Determine color
      let strokeColor = LINE_COLORS[idx % LINE_COLORS.length];
      const isCorrect = leftId === rightId;
      if (isSubmitted) {
        strokeColor = isCorrect ? "#10B981" : "#EF4444";
      }

      return {
        leftId,
        rightId,
        x1,
        y1,
        x2,
        y2,
        strokeColor,
        isCorrect,
      };
    }).filter(Boolean);
  }, [matches, isSubmitted, resizeTick]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang chuẩn bị trò chơi nối từ...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không tải được trò chơi</h2>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors text-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const allMatched = Object.keys(matches).length === leftItems.length && leftItems.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          Chạm vào video bên trái rồi chạm vào từ tương ứng bên phải để nối cặp.
        </p>
      </div>

      {/* Progress & Hint bar */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Đã nối:</span>
          <span className="font-bold text-primary-600 text-lg">
            {Object.keys(matches).length} / {leftItems.length} cặp
          </span>
        </div>
        <button
          onClick={loadData}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          <RotateCcw size={16} /> Làm lại
        </button>
      </div>

      {/* Main Matching Board */}
      <div
        ref={containerRef}
        className="relative bg-white p-6 rounded-3xl border border-gray-100 shadow-md select-none overflow-hidden min-h-[420px]"
      >
        {/* SVG Drawing Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {lines.map((line) => {
            if (!line) return null;
            return (
              <g key={`${line.leftId}-${line.rightId}`}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.strokeColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={isSubmitted && !line.isCorrect ? "8 6" : undefined}
                  className="transition-all duration-300"
                />
                {/* Result icon on midpoint */}
                {isSubmitted && (
                  <text
                    x={(line.x1 + line.x2) / 2}
                    y={(line.y1 + line.y2) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="22"
                  >
                    {line.isCorrect ? "😊" : "😢"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 2 Columns */}
        <div className="grid grid-cols-2 gap-16 md:gap-32 relative z-20">
          {/* Left Column: Media */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-center">
              Ký hiệu tay
            </h3>
            {leftItems.map((item) => {
              const isSelected = selectedLeftId === item.id;
              const hasMatch = matches[item.id] !== undefined;
              const isCorrect = isSubmitted && matches[item.id] === item.id;
              const isWrong = isSubmitted && hasMatch && !isCorrect;

              return (
                <div
                  key={`left-${item.id}`}
                  onClick={() => handleLeftClick(item.id)}
                  className={`relative flex items-center justify-between p-3 rounded-2xl border-4 transition-all duration-200 cursor-pointer bg-gray-900 ${
                    isWrong
                      ? "border-red-500 animate-pulse"
                      : isCorrect
                      ? "border-emerald-500 bg-emerald-950"
                      : isSelected
                      ? "border-primary-500 ring-4 ring-primary-100 scale-102"
                      : hasMatch
                      ? "border-primary-300 bg-gray-800"
                      : "border-gray-200 hover:border-primary-300"
                  }`}
                >
                  <div
                    className="w-full h-24 rounded-xl overflow-hidden flex items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {item.media.media_type === "image" ? (
                      <img
                        src={item.media.source_url}
                        alt={item.media.media_code}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <VideoPlayer
                        videoUrl={item.media.source_url}
                        autoPlay={false}
                        loop
                        showControls
                        className="w-full h-full"
                      />
                    )}
                  </div>

                  {/* Connect Dot */}
                  <div
                    ref={(el) => {
                      leftDotRefs.current[item.id] = el;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasMatch) {
                        handleRemoveMatch(item.id);
                      } else {
                        handleLeftClick(item.id);
                      }
                    }}
                    className={`absolute -right-4 w-8 h-8 rounded-full border-4 flex items-center justify-center transition-transform ${
                      hasMatch
                        ? "bg-primary-500 border-white shadow-md scale-110"
                        : isSelected
                        ? "bg-primary-500 border-white ring-4 ring-primary-200 scale-125 animate-bounce"
                        : "bg-white border-primary-400 hover:scale-110"
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Words */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-center">
              Từ tương ứng
            </h3>
            {rightItems.map((item) => {
              const matchedLeftId = Object.keys(matches).find(
                (lId) => matches[Number(lId)] === item.id
              );
              const isMatched = matchedLeftId !== undefined;
              const isCorrect = isSubmitted && isMatched && Number(matchedLeftId) === item.id;
              const isWrong = isSubmitted && isMatched && !isCorrect;

              return (
                <div
                  key={`right-${item.id}`}
                  onClick={() => handleRightClick(item.id)}
                  className={`relative flex items-center justify-between p-4 h-[120px] rounded-2xl border-4 transition-all duration-200 cursor-pointer ${
                    isWrong
                      ? "border-red-500 bg-red-50 text-red-700"
                      : isCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : isMatched
                      ? "border-primary-300 bg-primary-50 text-primary-900"
                      : selectedLeftId !== null
                      ? "border-primary-200 bg-white hover:border-primary-400 hover:scale-102"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {/* Connect Dot Left side of this card */}
                  <div
                    ref={(el) => {
                      rightDotRefs.current[item.id] = el;
                    }}
                    className={`absolute -left-4 w-8 h-8 rounded-full border-4 flex items-center justify-center transition-transform ${
                      isMatched
                        ? "bg-primary-500 border-white shadow-md scale-110"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>

                  <span className="text-xl md:text-2xl font-black text-center w-full px-2">
                    {item.targetText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Evaluation Result */}
      {submitError && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">
          {submitError}
        </div>
      )}

      {isSubmitted && (
        <div
          className={`p-6 rounded-3xl border-2 text-center animate-in zoom-in duration-300 ${
            score >= 80 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="text-4xl mb-2">{score >= 80 ? "🎉" : "💪"}</div>
          <h4 className="text-2xl font-black text-gray-900 mb-1">
            {score === 100 ? "Tuyệt vời! Đúng tất cả!" : score >= 80 ? "Rất tốt!" : "Cố gắng lên nhé!"}
          </h4>
          <p className="text-gray-600 font-medium">
            Bạn đạt được <span className="font-black text-primary-600 text-xl">{score}</span> / 100 điểm
          </p>
          <div className="flex justify-center gap-2 text-3xl my-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? "text-yellow-400" : "text-gray-300"}>
                ⭐
              </span>
            ))}
          </div>
          {score < 80 && (
            <p className="text-sm text-gray-500">
              Hãy nhấn nút &quot;Làm lại&quot; để thử nối lại cho thật chuẩn nhé!
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      {!isSubmitted ? (
        <button
          onClick={handleCheck}
          disabled={!allMatched || submitting}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300 ${
            allMatched && !submitting
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg scale-101"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {allMatched ? (
            <>
              <CheckCircle size={26} /> Kiểm tra kết quả
            </>
          ) : (
            `Còn ${leftItems.length - Object.keys(matches).length} cặp chưa nối`
          )}
        </button>
      ) : (
        <button
          onClick={loadData}
          className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all"
        >
          <RotateCcw size={24} /> Chơi lại lần nữa
        </button>
      )}
    </div>
  );
};
