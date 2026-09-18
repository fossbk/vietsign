"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, Trophy, CheckCircle, ArrowRight, X } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";

interface SequenceOrderGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface SequenceCard {
  id: number;
  correctIndex: number;
  label: string;
  media?: CurriculumMedia;
}

export const SequenceOrderGame: React.FC<SequenceOrderGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cards, setCards] = useState<SequenceCard[]>([]);
  // Tray cards currently available to pick
  const [trayCardIds, setTrayCardIds] = useState<number[]>([]);
  // Slot placements: slot index (0..N-1) -> cardId or null
  const [slotPlacements, setSlotPlacements] = useState<(number | null)[]>([]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const initGame = useCallback(() => {
    setLoading(true);
    setError(null);
    setIsSubmitted(false);
    setScore(0);
    setStars(0);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const mediaList = data.media || [];
        const count = Math.min(mediaList.length, 5); // 3 to 5 items in sequence for young children

        const seqCards: SequenceCard[] = mediaList.slice(0, count).map((m, idx) => ({
          id: m.media_id,
          correctIndex: idx,
          label: m.media_code || `Bước ${idx + 1}`,
          media: m,
        }));

        setCards(seqCards);
        // Shuffle tray
        const shuffledIds = seqCards.map((c) => c.id).sort(() => Math.random() - 0.5);
        setTrayCardIds(shuffledIds);
        setSlotPlacements(new Array(seqCards.length).fill(null));
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được trò chơi sắp xếp.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Place card from tray into first available empty slot
  const handleTrayCardClick = (cardId: number) => {
    if (isSubmitted) return;
    const firstEmptyIdx = slotPlacements.findIndex((p) => p === null);
    if (firstEmptyIdx === -1) return; // all slots filled

    setSlotPlacements((prev) => {
      const next = [...prev];
      next[firstEmptyIdx] = cardId;
      return next;
    });
    setTrayCardIds((prev) => prev.filter((id) => id !== cardId));
  };

  // Remove card from slot and return to tray
  const handleSlotClick = (slotIdx: number) => {
    if (isSubmitted) return;
    const cardId = slotPlacements[slotIdx];
    if (cardId === null) return;

    setSlotPlacements((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setTrayCardIds((prev) => [...prev, cardId]);
  };

  // Check answers
  const handleCheck = async () => {
    if (!activity || isSubmitted || submitting) return;

    let correctCount = 0;
    const total = cards.length;

    slotPlacements.forEach((cardId, slotIdx) => {
      const card = cards.find((c) => c.id === cardId);
      if (card && card.correctIndex === slotIdx) {
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

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await CurriculumModel.submitProgress(activity.activity_id, {
        score: calculatedScore,
        stars: calculatedStars,
        durationSeconds,
        isCompleted,
        gameResultDetails: {
          totalItems: total,
          correctPlacements: correctCount,
          slotPlacements,
        },
      });
      if (isCompleted) {
        onComplete?.();
      }
    } catch (err) {
      console.error("Failed to submit sequence order progress", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang tải trò chơi sắp xếp thứ tự...</p>
      </div>
    );
  }

  if (error || !activity || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không có dữ liệu</h2>
        <p className="text-gray-500">{error || "Hoạt động này chưa có danh sách ký hiệu để sắp xếp."}</p>
        <button
          onClick={initGame}
          className="mt-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors text-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const allSlotsFilled = slotPlacements.every((p) => p !== null);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          Chạm vào các thẻ bên dưới để sắp xếp theo đúng thứ tự từ trái sang phải.
        </p>
      </div>

      {/* Target Slots Row */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Thứ tự đúng:
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slotPlacements.map((cardId, slotIdx) => {
            const card = cards.find((c) => c.id === cardId);
            const isCorrect = isSubmitted && card?.correctIndex === slotIdx;
            const isWrong = isSubmitted && card && !isCorrect;

            return (
              <div
                key={slotIdx}
                onClick={() => handleSlotClick(slotIdx)}
                className={`relative aspect-[3/4] rounded-2xl border-4 transition-all duration-300 flex flex-col items-center justify-between p-2 cursor-pointer select-none ${
                  card
                    ? isWrong
                      ? "border-red-500 bg-red-50"
                      : isCorrect
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-primary-400 bg-white shadow-md hover:scale-102"
                    : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {/* Step number badge */}
                <div
                  className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                    isCorrect
                      ? "bg-emerald-500 text-white"
                      : "bg-primary-600 text-white"
                  }`}
                >
                  {slotIdx + 1}
                </div>

                {/* Card Content or Placeholder */}
                {card ? (
                  <>
                    <div className="w-full h-16 rounded-lg overflow-hidden bg-gray-900 pointer-events-none">
                      {card.media?.media_type === "image" ? (
                        <img
                          src={card.media.source_url}
                          alt="card"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <VideoPlayer
                          videoUrl={card.media?.source_url || ""}
                          autoPlay={false}
                          loop
                          showControls={false}
                          className="w-full h-full"
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-800 text-center truncate w-full">
                      {card.label}
                    </span>

                    {/* Result icon */}
                    {isSubmitted && (
                      <div className="text-xl">
                        {isCorrect ? "😊" : "😢"}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-400">Trống</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Tray Cards */}
      <div className="bg-primary-50/50 p-6 rounded-3xl border border-primary-100 space-y-3">
        <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
          Chọn thẻ để đặt vào hàng trên:
        </h3>
        <div className="flex flex-wrap gap-4 min-h-[120px] items-center justify-center">
          {trayCardIds.length === 0 ? (
            <p className="text-gray-400 text-sm font-medium">Đã xếp hết tất cả các thẻ.</p>
          ) : (
            trayCardIds.map((cardId) => {
              const card = cards.find((c) => c.id === cardId);
              if (!card) return null;

              return (
                <div
                  key={card.id}
                  onClick={() => handleTrayCardClick(card.id)}
                  className="w-28 p-2 rounded-2xl bg-white border-2 border-primary-200 hover:border-primary-500 hover:scale-105 shadow transition-all cursor-pointer select-none flex flex-col items-center gap-1.5"
                >
                  <div className="w-full h-16 rounded-xl overflow-hidden bg-gray-900 pointer-events-none">
                    {card.media?.media_type === "image" ? (
                      <img
                        src={card.media.source_url}
                        alt="card"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <VideoPlayer
                        videoUrl={card.media?.source_url || ""}
                        autoPlay={false}
                        loop
                        showControls={false}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-800 truncate w-full text-center">
                    {card.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Evaluation Banner */}
      {isSubmitted && (
        <div
          className={`p-6 rounded-3xl border-2 text-center animate-in zoom-in duration-300 ${
            score >= 80 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="text-4xl mb-2">{score >= 80 ? "🎉" : "💪"}</div>
          <h4 className="text-2xl font-black text-gray-900 mb-1">
            {score === 100 ? "Tuyệt vời! Đúng thứ tự!" : score >= 80 ? "Rất tốt!" : "Chưa đúng thứ tự!"}
          </h4>
          <p className="text-gray-600 font-medium">
            Điểm số: <span className="font-black text-primary-600 text-xl">{score}</span> / 100
          </p>
          <div className="flex justify-center gap-2 text-3xl my-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? "text-yellow-400" : "text-gray-300"}>
                ⭐
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {!isSubmitted ? (
        <button
          onClick={handleCheck}
          disabled={!allSlotsFilled || submitting}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300 ${
            allSlotsFilled && !submitting
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg scale-101"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {allSlotsFilled ? (
            <>
              <CheckCircle size={26} /> Kiểm tra thứ tự
            </>
          ) : (
            `Còn ${slotPlacements.filter((p) => p === null).length} ô trống cần điền`
          )}
        </button>
      ) : (
        <button
          onClick={initGame}
          className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all"
        >
          <RotateCcw size={24} /> Sắp xếp lại từ đầu
        </button>
      )}
    </div>
  );
};
