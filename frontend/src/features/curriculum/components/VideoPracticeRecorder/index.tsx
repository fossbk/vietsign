"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, Camera, StopCircle, RotateCcw, CheckCircle, UploadCloud, ArrowLeft, ArrowRight } from "lucide-react";
import { VideoPlayer } from "@/shared/components/common/VideoPlayer";
import CurriculumModel, { CurriculumActivity, CurriculumMedia } from "@/domain/entities/Curriculum";
import { uploadFile } from "@/services/uploadService";
import { getMediaLabel } from "../gameUtils";

interface VideoPracticeRecorderProps {
  activityCode: string;
  onComplete?: () => void;
}

export const VideoPracticeRecorder: React.FC<VideoPracticeRecorderProps> = ({
  activityCode,
  onComplete,
}) => {
  const [activity, setActivity] = useState<CurriculumActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample media to mimic
  const [sampleMedia, setSampleMedia] = useState<CurriculumMedia | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Submitting states
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoLiveRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    setIsSubmitted(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setSampleIndex(0);
    setSubmitError(null);
    startTimeRef.current = Date.now();

    CurriculumModel.getActivityByCode(activityCode)
      .then((data) => {
        setActivity(data);
        if (data.media && data.media.length > 0) {
          setSampleMedia(data.media[0]);
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Không tải được bài tập quay video.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [activityCode]);

  useEffect(() => {
    loadData();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loadData]);

  useEffect(() => () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [recordedUrl]);

  useEffect(() => {
    const media = activity?.media?.[sampleIndex];
    if (media) setSampleMedia(media);
  }, [activity, sampleIndex]);

  // Start Camera Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false, // Deaf education focuses on visual sign gestures
      });
      streamRef.current = stream;

      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play();
      }

      const preferredMime = ["video/webm;codecs=vp9", "video/webm", "video/mp4"]
        .find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        // Stop camera tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Camera access error", err);
      alert("Không thể truy cập camera. Bạn hãy kiểm tra quyền truy cập camera trên trình duyệt nhé!");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Re-record
  const handleResetRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  // Submit to Teacher
  const handleSubmit = async () => {
    if (!activity || !recordedBlob || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const extension = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([recordedBlob], `${activity.activity_code}-${Date.now()}.${extension}`, {
        type: recordedBlob.type || `video/${extension}`,
      });
      const submissionVideoUrl = await uploadFile(file, "others");
      if (!submissionVideoUrl) throw new Error("Upload không trả về đường dẫn video");

      await CurriculumModel.submitProgress(activity.activity_id, {
        score: 0,
        stars: 0,
        durationSeconds,
        isCompleted: true,
        submissionVideoUrl,
        gameResultDetails: {
          recordingDurationSeconds: recordingSeconds,
          blobSize: recordedBlob.size,
          sampleMediaId: sampleMedia?.media_id,
          submittedAt: new Date().toISOString(),
        },
      });
      setIsSubmitted(true);
      onComplete?.();
    } catch (err) {
      console.error("Failed to submit video practice", err);
      setSubmitError("Không thể tải video lên hoặc lưu bài nộp. Video vẫn còn trên màn hình để bạn thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="text-gray-500 font-medium text-lg">Đang chuẩn bị phòng quay video...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không tải được bài tập</h2>
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

  // ─────────────────────────────────────────────
  // COMPLETED SCREEN
  // ─────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in duration-500 px-6">
        <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle size={64} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">Đã nộp bài thành công!</h2>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            Video thực hành cử chỉ tay của bạn đã được gửi tới giáo viên để chấm và nhận xét.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-xl hover:bg-primary-700 transition-colors shadow-lg"
        >
          <RotateCcw size={24} /> Quay video bài khác
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
          Quan sát video mẫu bên trái và quay video bạn thực hiện lại ký hiệu bên phải.
        </p>
      </div>

      {/* Dual Screen: Sample (Left) vs Camera/Recording (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Sample Video */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1. Video mẫu
            </span>
            <span className="text-xs font-semibold text-primary-600">Xem và làm theo</span>
          </div>

          <div className="relative aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-md border-4 border-white">
            {sampleMedia ? (
              sampleMedia.media_type === "image" ? (
                <img
                  src={sampleMedia.source_url}
                  alt="Mẫu"
                  className="w-full h-full object-contain"
                />
              ) : (
                <VideoPlayer
                  videoUrl={sampleMedia.source_url}
                  autoPlay
                  loop
                  showControls
                  className="w-full h-full"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Chưa có video mẫu
              </div>
            )}
          </div>
          {(activity.media?.length || 0) > 1 && (
            <div className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2">
              <button type="button" disabled={sampleIndex === 0} onClick={() => setSampleIndex((index) => Math.max(0, index - 1))} className="rounded-lg p-2 disabled:opacity-30"><ArrowLeft size={18} /></button>
              <span className="text-sm font-bold">Mẫu {sampleIndex + 1}/{activity.media.length}: {sampleMedia ? getMediaLabel(activity, sampleMedia, sampleIndex) : ""}</span>
              <button type="button" disabled={sampleIndex >= activity.media.length - 1} onClick={() => setSampleIndex((index) => Math.min(activity.media.length - 1, index + 1))} className="rounded-lg p-2 disabled:opacity-30"><ArrowRight size={18} /></button>
            </div>
          )}
        </div>

        {/* Right: Camera / Recorded Video */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              2. Bạn thực hành
            </span>
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Đang quay: {recordingSeconds}s
              </span>
            )}
          </div>

          <div className="relative aspect-video bg-gray-950 rounded-3xl overflow-hidden shadow-md border-4 border-white flex items-center justify-center">
            {/* Live Camera View */}
            <video
              ref={videoLiveRef}
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${
                isRecording ? "block" : "hidden"
              }`}
            />

            {/* Playback of Recorded Video */}
            {recordedUrl && !isRecording && (
              <video
                src={recordedUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Idle Placeholder */}
            {!isRecording && !recordedUrl && (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <Camera size={32} />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  Nhấn nút đỏ bên dưới để bật camera và bắt đầu quay video
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recording & Submit Action Bar */}
      {submitError && <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">{submitError}</div>}

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-center gap-4">
        {!isRecording && !recordedUrl && (
          <button
            onClick={startRecording}
            className="w-full md:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg hover:scale-102 transition-all"
          >
            <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
            Bắt đầu quay video
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="w-full md:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg hover:scale-102 transition-all animate-pulse"
          >
            <StopCircle size={24} className="text-red-500" />
            Dừng quay ({recordingSeconds}s)
          </button>
        )}

        {recordedUrl && !isRecording && (
          <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
            <button
              onClick={handleResetRecording}
              disabled={submitting}
              className="w-full md:w-auto px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={20} /> Quay lại
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full md:w-auto flex-1 max-w-md px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg hover:scale-102 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={24} className="animate-spin" /> Đang nộp bài...
                </>
              ) : (
                <>
                  <UploadCloud size={24} /> Nộp bài cho giáo viên
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
