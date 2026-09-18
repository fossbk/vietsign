"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RotateCcw, CheckCircle, Trophy, Eye, EyeOff } from "lucide-react";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";

interface JigsawPuzzleGameProps {
  activityCode: string;
  onComplete?: () => void;
}

// 2x2 = 4 pieces for Grade 1 elementary children
const GRID_SIZE = 2; // 2x2
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;

interface PuzzlePiece {
  id: number; // original index 0..3
  currentPos: number; // position on grid 0..3
}

export const JigsawPuzzleGame: React.FC<JigsawPuzzleGameProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Target image to assemble
  const [imageUrl, setImageUrl] = useState<string>("");

  // Pieces array
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  // Ghost / Reference preview toggle
  const [showPreview, setShowPreview] = useState(false);

  // Status
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Initialize shuffled pieces
  const initGame = useCallback((srcImage: string) => {
    setImageUrl(srcImage);
    setMoves(0);
    setSelectedPieceId(null);
    setIsCompleted(false);
    startTimeRef.current = Date.now();

    // Create shuffled positions different from solved state
    let positions = Array.from({ length: TOTAL_PIECES }, (_, i) => i);
    // Fisher-Yates shuffle until at least 2 pieces are out of place
    do {
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
    } while (positions.every((pos, idx) => pos === idx));

    const initialPieces: PuzzlePiece[] = Array.from({ length: TOTAL_PIECES }, (_, id) => ({
      id,
      currentPos: positions[id],
    }));

    setPieces(initialPieces);
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        const media = data.media?.[0];
        const src = media?.source_url || "/images/puzzle-default.png";
        initGame(src);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được trò chơi ghép hình.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode, initGame]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click to swap pieces
  const handlePieceClick = async (pieceId: number) => {
    if (isCompleted || submitting) return;

    if (selectedPieceId === null) {
      setSelectedPieceId(pieceId);
    } else if (selectedPieceId === pieceId) {
      setSelectedPieceId(null); // deselect
    } else {
      // Swap positions between selectedPiece and clicked piece
      setPieces((prev) => {
        const pieceA = prev.find((p) => p.id === selectedPieceId);
        const pieceB = prev.find((p) => p.id === pieceId);
        if (!pieceA || !pieceB) return prev;

        const posA = pieceA.currentPos;
        const posB = pieceB.currentPos;

        const updated = prev.map((p) => {
          if (p.id === pieceA.id) return { ...p, currentPos: posB };
          if (p.id === pieceB.id) return { ...p, currentPos: posA };
          return p;
        });

        // Check if solved
        const solved = updated.every((p) => p.id === p.currentPos);
        if (solved) {
          handleSolved();
        }

        return updated;
      });

      setMoves((m) => m + 1);
      setSelectedPieceId(null);
    }
  };

  const handleSolved = async () => {
    setIsCompleted(true);
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
            gridSize: GRID_SIZE,
          },
        });
        onComplete?.();
      } catch (err) {
        console.error("Failed to submit jigsaw progress", err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang chuẩn bị các mảnh ghép...</p>
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

  // Find which piece is currently occupying grid slot `slotIdx`
  const getPieceAtPos = (slotIdx: number) => {
    return pieces.find((p) => p.currentPos === slotIdx);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          Chạm vào 2 mảnh ghép bất kỳ để đổi vị trí cho nhau và hoàn thành bức tranh.
        </p>
      </div>

      {/* Action and stats bar */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Số bước:</span>
          <span className="font-bold text-primary-600 text-lg">{moves}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Hint preview button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
              showPreview
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? "Ẩn mẫu" : "Xem mẫu"}
          </button>

          <button
            onClick={() => initGame(imageUrl)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <RotateCcw size={16} /> Xếp lại
          </button>
        </div>
      </div>

      {/* Main Puzzle Board (360x360 or 400x400) */}
      <div className="relative mx-auto w-[360px] h-[360px] md:w-[420px] md:h-[420px] bg-gray-100 p-2 rounded-3xl border-4 border-primary-200 shadow-xl overflow-hidden">
        {/* Ghost Reference Image Overlay */}
        {showPreview && (
          <div className="absolute inset-2 z-30 rounded-2xl overflow-hidden pointer-events-none opacity-90 border-4 border-primary-500 animate-in fade-in">
            <img src={imageUrl} alt="Mẫu" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Bức tranh mẫu
            </div>
          </div>
        )}

        {/* 2x2 Grid Slots */}
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
          {Array.from({ length: TOTAL_PIECES }).map((_, slotIdx) => {
            const piece = getPieceAtPos(slotIdx);
            if (!piece) return <div key={slotIdx} className="bg-gray-200 rounded-2xl" />;

            const isSelected = selectedPieceId === piece.id;
            const isCorrectPos = piece.id === piece.currentPos;

            // Calculate background position based on piece original id (row, col)
            // 0 -> (0, 0), 1 -> (100%, 0), 2 -> (0, 100%), 3 -> (100%, 100%)
            const row = Math.floor(piece.id / GRID_SIZE);
            const col = piece.id % GRID_SIZE;
            const bgPosX = col === 0 ? "0%" : "100%";
            const bgPosY = row === 0 ? "0%" : "100%";

            return (
              <div
                key={`slot-${slotIdx}`}
                onClick={() => handlePieceClick(piece.id)}
                className={`relative w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-4 ${
                  isSelected
                    ? "border-primary-600 ring-4 ring-primary-300 scale-95 shadow-xl"
                    : isCorrectPos
                    ? "border-emerald-500 shadow-md"
                    : "border-white hover:border-primary-300 shadow-sm"
                }`}
              >
                {/* Crop piece from image using background-size 200% */}
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "200% 200%",
                    backgroundPosition: `${bgPosX} ${bgPosY}`,
                  }}
                />

                {/* Snap indicator */}
                {isCorrectPos && (
                  <div className="absolute top-1 right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow">
                    <CheckCircle size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Banner */}
      {isCompleted && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-3xl text-center space-y-3 animate-in zoom-in duration-300">
          <div className="text-5xl">🎉</div>
          <h3 className="text-3xl font-black text-gray-900">Chúc mừng bạn đã ghép xong!</h3>
          <p className="text-gray-600">
            Bạn đã hoàn thành bức tranh ký hiệu trong{" "}
            <span className="font-bold text-primary-600">{moves}</span> bước di chuyển.
          </p>
          <div className="flex justify-center gap-2 text-3xl my-2">⭐⭐⭐</div>
          <button
            onClick={() => initGame(imageUrl)}
            className="mt-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xl shadow-lg transition-all"
          >
            Chơi lại lần nữa
          </button>
        </div>
      )}
    </div>
  );
};
