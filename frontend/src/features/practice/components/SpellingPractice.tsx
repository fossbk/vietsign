"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Keyboard, Shuffle } from "lucide-react";
import { useCamera, useAiCheck, CameraView } from "./shared";

export function SpellingPractice() {
  const router = useRouter();
  const [spellingWord, setSpellingWord] = useState<string>("");
  const [spellingInput, setSpellingInput] = useState<string>("");

  const { isCameraOn, cameraRef, startCamera, stopCamera } = useCamera();
  const {
    isAiProcessing,
    aiResult,
    checkSignWithAI,
    resetAiResult,
    setAiResult,
  } = useAiCheck();

  const handleBack = () => {
    stopCamera();
    resetAiResult();
    router.push("/practice");
  };

  const generateRandomSpellingWord = () => {
    const words = [
      "HELLO",
      "VIETSIGN",
      "HOC",
      "YEU",
      "GIA DINH",
      "CAM ON",
      "XIN CHAO",
    ];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setSpellingWord(randomWord);
    setSpellingInput("");
    setAiResult(null);
  };

  // Initialize word on first render
  React.useEffect(() => {
    generateRandomSpellingWord();
  }, []);

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
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Keyboard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Luyện tập đánh vần
            </h2>
            <p className="text-gray-600">Đánh vần từ bằng ký hiệu chữ cái</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Word to spell */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Từ cần đánh vần</h3>
            <button
              onClick={generateRandomSpellingWord}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
            >
              <Shuffle size={16} />
              Từ ngẫu nhiên
            </button>
          </div>

          <div className="p-6 bg-purple-50 rounded-xl text-center mb-4">
            <p className="text-4xl font-bold text-purple-700 tracking-widest">
              {spellingWord || "---"}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hoặc nhập từ của bạn:
            </label>
            <input
              type="text"
              value={spellingInput}
              onChange={(e) => {
                setSpellingInput(e.target.value.toUpperCase());
                setSpellingWord(e.target.value.toUpperCase());
                setAiResult(null);
              }}
              placeholder="Nhập từ..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">
              Các chữ cái cần thực hiện:
            </h4>
            <div className="flex flex-wrap gap-2">
              {spellingWord
                .split("")
                .filter((c) => c !== " ")
                .map((letter, idx) => (
                  <span
                    key={idx}
                    className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-700 font-bold rounded-lg"
                  >
                    {letter}
                  </span>
                ))}
            </div>
          </div>

          <div className="mt-auto pt-6 text-sm text-gray-500 italic">
            * Mẹo: Thực hiện lần lượt từng ký hiệu chữ cái. AI sẽ kiểm tra cả
            chuỗi ký hiệu của bạn.
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
            checkSignWithAI(spellingWord, "spell", isCameraOn, cameraRef)
          }
          checkButtonText="Kiểm tra đánh vần"
          accentColor="purple"
          icon={<Keyboard className="w-16 h-16 mb-4 opacity-50" />}
        />
      </div>
    </div>
  );
}
