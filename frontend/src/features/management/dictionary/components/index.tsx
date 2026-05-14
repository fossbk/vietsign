"use client";

import {
  Library,
  Search,
  Plus,
  Edit,
  Trash2,
  Video,
  Eye,
  Filter,
  Loader2,
  Upload,
  Clock,
  FileText,
  Layers,
  Check,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DictionaryItem } from "@/data/dictionaryData";
import {
  Pagination,
  usePagination,
} from "@/shared/components/common/Pagination";
import { Modal } from "@/shared/components/common/Modal";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import {
  fetchAllWords,
  createWord,
  deleteWord,
} from "@/services/dictionaryService";
import {
  fetchAllTopics,
  createTopic,
  TopicItem,
} from "@/services/topicService";
import { removeVietnameseTones } from "@/shared/utils/text";
import { API_BASE_URL } from "@/core/config/api";

const ITEMS_PER_PAGE = 10;

const VOCAB_TYPE_LABELS: Record<string, string> = {
  all: "Tất cả",
  WORD: "Từ đơn",
  SENTENCE: "Câu",
  PARAGRAPH: "Đoạn văn",
};

const VOCAB_TYPES = [
  { id: "all", label: "Tất cả" },
  { id: "WORD", label: "Từ đơn" },
  { id: "SENTENCE", label: "Câu" },
  { id: "PARAGRAPH", label: "Đoạn văn" },
];

export function DictionaryManagementComponent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State quản lý dữ liệu
  const [words, setWords] = useState<DictionaryItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);

  // State cho modal xác nhận xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<DictionaryItem | null>(null);

  // State for Create Form
  const [formData, setFormData] = useState({
    word: "",
    category: "",
    level: "easy",
    videoUrl: "",
    imageUrl: "",
    description: "",
    vocabularyType: "WORD",
  });
  const [activeTab, setActiveTab] = useState<"single" | "multiple">("single");
  const [multipleData, setMultipleData] = useState<any[]>([
    { word: "", category: "", vocabularyType: "WORD" },
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wordsData, topicsData] = await Promise.all([
        fetchAllWords({ content: searchQuery, limit: 10000 }),
        fetchAllTopics(), // Fetch global topics
      ]);

      // Filter by type
      let filtered = wordsData;
      if (filterType !== "all") {
        filtered = filtered.filter((w) => w.vocabularyType === filterType);
      }

      // Client-side search if needed (though backend handles content search)
      if (searchQuery) {
        const normalizedQuery = removeVietnameseTones(searchQuery);
        // Backend search might be partial, so this is just extra safety or if backend search is limited
      }

      setWords(filtered);
      setTopics(topicsData);
    } catch (error) {
      console.error("Failed to load dictionary data", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterType]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadData]);

  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    usePagination(words, ITEMS_PER_PAGE);

  // Mở trang chi tiết
  const openDetailPage = (word: DictionaryItem) => {
    router.push(`/dictionary-management/${word.id}`);
  };

  // Mở trang chi tiết ở chế độ sửa
  const openEditPage = (word: DictionaryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dictionary-management/${word.id}`);
  };

  // Mở modal xác nhận xóa
  const openDeleteModal = (word: DictionaryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setWordToDelete(word);
    setIsDeleteModalOpen(true);
  };

  // Xử lý xóa
  const handleDelete = async () => {
    if (wordToDelete) {
      try {
        await deleteWord(wordToDelete.id);
        setWords((prev) => prev.filter((w) => w.id !== wordToDelete.id));
        setIsDeleteModalOpen(false);
        setWordToDelete(null);
      } catch (error) {
        alert("Xóa thất bại");
      }
    }
  };

  const getTopicId = async (topicName: string): Promise<number | null> => {
    if (!topicName) return null;
    const existing = topics.find(
      (t) => t.name.toLowerCase() === topicName.trim().toLowerCase(),
    );
    if (existing) return existing.id;

    // Create new topic
    try {
      const newTopic = await createTopic({
        name: topicName,
        isCommon: true, // Global topic
        description: "Created from Dictionary Management",
      });
      // Update local topics list
      setTopics((prev) => [...prev, newTopic]);
      return newTopic.id;
    } catch (e) {
      console.error("Failed to create topic", e);
      return null;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === "single") {
        const topicId = await getTopicId(formData.category);
        await createWord({
          ...formData,
          status: "published",
          topic_id: topicId,
        });
      } else {
        const { createMultipleWords } =
          await import("@/services/dictionaryService");

        // Process topics for multiple items
        const itemsToCreate = [];
        for (const item of multipleData) {
          if (!item.word.trim()) continue;
          const tId = await getTopicId(item.category);
          itemsToCreate.push({
            ...item,
            topic_id: tId,
          });
        }

        if (itemsToCreate.length > 0) {
          await createMultipleWords(itemsToCreate);
        }
      }
      setIsModalOpen(false);
      setFormData({
        word: "",
        category: "",
        level: "easy",
        videoUrl: "",
        imageUrl: "",
        description: "",
        vocabularyType: "WORD",
      });
      setMultipleData([{ word: "", category: "", vocabularyType: "WORD" }]);
      loadData();
    } catch (error) {
      console.error("Create failed", error);
      alert("Thêm mới thất bại");
    }
  };

  const addMultipleRow = () => {
    setMultipleData([
      ...multipleData,
      { word: "", category: "", vocabularyType: "WORD" },
    ]);
  };

  const removeMultipleRow = (index: number) => {
    if (multipleData.length > 1) {
      setMultipleData(multipleData.filter((_, i) => i !== index));
    }
  };

  const updateMultipleRow = (index: number, field: string, value: any) => {
    const newData = [...multipleData];
    newData[index][field] = value;
    setMultipleData(newData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Library className="w-8 h-8 text-primary-600" />
            Quản lý từ điển
          </h1>
          <p className="text-gray-600 mt-1">
            Quản lý các từ và video ký hiệu ({words.length} từ)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium shadow-sm transition-colors"
        >
          <Plus size={20} /> Thêm từ mới
        </button>
      </div>

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
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white min-w-[160px] transition-all focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tất cả loại từ</option>
              {VOCAB_TYPES.filter((t) => t.id !== "all").map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center text-primary-600">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[35%]">
                      Từ ký hiệu
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                      Loại từ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                      Lượt xem
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[15%]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.map((word) => (
                    <tr
                      key={word.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetailPage(word)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-sm overflow-hidden border border-gray-100">
                            {word.imageUrl ? (
                              <img
                                src={word.imageUrl}
                                alt={word.word}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Video size={20} />
                            )}
                          </div>
                          <p
                            className="font-medium text-gray-900 truncate"
                            title={word.word}
                          >
                            {word.word}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {VOCAB_TYPE_LABELS[word.vocabularyType || "WORD"] ||
                          word.vocabularyType}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Eye size={16} />
                          {word.views.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${word.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                        >
                          {word.status === "published"
                            ? "Đã xuất bản"
                            : "Bản nháp"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            onClick={(e) => openEditPage(word, e)}
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={(e) => openDeleteModal(word, e)}
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isLoading && words.length === 0 && (
              <div className="p-12 text-center border-t border-gray-100">
                <Library className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Không tìm thấy từ nào
                </h3>
                <p className="text-gray-500">Thử tìm kiếm với nội dung khác</p>
              </div>
            )}
          </>
        )}
      </div>

      {!isLoading && words.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={words.length}
          filteredItems={words.length}
          itemName="từ"
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal thêm từ mới */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm từ mới vào từ điển"
      >
        <div className="flex border-b border-gray-100 mb-6">
          <button
            onClick={() => setActiveTab("single")}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === "single" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Thêm đơn lẻ
          </button>
          <button
            onClick={() => setActiveTab("multiple")}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === "multiple" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Thêm nhiều
          </button>
        </div>

        {activeTab === "single" ? (
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Loại từ vựng
                </label>
                <div className="flex gap-4">
                  {["WORD", "SENTENCE", "PARAGRAPH"].map((type) => (
                    <label
                      key={type}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.vocabularyType === type ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="vocabularyType"
                        value={type}
                        checked={formData.vocabularyType === type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vocabularyType: e.target.value,
                          })
                        }
                      />
                      {type === "WORD" ? (
                        <FileText size={18} />
                      ) : type === "SENTENCE" ? (
                        <Layers size={18} />
                      ) : (
                        <Library size={18} />
                      )}
                      <span className="text-xs font-bold">
                        {type === "WORD"
                          ? "Từ"
                          : type === "SENTENCE"
                            ? "Câu"
                            : "Đoạn"}
                      </span>
                      {formData.vocabularyType === type && (
                        <Check size={14} className="ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nội dung
                </label>
                <textarea
                  placeholder="Nhập từ, câu hoặc đoạn văn..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all min-h-[80px]"
                  required
                  value={formData.word}
                  onChange={(e) =>
                    setFormData({ ...formData, word: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Chủ đề (Topic) <span className="text-red-500">*</span>
                </label>
                <input
                  list="dict-topics-list"
                  type="text"
                  placeholder="Nhập hoặc chọn chủ đề..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
                <datalist id="dict-topics-list">
                  {topics.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                  <option value="Chào hỏi" />
                  <option value="Gia đình" />
                  <option value="Trường học" />
                  <option value="Động vật" />
                  <option value="Thể thao" />
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Nhập chủ đề mới để tạo chủ đề.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Mức độ
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">
                  Ảnh minh họa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="Đường dẫn ảnh..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("dict-image-upload")?.click()
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <input
                    id="dict-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        try {
                          setIsUploading(true);
                          const { uploadFile } =
                            await import("@/services/uploadService");
                          // uploadFile trả về relative path — lưu thẳng vào DB
                          const path = await uploadFile(
                            e.target.files[0],
                            "Data_FSL",
                          );
                          setFormData({
                            ...formData,
                            imageUrl: path,
                          });
                        } catch (err) {
                          alert("Lỗi tải ảnh");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">
                  Video minh họa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, videoUrl: e.target.value })
                    }
                    placeholder="URL Video..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("dict-video-upload")?.click()
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <input
                    id="dict-video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        try {
                          setIsUploading(true);
                          const { uploadFile } =
                            await import("@/services/uploadService");
                          // uploadFile trả về relative path — lưu thẳng vào DB
                          const path = await uploadFile(
                            e.target.files[0],
                            "Data_FSL",
                          );
                          setFormData({
                            ...formData,
                            videoUrl: path,
                          });
                        } catch (err) {
                          alert("Lỗi tải video");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Mô tả ký hiệu
                </label>
                <textarea
                  placeholder="Giải thích cách thực hiện ký hiệu..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm disabled:opacity-50"
              >
                {isUploading ? "Đang xử lý..." : "Thêm vào từ điển"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4 pr-2">
              {multipleData.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-3 relative group"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
                          Nội dung
                        </label>
                        <input
                          type="text"
                          value={item.word}
                          onChange={(e) =>
                            updateMultipleRow(index, "word", e.target.value)
                          }
                          placeholder="Từ/Câu..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
                          Chủ đề
                        </label>
                        <input
                          type="text"
                          list={`cat-list-${index}`}
                          value={item.category}
                          onChange={(e) =>
                            updateMultipleRow(index, "category", e.target.value)
                          }
                          placeholder="Chủ đề..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <datalist id={`cat-list-${index}`}>
                          {topics.map((t) => (
                            <option key={t.id} value={t.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                  {multipleData.length > 1 && (
                    <button
                      onClick={() => removeMultipleRow(index)}
                      className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addMultipleRow}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus size={18} /> Thêm dòng mới
            </button>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
              >
                Lưu tất cả ({multipleData.length})
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal xác nhận xóa */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa từ "${wordToDelete?.word}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
