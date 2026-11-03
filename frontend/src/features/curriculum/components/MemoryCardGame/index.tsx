"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, Trophy, CheckCircle, Brain } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";
import { getMediaLabel, shuffle } from "../gameUtils";

interface MemoryCardGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface MemoryCard {
  uniqueId: number;
  pairId: number;
  type: "media" | "text";
  media?: CurriculumMedia;
  text?: string;
}

export const MemoryCardGame: React.FC<MemoryCardGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const initGame = useCallback(() => {
    setLoading(true);
    setError(null);
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setIsFinished(false);
    setSubmitError(null);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const mediaList = (data.media || []).slice(0, 6); // Max 6 pairs (12 cards) for young children

        const generatedCards: MemoryCard[] = [];
        mediaList.forEach((m, idx) => {
          // Card 1: Media (sign video/image)
          generatedCards.push({
            uniqueId: idx * 2,
            pairId: m.media_id,
            type: "media",
            media: m,
          });
          // Card 2: Word text
          generatedCards.push({
            uniqueId: idx * 2 + 1,
            pairId: m.media_id,
            type: "text",
            text: getMediaLabel(data, m, idx),
          });
        });

        // Shuffle cards
        setCards(shuffle(generatedCards));
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được trò chơi lật thẻ.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (index: number) => {
    // If already 2 cards flipped, or card already matched, or card already flipped: ignore
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    const clickedCard = cards[index];
    if (matchedPairIds.includes(clickedCard.pairId)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // Match found!
        const nextMatched = [...matchedPairIds, firstCard.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedIndices([]);

        // Check if all pairs matched
        const totalPairs = cards.length / 2;
        if (nextMatched.length === totalPairs) {
          handleAllMatched(totalPairs);
        }
      } else {
        // No match - wait 1 second and flip back
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1100);
      }
    }
  };

  const handleAllMatched = async (totalPairs: number) => {
    setIsFinished(true);
    setSubmitting(true);

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const score = 100;
    const stars = 3;

    if (activity) {
      try {
        await CurriculumModel.submitProgress(activity.activity_id, {
          score,
          stars,
          durationSeconds,
          isCompleted: true,
          gameResultDetails: {
            moves: moves + 1,
            totalPairs,
          },
        });
        onComplete?.();
      } catch (err) {
        console.error("Failed to submit memory card progress", err);
        setSubmitError("Đã tìm đủ cặp nhưng chưa lưu được tiến độ. Hãy kiểm tra kết nối.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang xáo trộn các thẻ bài...</p>
      </div>
    );
  }

  if (error || !activity || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không có thẻ bài</h2>
        <p className="text-gray-500">{error || "Hoạt động này chưa có danh sách ký hiệu để lật thẻ."}</p>
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

  const totalPairs = cards.length / 2;

  // ─────────────────────────────────────────────
  // COMPLETED SCREEN
  // ─────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in duration-500 px-6">
        <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <Trophy size={54} className="text-yellow-600" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">Trí nhớ tuyệt vời!</h2>
          <p className="text-xl text-gray-600">
            Bạn đã tìm được tất cả {totalPairs} cặp thẻ trong {moves} lượt lật
          </p>
        </div>

        <div className="flex gap-3 text-4xl">⭐⭐⭐</div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-4">
          <div className="text-gray-500 text-sm mb-1">Điểm số</div>
          <div className="text-5xl font-black text-primary-600">100</div>
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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          Lật từng cặp thẻ để tìm ký hiệu và từ tương ứng trùng nhau.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase">Lượt lật</span>
            <div className="text-xl font-black text-gray-800">{moves}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase">Đã tìm thấy</span>
            <div className="text-xl font-black text-emerald-600">
              {matchedPairIds.length} / {totalPairs} cặp
            </div>
          </div>
        </div>

        <button
          onClick={initGame}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
        >
          <RotateCcw size={16} /> Chơi lại
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        {cards.map((card, idx) => {
          const isFlipped = flippedIndices.includes(idx) || matchedPairIds.includes(card.pairId);
          const isMatched = matchedPairIds.includes(card.pairId);

          return (
            <div
              key={card.uniqueId}
              onClick={() => handleCardClick(idx)}
              className="relative aspect-[4/3] cursor-pointer select-none"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Back of card (Face Down) */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md border-4 border-white flex items-center justify-center hover:scale-102 transition-transform"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Brain size={36} className="text-white opacity-40" />
                </div>

                {/* Front of card (Face Up) */}
                <div
                  className={`absolute inset-0 rounded-2xl overflow-hidden shadow-lg border-4 flex items-center justify-center p-2 ${
                    isMatched
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-primary-300 bg-white"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {card.type === "media" && card.media ? (
                    card.media.media_type === "image" ? (
                      <img
                        src={card.media.source_url}
                        alt="card"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <VideoPlayer
                        videoUrl={card.media.source_url}
                        autoPlay={isFlipped}
                        loop
                        showControls={false}
                        className="w-full h-full"
                      />
                    )
                  ) : (
                    <span className="text-lg md:text-xl font-black text-center text-primary-900 break-words px-2">
                      {card.text}
                    </span>
                  )}

                  {/* Matched check badge */}
                  {isMatched && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow">
                      <CheckCircle size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
