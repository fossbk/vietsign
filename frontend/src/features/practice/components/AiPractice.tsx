"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Camera, Sparkles } from "lucide-react";
import { useCamera, useAiCheck } from "./shared";

export function AiPractice() {
  const router = useRouter();

  const { isCameraOn, cameraRef, startCamera, stopCamera } = useCamera();
  const { isAiProcessing, aiRecognizedWord, checkSignWithAI, resetAiResult } =
    useAiCheck();

  const handleBack = () => {
    stopCamera();
    resetAiResult();
    router.push("/practice");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Luyện tập Tự do
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                AI Pro
              </span>
            </h2>
            <p className="text-gray-600">
              Thực hiện ký hiệu và AI sẽ nhận diện
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - AI Recognition result */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Kết quả nhận diện
          </h3>

          <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl text-center min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden">
            {isAiProcessing ? (
              <>
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Đang nhận diện...</p>
              </>
            ) : aiRecognizedWord ? (
              <>
                <Sparkles className="w-12 h-12 text-purple-500 mb-4 animate-bounce" />
                <p className="text-3xl font-bold text-purple-700 mb-2">
                  {aiRecognizedWord}
                </p>
                <p className="text-sm text-gray-500">
                  Ký hiệu đã được nhận diện
                </p>
              </>
            ) : (
              <>
                <Brain className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Thực hiện ký hiệu trước camera</p>
                <p className="text-sm text-gray-400">
                  Kết quả sẽ hiển thị ở đây
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => checkSignWithAI("", "free", isCameraOn, cameraRef)}
            disabled={!isCameraOn || isAiProcessing}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Sparkles size={18} />
            {isAiProcessing ? "Đang xử lý..." : "Nhận diện ký hiệu ngay"}
          </button>
        </div>

        {/* Right - Camera */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-900">Camera</span>
            </div>
            <button
              onClick={isCameraOn ? stopCamera : startCamera}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                isCameraOn
                  ? "text-red-600 hover:bg-red-50"
                  : "text-purple-600 hover:bg-purple-50"
              }`}
            >
              {isCameraOn ? "Tắt camera" : "Bật camera"}
            </button>
          </div>
          <div className="aspect-video bg-gray-900 relative">
            {isCameraOn ? (
              <video
                ref={cameraRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <Brain className="w-16 h-16 mb-4 opacity-50" />
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl"
                >
                  Bật camera
                </button>
              </div>
            )}
          </div>
          <div className="p-4 bg-purple-50 mt-auto">
            <p className="text-sm text-purple-700 text-center">
              💡 Đặt tay trong khung hình và thực hiện ký hiệu rõ ràng
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
