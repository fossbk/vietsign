"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useCamera, useAiCheck, CameraView } from "./shared";

// Sample sentences for sentence practice
const sampleSentences = [
  {
    id: 1,
    sentence: "Xin chào, tôi tên là...",
    meaning: "Giới thiệu bản thân",
  },
  { id: 2, sentence: "Cảm ơn bạn rất nhiều", meaning: "Bày tỏ lòng biết ơn" },
  { id: 3, sentence: "Bạn khỏe không?", meaning: "Hỏi thăm sức khỏe" },
  {
    id: 4,
    sentence: "Tôi yêu gia đình",
    meaning: "Thể hiện tình cảm gia đình",
  },
  { id: 5, sentence: "Hẹn gặp lại ngày mai", meaning: "Tạm biệt hẹn gặp lại" },
  { id: 6, sentence: "Tôi đi học", meaning: "Nói về việc đi học" },
  { id: 7, sentence: "Bố mẹ tôi rất tốt", meaning: "Khen ngợi bố mẹ" },
  { id: 8, sentence: "Hôm nay trời đẹp", meaning: "Nói về thời tiết" },
  { id: 9, sentence: "Tôi thích ăn phở", meaning: "Nói về sở thích ăn uống" },
  { id: 10, sentence: "Xin lỗi, tôi đến muộn", meaning: "Xin lỗi vì đến trễ" },
];

export function SentencePractice() {
  const router = useRouter();
  const [selectedSentence, setSelectedSentence] = useState<
    (typeof sampleSentences)[0] | null
  >(null);

  const { isCameraOn, cameraRef, startCamera, stopCamera } = useCamera();
  const {
    isAiProcessing,
    aiResult,
    checkSignWithAI,
    resetAiResult,
    setAiResult,
  } = useAiCheck();

  const handleBack = () => {
    if (selectedSentence) {
      setSelectedSentence(null);
      stopCamera();
      resetAiResult();
    } else {
      router.push("/practice");
    }
  };

  // Sentence practice view
  if (selectedSentence) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {selectedSentence.sentence}
            </h2>
            <p className="text-gray-600">{selectedSentence.meaning}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Sentence breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Phân tích câu
            </h3>
            <div className="p-4 bg-green-50 rounded-xl mb-4">
              <p className="text-lg font-medium text-gray-900">
                {selectedSentence.sentence}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {selectedSentence.meaning}
              </p>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex-1">
              <h4 className="font-medium text-gray-900 mb-3">
                Hướng dẫn thực hành:
              </h4>
              <ul className="space-y-3 relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                {selectedSentence.sentence.split(" ").map((word, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 relative z-10"
                  >
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm flex-shrink-0"></div>
                    <span className="text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm text-sm">
                      {word}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right - Camera */}
          <CameraView
            cameraRef={cameraRef}
            isCameraOn={isCameraOn}
            startCamera={startCamera}
            stopCamera={() => {
              stopCamera();
              resetAiResult();
            }}
            isAiProcessing={isAiProcessing}
            aiResult={aiResult}
            onResetResult={() => setAiResult(null)}
            onCheckAi={() =>
              checkSignWithAI(
                selectedSentence.sentence,
                "match",
                isCameraOn,
                cameraRef,
              )
            }
            checkButtonText="Kiểm tra câu với AI"
            accentColor="green"
          />
        </div>
      </div>
    );
  }

  // Sentence list view
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
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Luyện tập theo câu
            </h2>
            <p className="text-gray-600">Chọn câu để luyện tập</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleSentences.map((sentence) => (
          <div
            key={sentence.id}
            onClick={() => setSelectedSentence(sentence)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-200 transition-all cursor-pointer group"
          >
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600">
              {sentence.sentence}
            </h4>
            <p className="text-sm text-gray-500">{sentence.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
