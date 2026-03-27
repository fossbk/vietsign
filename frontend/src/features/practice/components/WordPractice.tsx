"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Video, ArrowLeft, Search, Type, Loader2 } from "lucide-react";
import { fetchAllWords } from "@/services/dictionaryService";
import { fetchAllQuestions } from "@/services/questionService";
import { removeVietnameseTones } from "@/shared/utils/text";
import { useCamera, useAiCheck, CameraView } from "./shared";
import { VideoPlayer } from "@/shared/components/common";

interface PracticeItem {
  id: string;
  word: string;
  description: string;
  category: string;
  videoUrl: string;
  instructions?: string;
  source: "dictionary" | "question";
  views?: number;
}

export function WordPractice() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<PracticeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isCameraOn, cameraRef, startCamera, stopCamera } = useCamera();
  const {
    isAiProcessing,
    aiResult,
    checkSignWithAI,
    resetAiResult,
    setAiResult,
  } = useAiCheck();

  // Fetch data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("Loading practice items from general dictionary...");
        // Fetch published public words
        const [wordsData, questionsData] = await Promise.all([
          fetchAllWords({ is_private: 0 }),
          fetchAllQuestions({ question_type: "PRACTICE" }),
        ]);

        const fromDictionary: PracticeItem[] = (wordsData || [])
          .filter((d) => d.videoUrl) // Only items with videos are useful for practice
          .map((d) => ({
            id: `dict-${d.id}`,
            word: d.word,
            description: d.description || `Ký hiệu "${d.word}" - thuộc danh mục ${d.category}.`,
            category: d.category || "Chung",
            videoUrl: d.videoUrl!,
            instructions: `Thực hiện ký hiệu cho từ "${d.word}"`,
            source: "dictionary" as const,
            views: d.views,
          }));

        const fromQuestions: PracticeItem[] = (questionsData || [])
          .filter((q) => q.video || q.videoUrl)
          .map((q) => ({
            id: `q-${q.id}`,
            word: q.content || "Bài thực hành",
            description:
              q.description || q.explanation || `Bài thực hành: ${q.content}`,
            category: q.category || "Bài tập",
            videoUrl: q.video || q.videoUrl || "",
            instructions: q.practiceInstructions,
            source: "question" as const,
          }));

        const combined = [...fromDictionary, ...fromQuestions];
        console.log(`Loaded ${combined.length} practice items total`);
        setPracticeItems(combined);
      } catch (error) {
        console.error("Failed to load practice items", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(practiceItems.map((item) => item.category)),
    ];
    return ["all", ...uniqueCategories.sort()];
  }, [practiceItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return practiceItems.filter((item) => {
      const normalizedQuery = removeVietnameseTones(searchQuery.toLowerCase());
      const matchesSearch =
        removeVietnameseTones(item.word.toLowerCase()).includes(
          normalizedQuery,
        ) ||
        removeVietnameseTones(item.category.toLowerCase()).includes(
          normalizedQuery,
        );
      const matchesCategory =
        filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [practiceItems, searchQuery, filterCategory]);

  const handleBack = () => {
    if (selectedItem) {
      setSelectedItem(null);
      stopCamera();
      resetAiResult();
    } else {
      router.push("/practice");
    }
  };

  // Practice view for selected item
  if (selectedItem) {
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
              {selectedItem.word}
            </h2>
            <p className="text-gray-600 text-sm">
              Luyện tập ký hiệu và chấm điểm AI
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Video */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900">Video mẫu</span>
              </div>
            </div>
            <VideoPlayer
              videoUrl={selectedItem.videoUrl}
              title={selectedItem.word}
              autoPlay={true}
              loop={true}
              showControls={true}
              className="rounded-none"
            />
            <div className="p-4">
              <div className="p-4 bg-primary-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-1">Ý nghĩa</h4>
                <p className="text-sm text-gray-700">
                  {selectedItem.description}
                </p>
                {selectedItem.instructions && (
                  <div className="mt-3 pt-3 border-t border-primary-200">
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {selectedItem.instructions}
                    </p>
                  </div>
                )}
              </div>
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
              checkSignWithAI(selectedItem.word, "match", isCameraOn, cameraRef)
            }
            checkButtonText="Kiểm tra với AI"
            accentColor="blue"
          />
        </div>
      </div>
    );
  }

  // Word list view
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
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Type className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Luyện tập theo từ
            </h2>
            <p className="text-gray-600">Chọn từ để luyện tập với AI</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm từ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 h-[42px]"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-[42px] px-3 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tất cả ({practiceItems.length})</option>
            {categories
              .filter((c) => c !== "all")
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
        </div>
      )}

      {/* Word grid */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600">
                {item.word}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{item.category}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy từ phù hợp</p>
        </div>
      )}
    </div>
  );
}
