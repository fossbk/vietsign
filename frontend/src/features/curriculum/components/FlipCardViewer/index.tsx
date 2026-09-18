"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle, Loader2, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────
interface FlipCardViewerProps {
  /** activity_code dạng "L1.BT.01.T01" */
  activityCode: string;
  /** Callback khi học sinh hoàn thành và bài đã được submit */
  onComplete?: () => void;
}

// ─────────────────────────────────────────────
// ZOOM LENS LEVELS
// ─────────────────────────────────────────────
const ZOOM_LEVELS = [1, 1.5, 2, 2.5];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

// ─────────────────────────────────────────────
// SINGLE FLIP CARD (front = media, back = label)
// ─────────────────────────────────────────────
interface SingleCardProps {
  media: CurriculumMedia;
  label: string;            // media_code, e.g. "L1.BT.01.V01"
  isFlipped: boolean;
  zoomLevel: number;
  onFlip: () => void;
}

const SingleCard: React.FC<SingleCardProps> = ({ media, label, isFlipped, zoomLevel, onFlip }) => {
  return (
    <div
      className="relative mx-auto cursor-pointer select-none"
      style={{ width: 320, height: 260, perspective: "1000px" }}
      onClick={onFlip}
      aria-label={isFlipped ? `Ẩn thẻ ${label}` : `Lật xem thẻ ${label}`}
      role="button"
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ─── MẶT TRƯỚC: Media (video / ảnh) ─── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden bg-gray-900 shadow-xl border-4 border-primary-200 flex items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Zoom wrapper */}
          <div
            className="w-full h-full transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {media.media_type === "image" ? (
              <img
                src={media.source_url}
                alt={label}
                className="w-full h-full object-contain"
              />
            ) : (
              <VideoPlayer
                videoUrl={media.source_url}
                autoPlay={isFlipped}
                loop
                showControls={isFlipped}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Nhãn góc */}
          <div className="absolute top-2 left-2 bg-primary-600/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {media.media_type === "video" ? "📹 Video" : "🖼️ Ảnh"}
          </div>

          {/* Chỉ dẫn lật — visual cue cho trẻ */}
          {!isFlipped && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-700/80 to-transparent px-4 py-3 flex items-center justify-center gap-2">
              <span className="text-white text-sm font-bold animate-pulse">👆 Nhấn để lật thẻ</span>
            </div>
          )}
        </div>

        {/* ─── MẶT SAU: Nhãn / Ý nghĩa ─── */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl border-4 border-emerald-300 flex flex-col items-center justify-center gap-4"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="text-6xl">✅</div>
          <div className="text-white text-2xl font-black text-center px-4">{label}</div>
          <p className="text-emerald-100 text-sm">Nhấn để xem lại video</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PROGRESS DOTS — visual cue cho trẻ
// ─────────────────────────────────────────────
interface ProgressDotsProps {
  total: number;
  seen: Set<number>;
  current: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ total, seen, current }) => (
  <div className="flex flex-wrap justify-center gap-2 px-4">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
          i === current
            ? "border-primary-600 bg-primary-600 scale-125 shadow-lg"
            : seen.has(i)
            ? "border-emerald-500 bg-emerald-400"
            : "border-gray-300 bg-gray-100"
        }`}
        aria-label={seen.has(i) ? `Thẻ ${i + 1} đã xem` : `Thẻ ${i + 1} chưa xem`}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export const FlipCardViewer: React.FC<FlipCardViewerProps> = ({ activityCode, onComplete }) => {
  // ── Data state
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Viewer state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [seenCards, setSeenCards] = useState<Set<number>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(0); // index into ZOOM_LEVELS
  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  // ── Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Timer (durationSeconds)
  const startTimeRef = useRef<number>(Date.now());

  // ── Fetch activity + media
  useEffect(() => {
    setLoading(true);
    setError(null);
    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        setSeenCards(new Set());
        setCurrentIndex(0);
        setIsFlipped(false);
        startTimeRef.current = Date.now();
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được bài học.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  const cards = activity?.media ?? [];
  const totalCards = cards.length;
  const allSeen = seenCards.size >= totalCards && totalCards > 0;

  // ── Mark card as seen when flipped
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => {
      const next = !prev;
      // Mark as seen when flipping to front (= user watched, now flipping back)
      // Actually mark as seen when flipping to "back" (= user initiated flip, i.e. started viewing)
      if (!prev) {
        setSeenCards((s) => new Set(s).add(currentIndex));
      }
      return next;
    });
  }, [currentIndex]);

  // ── Navigate
  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setIsFlipped(false);
  }, []);

  const goPrev = () => currentIndex > 0 && goTo(currentIndex - 1);
  const goNext = () => currentIndex < totalCards - 1 && goTo(currentIndex + 1);

  // ── Zoom
  const zoomIn = () => setZoomIndex((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((z) => Math.max(z - 1, 0));

  // ── Submit (only when allSeen)
  const handleSubmit = async () => {
    if (!activity || !allSeen || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await CurriculumModel.submitProgress(activity.activity_id, {
        score: 100,
        stars: 3,
        durationSeconds,
        isCompleted: true,
        gameResultDetails: { totalCards, seenCards: seenCards.size },
      });
      setSubmitted(true);
      onComplete?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Không thể lưu kết quả.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang tải bài học...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────
  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không tải được bài học</h2>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors text-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // NO MEDIA
  // ─────────────────────────────────────────────
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="text-6xl">📭</div>
        <h2 className="text-xl font-bold text-gray-700">Bài học chưa có nội dung</h2>
        <p className="text-gray-500">Hoạt động này chưa có thẻ nào được thêm vào.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // COMPLETED SCREEN
  // ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in duration-500 px-6">
        <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
          <span className="text-6xl">🏆</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">Xuất sắc!</h2>
          <p className="text-xl text-gray-600">Bạn đã xem hết tất cả {totalCards} thẻ ký hiệu</p>
        </div>
        <div className="flex gap-3 text-4xl">⭐⭐⭐</div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-4">
          <div className="text-gray-500 text-sm mb-1">Điểm số</div>
          <div className="text-4xl font-black text-primary-600">100</div>
        </div>
        <button
          onClick={() => { setSubmitted(false); setSeenCards(new Set()); setCurrentIndex(0); setIsFlipped(false); startTimeRef.current = Date.now(); }}
          className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-xl hover:bg-primary-700 transition-colors"
        >
          <RotateCcw size={24} /> Xem lại từ đầu
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // ─────────────────────────────────────────────
  // MAIN VIEWER
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">

      {/* ── Header: title + lesson info */}
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
          {activity.lesson_code} • {activity.lesson_title}
        </p>
        <h2 className="text-2xl font-black text-gray-900">{activity.title}</h2>
        {activity.instruction && (
          <p className="text-gray-500 text-sm mt-1">{activity.instruction}</p>
        )}
      </div>

      {/* ── Controls: Zoom + card counter */}
      <div className="flex items-center justify-between">
        {/* Zoom buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={zoomIndex === 0}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            aria-label="Thu nhỏ"
          >
            <ZoomOut size={20} className="text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-500 w-10 text-center">{zoomLevel}x</span>
          <button
            onClick={zoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            aria-label="Phóng to (Zoom lens)"
          >
            <ZoomIn size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Card counter */}
        <div className="bg-primary-50 px-4 py-2 rounded-full border border-primary-100">
          <span className="text-primary-700 font-bold text-lg">
            {currentIndex + 1} / {totalCards}
          </span>
        </div>

        {/* Placeholder for symmetry */}
        <div className="w-[108px]" />
      </div>

      {/* ── FLIP CARD */}
      <SingleCard
        media={currentCard}
        label={currentCard.media_code}
        isFlipped={isFlipped}
        zoomLevel={zoomLevel}
        onFlip={handleFlip}
      />

      {/* ── Navigation: Prev / Next */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors text-lg min-w-[120px] justify-center"
        >
          <ArrowLeft size={22} /> Trước
        </button>

        {/* ── Flip toggle button (large — dễ bấm cho trẻ) */}
        <button
          onClick={handleFlip}
          className="flex-1 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-xl shadow-md transition-colors"
        >
          {isFlipped ? "🙈 Úp thẻ" : "👀 Lật thẻ"}
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex === totalCards - 1}
          className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors text-lg min-w-[120px] justify-center"
        >
          Tiếp <ArrowRight size={22} />
        </button>
      </div>

      {/* ── Progress dots: visual cue số thẻ đã xem */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-gray-500">Đã xem:</span>
          <span className={`font-bold ${allSeen ? "text-emerald-600" : "text-primary-600"}`}>
            {seenCards.size} / {totalCards} thẻ {allSeen && "✅"}
          </span>
        </div>
        <ProgressDots total={totalCards} seen={seenCards} current={currentIndex} />
      </div>

      {/* ── Submit error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-600 text-sm font-medium">{submitError}</p>
        </div>
      )}

      {/* ── Complete button: disabled until allSeen */}
      <button
        onClick={handleSubmit}
        disabled={!allSeen || submitting}
        className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300 ${
          allSeen && !submitting
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg scale-[1.02]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {submitting ? (
          <><Loader2 size={24} className="animate-spin" /> Đang lưu...</>
        ) : allSeen ? (
          <><CheckCircle size={26} /> Hoàn thành bài học!</>
        ) : (
          <>🔒 Xem hết {totalCards - seenCards.size} thẻ còn lại để hoàn thành</>
        )}
      </button>
    </div>
  );
};
