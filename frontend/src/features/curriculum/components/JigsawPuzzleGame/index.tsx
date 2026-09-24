"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import { getMediaLabel, shuffle } from "../gameUtils";

interface JigsawPuzzleGameProps {
  activityCode: string;
  onComplete?: () => void;
}

interface PuzzlePiece {
  uniqueId: string;
  pairId: number;
  side: "media" | "label";
  label: string;
  media: CurriculumMedia;
}

export const JigsawPuzzleGame: React.FC<JigsawPuzzleGameProps> = ({ activityCode, onComplete }) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildPieces = useCallback((data: CurriculumActivity) => {
    const next = (data.media || []).slice(0, 6).flatMap((media, index) => {
      const label = getMediaLabel(data, media, index);
      return [
        { uniqueId: `${media.media_id}-media`, pairId: media.media_id, side: "media" as const, label, media },
        { uniqueId: `${media.media_id}-label`, pairId: media.media_id, side: "label" as const, label, media },
      ];
    });
    setPieces(shuffle(next));
    setSelected([]);
    setMatchedPairIds([]);
    setMoves(0);
    setFeedback(null);
    setSubmitError(null);
    startTimeRef.current = Date.now();
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        buildPieces(data);
      })
      .catch((err) => setError(err?.response?.data?.message || err?.message || "Không tải được trò ghép cặp."))
      .finally(() => setLoading(false));
  }, [activityCode, buildPieces]);

  useEffect(() => {
    loadData();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [loadData]);

  const completeGame = async (finalMoves: number, totalPairs: number) => {
    if (!activity || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await CurriculumModel.submitProgress(activity.activity_id, {
        score: 100,
        stars: 3,
        durationSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
        isCompleted: true,
        gameResultDetails: { moves: finalMoves, totalPairs },
      });
      onComplete?.();
    } catch (err) {
      console.error("Failed to submit pair puzzle progress", err);
      setSubmitError("Đã ghép xong nhưng chưa lưu được tiến độ. Hãy kiểm tra kết nối.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectPiece = (piece: PuzzlePiece) => {
    if (feedback || matchedPairIds.includes(piece.pairId) || selected.includes(piece.uniqueId)) return;
    if (selected.length === 0) {
      setSelected([piece.uniqueId]);
      return;
    }

    const first = pieces.find((item) => item.uniqueId === selected[0]);
    if (!first) return;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setSelected([first.uniqueId, piece.uniqueId]);

    const isMatch = first.pairId === piece.pairId && first.side !== piece.side;
    setFeedback(isMatch ? "correct" : "wrong");
    resetTimerRef.current = setTimeout(() => {
      if (isMatch) {
        const nextMatched = [...matchedPairIds, piece.pairId];
        setMatchedPairIds(nextMatched);
        const totalPairs = pieces.length / 2;
        if (nextMatched.length === totalPairs) void completeGame(nextMoves, totalPairs);
      }
      setSelected([]);
      setFeedback(null);
    }, isMatch ? 450 : 900);
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3"><Loader2 className="animate-spin" /> Đang chuẩn bị mảnh ghép...</div>;
  if (error || !activity || pieces.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={44} className="text-red-500" />
        <h2 className="text-xl font-black">Không có dữ liệu ghép cặp</h2>
        <p className="text-gray-500">{error || "Hoạt động chưa có media và nhãn tương ứng."}</p>
        <button onClick={loadData} className="rounded-xl bg-primary-600 px-5 py-3 font-bold text-white">Thử lại</button>
      </div>
    );
  }

  const finished = matchedPairIds.length === pieces.length / 2;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase text-gray-400">{activity.lesson_code} • {activity.lesson_title}</p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="mt-1 text-sm text-gray-500">Chọn một mảnh ký hiệu và một mảnh chữ/hình tương ứng để ghép thành cặp.</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border bg-white px-6 py-3">
        <span className="font-bold">Đã ghép: <b className="text-emerald-600">{matchedPairIds.length}/{pieces.length / 2}</b> • {moves} lượt</span>
        <button onClick={() => buildPieces(activity)} disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-bold"><RotateCcw size={16} /> Xếp lại</button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {pieces.map((piece) => {
          const isSelected = selected.includes(piece.uniqueId);
          const isMatched = matchedPairIds.includes(piece.pairId);
          return (
            <div
              key={piece.uniqueId}
              className={`relative min-h-44 rounded-2xl border-4 bg-white p-3 transition ${isMatched ? "border-emerald-500 opacity-60" : isSelected ? feedback === "wrong" ? "border-red-500" : "border-primary-500 ring-4 ring-primary-100" : "border-gray-200"}`}
            >
              {piece.side === "label" ? (
                <button onClick={() => selectPiece(piece)} className="flex h-full min-h-36 w-full items-center justify-center text-3xl font-black">{piece.label}</button>
              ) : (
                <div className="space-y-2">
                  <div className="h-28 overflow-hidden rounded-xl bg-gray-900">
                    {piece.media.media_type === "image" ? <img src={piece.media.source_url} alt={piece.label} className="h-full w-full object-contain" /> : <VideoPlayer videoUrl={piece.media.source_url} title={piece.label} autoPlay={false} showControls loop className="h-full w-full" />}
                  </div>
                  <button onClick={() => selectPiece(piece)} className="w-full rounded-lg bg-primary-50 py-2 font-bold text-primary-700">Chọn mảnh ký hiệu</button>
                </div>
              )}
              {isMatched && <CheckCircle className="absolute right-2 top-2 text-emerald-600" />}
            </div>
          );
        })}
      </div>

      {finished && <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center text-2xl font-black">🎉 Bạn đã ghép đúng tất cả các cặp!</div>}
      {submitError && <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">{submitError}</div>}
    </div>
  );
};
