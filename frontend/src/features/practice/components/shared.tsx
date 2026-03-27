"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, CameraOff, Sparkles, ThumbsUp, XCircle } from "lucide-react";
import { predictAiPractice } from "@/services/aiPracticeService";

// AI Check Result Type
export interface AiCheckResult {
  correct: boolean;
  confidence: number;
  message: string;
  recognized?: string;
}

// Custom hook for camera
export function useCamera() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { isCameraOn, cameraRef, startCamera, stopCamera };
}

// Custom hook for AI checking
export function useAiCheck() {
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<AiCheckResult | null>(null);
  const [aiRecognizedWord, setAiRecognizedWord] = useState<string>("");

  const captureFrameFromCamera = useCallback(
    (cameraRef: React.RefObject<HTMLVideoElement | null>): Promise<File> => {
      return new Promise((resolve, reject) => {
        const videoElement = cameraRef.current;

        if (!videoElement) {
          reject(new Error("Camera chưa sẵn sàng"));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Không thể tạo ảnh từ camera"));
          return;
        }

        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Không thể chụp khung hình"));
              return;
            }

            resolve(
              new File([blob], `practice-${Date.now()}.jpg`, {
                type: "image/jpeg",
              }),
            );
          },
          "image/jpeg",
          0.92,
        );
      });
    },
    [],
  );

  const checkSignWithAI = useCallback(
    async (
      target: string,
      type: "match" | "spell" | "free" = "match",
      isCameraOn: boolean,
      cameraRef: React.RefObject<HTMLVideoElement | null>,
    ) => {
      if (!isCameraOn) {
        alert("Vui lòng bật camera trước khi kiểm tra!");
        return;
      }

      setIsAiProcessing(true);
      setAiResult(null);
      setAiRecognizedWord("");

      try {
        const imageFile = await captureFrameFromCamera(cameraRef);
        const response = await predictAiPractice({
          file: imageFile,
          mode: type,
          targetText: target,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || "Không nhận được kết quả từ AI");
        }

        const recognized =
          response.data.action_name ||
          response.data.predicted_label ||
          "Không nhận diện rõ";

        if (type === "free") {
          setAiRecognizedWord(recognized);
        }

        const confidence = response.data.confidence || 0;
        const isCorrect =
          typeof response.data.is_match === "boolean"
            ? response.data.is_match
            : type === "free";

        const result: AiCheckResult = {
          correct: isCorrect,
          confidence,
          message: isCorrect
            ? "Tuyệt vời! Động tác rất chính xác."
            : "Chưa chính xác lắm. Hãy thử lại nhé!",
          recognized,
        };

        setAiResult(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Không thể kết nối AI";
        setAiResult({
          correct: false,
          confidence: 0,
          message,
          recognized: "Không rõ",
        });
      } finally {
        setIsAiProcessing(false);
      }
    },
    [captureFrameFromCamera],
  );

  const resetAiResult = () => {
    setAiResult(null);
    setAiRecognizedWord("");
  };

  return {
    isAiProcessing,
    aiResult,
    aiRecognizedWord,
    checkSignWithAI,
    resetAiResult,
    setAiResult,
  };
}

// AI Feedback Overlay Component
interface AiFeedbackOverlayProps {
  isProcessing: boolean;
  result: AiCheckResult | null;
  onClose: () => void;
}

export function AiFeedbackOverlay({
  isProcessing,
  result,
  onClose,
}: AiFeedbackOverlayProps) {
  if (isProcessing) {
    return (
      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
        <div className="w-16 h-16 border-4 border-white/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium animate-pulse">
          AI đang phân tích...
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
        <div
          className={`p-4 rounded-xl flex items-center gap-3 backdrop-blur-md border ${
            result.correct
              ? "bg-green-500/20 border-green-500/50"
              : "bg-red-500/20 border-red-500/50"
          }`}
        >
          {result.correct ? (
            <ThumbsUp className="w-8 h-8 text-green-400" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400" />
          )}
          <div className="flex-1">
            <h4
              className={`font-bold ${
                result.correct ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.correct ? "Chính xác!" : "Chưa đúng"}
            </h4>
            <p className="text-white text-sm">{result.message}</p>
            {result.correct && (
              <p className="text-green-400 text-xs mt-1">
                Độ chính xác: {(result.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full text-white/70"
          >
            <XCircle size={20} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Camera View Component
interface CameraViewProps {
  cameraRef: React.RefObject<HTMLVideoElement | null>;
  isCameraOn: boolean;
  startCamera: () => void;
  stopCamera: () => void;
  isAiProcessing: boolean;
  aiResult: AiCheckResult | null;
  onResetResult: () => void;
  onCheckAi: () => void;
  checkButtonText: string;
  accentColor?: "green" | "purple" | "blue";
  icon?: React.ReactNode;
}

export function CameraView({
  cameraRef,
  isCameraOn,
  startCamera,
  stopCamera,
  isAiProcessing,
  aiResult,
  onResetResult,
  onCheckAi,
  checkButtonText,
  accentColor = "green",
  icon,
}: CameraViewProps) {
  const colorClasses = {
    green: {
      icon: "text-green-600",
      button: "bg-green-600 hover:bg-green-700",
      toggle: isCameraOn
        ? "text-red-600 hover:bg-red-50"
        : "text-green-600 hover:bg-green-50",
      gradient:
        "from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700",
    },
    purple: {
      icon: "text-purple-600",
      button: "bg-purple-600 hover:bg-purple-700",
      toggle: isCameraOn
        ? "text-red-600 hover:bg-red-50"
        : "text-purple-600 hover:bg-purple-50",
      gradient:
        "from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
    },
    blue: {
      icon: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
      toggle: isCameraOn
        ? "text-red-600 hover:bg-red-50"
        : "text-blue-600 hover:bg-blue-50",
      gradient:
        "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className={`w-5 h-5 ${colors.icon}`} />
          <span className="font-medium text-gray-900">
            Thực hành & Chấm điểm
          </span>
        </div>
        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${colors.toggle}`}
        >
          {isCameraOn ? "Tắt camera" : "Bật camera"}
        </button>
      </div>
      <div className="aspect-video bg-gray-900 relative">
        {isCameraOn ? (
          <>
            <video
              ref={cameraRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <AiFeedbackOverlay
              isProcessing={isAiProcessing}
              result={aiResult}
              onClose={onResetResult}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            {icon || <CameraOff className="w-16 h-16 mb-4 opacity-50" />}
            <button
              onClick={startCamera}
              className={`px-6 py-2.5 text-white rounded-xl ${colors.button}`}
            >
              Bật camera
            </button>
          </div>
        )}
      </div>

      <div className="p-4 mt-auto">
        {isCameraOn ? (
          <button
            onClick={onCheckAi}
            disabled={isAiProcessing || !!aiResult}
            className={`w-full py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide`}
          >
            <Sparkles size={20} />
            {isAiProcessing
              ? "Đang chấm điểm..."
              : aiResult
              ? "Đã có kết quả"
              : checkButtonText}
          </button>
        ) : (
          <div className="p-3 bg-gray-50 text-gray-500 text-sm text-center rounded-xl">
            Bật camera để sử dụng tính năng chấm điểm AI
          </div>
        )}
      </div>
    </div>
  );
}
