"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, Trophy } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";
import { getGameConfig, getMediaLabel, shuffle } from "../gameUtils";

interface BucketDropGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface Bucket {
  id: number;
  label: string;
  color: string;
}

interface DropItem {
  id: number;
  media: CurriculumMedia;
  targetBucketId: number;
  label: string;
}

const BUCKET_COLORS = [
  { bg: "bg-blue-500", border: "border-blue-600", light: "bg-blue-50" },
  { bg: "bg-emerald-500", border: "border-emerald-600", light: "bg-emerald-50" },
  { bg: "bg-amber-500", border: "border-amber-600", light: "bg-amber-50" },
];

export const BucketDropGame: React.FC<BucketDropGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [items, setItems] = useState<DropItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Drop animation state
  const [droppedBucketId, setDroppedBucketId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  const initGame = useCallback(() => {
    setLoading(true);
    setError(null);
    setCurrentItemIndex(0);
    setCorrectCount(0);
    setIsFinished(false);
    setDroppedBucketId(null);
    setFeedback(null);
    setSubmitError(null);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const mediaList = data.media || [];

        // Setup 2 buckets from config or default groups
        const config = getGameConfig(data);
        const cfgBuckets = (Array.isArray(config.buckets) ? config.buckets as Bucket[] : null) || [
          { id: 1, label: "Nhóm 1", color: "blue" },
          { id: 2, label: "Nhóm 2", color: "emerald" },
        ];
        setBuckets(cfgBuckets);

        const configuredItems = Array.isArray(config.items) ? config.items as Array<{ label?: string; targetBucketId?: number; mediaIndex?: number }> : [];
        const sourceItems: Array<{ label?: string; targetBucketId?: number; mediaIndex?: number }> = configuredItems.length > 0
          ? configuredItems
          : mediaList.map((_, index) => ({ mediaIndex: index }));
        const dropItems: DropItem[] = sourceItems.map((configured, idx) => {
          const media = mediaList[configured.mediaIndex ?? idx] || mediaList[idx % mediaList.length];
          return {
            id: idx + 1,
            media,
            targetBucketId: configured.targetBucketId || cfgBuckets[idx % cfgBuckets.length]?.id || 1,
            label: configured.label || getMediaLabel(data, media, configured.mediaIndex ?? idx),
          };
        });

        // Shuffle items order
        setItems(shuffle(dropItems));
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được trò chơi thả giỏ.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const currentItem = items[currentItemIndex];

  // Handle dropping into bucket
  const handleDropIntoBucket = (bucketId: number) => {
    if (!currentItem || feedback !== null || isFinished) return;

    const isCorrect = currentItem.targetBucketId === bucketId;
    setDroppedBucketId(bucketId);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) setCorrectCount((c) => c + 1);

    // Advance to next item after animation
    setTimeout(async () => {
      setDroppedBucketId(null);
      setFeedback(null);

      if (!isCorrect) return;

      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex((i) => i + 1);
      } else {
        // Finished all items!
        const total = items.length;
        const finalCorrect = correctCount + (isCorrect ? 1 : 0);
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
                totalItems: total,
                correctItems: finalCorrect,
              },
            });
            if (isCompleted) {
              onComplete?.();
            }
          } catch (err) {
            console.error("Failed to submit bucket drop progress", err);
            setSubmitError("Đã hoàn thành nhưng chưa lưu được tiến độ. Hãy kiểm tra kết nối.");
          } finally {
            setSubmitting(false);
          }
        }
      }
    }, 900);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang chuẩn bị các giỏ đựng...</p>
      </div>
    );
  }

  if (error || !activity || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không có dữ liệu</h2>
        <p className="text-gray-500">{error || "Hoạt động này chưa có danh sách ký hiệu để phân loại."}</p>
        <button
          onClick={initGame}
          disabled={submitting}
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
    const finalScore = Math.round((correctCount / items.length) * 100);
    const finalStars = finalScore === 100 ? 3 : finalScore >= 70 ? 2 : 1;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in duration-500 px-6">
        <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <Trophy size={54} className="text-yellow-600" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">
            {finalScore >= 80 ? "Phân loại xuất sắc!" : "Hoàn thành bài tập!"}
          </h2>
          <p className="text-xl text-gray-600">
            Bạn đã thả đúng {correctCount} / {items.length} ký hiệu vào giỏ
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

        {submitError && <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 font-bold text-red-700">{submitError}</div>}

        <button
          onClick={initGame}
          className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-xl hover:bg-primary-700 transition-colors shadow-lg disabled:opacity-50"
        >
          <RotateCcw size={24} /> Chơi lại lần nữa
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
          Quan sát ký hiệu và chạm vào chiếc giỏ đúng để thả vào.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                idx === currentItemIndex
                  ? "bg-primary-600 scale-125 ring-2 ring-primary-200"
                  : idx < currentItemIndex
                  ? "bg-emerald-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-primary-700">
          Ký hiệu {currentItemIndex + 1} / {items.length}
        </span>
      </div>

      {/* Current Sign Card to Drop */}
      <div
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/plain", String(currentItem.id))}
        className="relative mx-auto w-full max-w-sm aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-xl border-4 border-white flex items-center justify-center transition-all duration-300 cursor-grab active:cursor-grabbing"
      >
        {currentItem.media.media_type === "image" ? (
          <img
            src={currentItem.media.source_url}
            alt={currentItem.label}
            className="w-full h-full object-contain"
          />
        ) : (
          <VideoPlayer
            videoUrl={currentItem.media.source_url}
            autoPlay
            loop
            showControls={false}
            className="w-full h-full"
          />
        )}

        {/* Label banner */}
        <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-xl py-1.5 px-3 text-center text-white font-bold text-sm">
          {currentItem.label}
        </div>
      </div>

      {/* Buckets Row */}
      <div className="grid grid-cols-2 gap-6 pt-4">
        {buckets.map((bucket, idx) => {
          const colorCfg = BUCKET_COLORS[idx % BUCKET_COLORS.length];
          const isTargeted = droppedBucketId === bucket.id;

          return (
            <div
              key={bucket.id}
              onClick={() => handleDropIntoBucket(bucket.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); handleDropIntoBucket(bucket.id); }}
              className={`relative flex flex-col items-center justify-between p-6 min-h-[180px] rounded-3xl border-4 transition-all duration-300 cursor-pointer shadow-md select-none ${
                colorCfg.light
              } ${
                isTargeted
                  ? feedback === "correct"
                    ? "border-emerald-500 scale-105 ring-4 ring-emerald-200"
                    : "border-red-500 ring-4 ring-red-200 animate-shake"
                  : `${colorCfg.border} hover:scale-102 hover:shadow-xl`
              }`}
            >
              {/* Basket Icon */}
              <div className="text-6xl mb-2">🧺</div>

              {/* Bucket Label */}
              <div
                className={`w-full py-3 px-4 rounded-2xl text-white font-black text-xl text-center shadow ${colorCfg.bg}`}
              >
                {bucket.label}
              </div>

              {/* Feedback Emoji */}
              {isTargeted && (
                <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center text-7xl animate-in zoom-in">
                  {feedback === "correct" ? "😊" : "😢"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
