"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Video,
  Eye,
  Upload,
  Clock,
  FileText,
  Layers,
  Check,
  Library as LibraryIcon,
  Loader2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { DictionaryItem } from "@/data/dictionaryData";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { VideoPlayer } from "@/shared/components/common";
import {
  fetchWordById,
  updateWord,
  deleteWord,
} from "@/services/dictionaryService";
import { API_BASE_URL } from "@/core/config/api";

const VOCAB_TYPE_LABELS: Record<string, string> = {
  all: "Tất cả",
  WORD: "Từ đơn",
  SENTENCE: "Câu",
  PARAGRAPH: "Đoạn văn",
};

export function DictionaryManagementDetail() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);
  const [item, setItem] = useState<DictionaryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DictionaryItem>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWordById(id);
      if (data) {
        setItem(data);
        setEditForm({ ...data });
      } else {
        setItem(null);
      }
    } catch (error) {
      console.error("Failed to load word", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (item?.word) {
      document.title = `${item.word} - Từ điển - VietSignSchool`;
    }
  }, [item]);

  // Handle save
  const handleSave = async () => {
    if (item && editForm) {
      try {
        await updateWord(item.id, editForm);
        setItem({ ...item, ...editForm } as DictionaryItem);
        setIsEditing(false);
      } catch (error) {
        alert("Cập nhật thất bại");
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (item) {
      try {
        await deleteWord(item.id);
        router.push("/dictionary-management");
      } catch (error) {
        alert("Xóa thất bại");
      }
    }
  };

  const handleFileUpload = async (
    file: File,
    field: "videoUrl" | "imageUrl",
  ) => {
    try {
      setIsUploading(true);
      const { uploadFile } = await import("@/services/uploadService");
      // uploadFile trả về relative path (/uploads/...) — lưu thẳng vào DB
      const path = await uploadFile(file, "Data_FSL");
      setEditForm((prev) => ({ ...prev, [field]: path }));
    } catch (err) {
      alert("Tải lên thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Không tìm thấy từ này
        </h2>
        <button
          onClick={() => router.push("/dictionary-management")}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const currentVideoUrl = isEditing ? editForm.videoUrl : item.videoUrl;
  const currentImageUrl = isEditing ? editForm.imageUrl : item.imageUrl;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header - chỉ có nút quay lại */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dictionary-management")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Video Section */}
        <div className="aspect-video max-h-[500px] w-full bg-gray-900">
          {currentVideoUrl ? (
            <VideoPlayer
              key={currentVideoUrl}
              videoUrl={currentVideoUrl}
              title={item.word}
              autoPlay={false}
              loop={true}
              showControls={true}
              className="rounded-t-3xl h-full w-full"
            />
          ) : currentImageUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageUrl}
                alt={item.word}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
              <Video size={48} className="mb-2 opacity-50" />
              <p>Chưa có video hoặc hình ảnh</p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Từ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Từ ký hiệu
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.word || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, word: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg font-medium"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 text-lg font-bold">
                  {item.word}
                </p>
              )}
            </div>

            {/* Bỏ mục này vì đã có ở trên hoặc gộp chung */}
            <div className="hidden" />

            {/* Nghĩa của từ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Nghĩa của từ
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.description || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg font-medium"
                  placeholder="Nhập nghĩa của từ..."
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 text-lg font-medium">
                  {item.description || "Chưa có mô tả"}
                </p>
              )}
            </div>

            {/* Loại từ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Loại từ
              </label>
              {isEditing ? (
                <div className="flex gap-2">
                  {["WORD", "SENTENCE", "PARAGRAPH"].map((type) => (
                    <label
                      key={type}
                      className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${editForm.vocabularyType === type ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="vocabularyType"
                        value={type}
                        checked={editForm.vocabularyType === type}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            vocabularyType: e.target.value,
                          })
                        }
                      />
                      <span className="text-[10px] font-bold">
                        {VOCAB_TYPE_LABELS[type]}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">
                  {VOCAB_TYPE_LABELS[item.vocabularyType || "WORD"] ||
                    item.vocabularyType}
                </p>
              )}
            </div>

            {/* Lượt xem */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Lượt xem
              </label>
              <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                <Eye size={18} className="text-gray-400" />
                <span className="font-medium">
                  {item.views.toLocaleString()}
                </span>
              </p>
            </div>

            {/* Trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Trạng thái
              </label>
              {isEditing ? (
                <select
                  value={editForm.status || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="published">Đã xuất bản</option>
                  <option value="draft">Bản nháp</option>
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      item.status === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </p>
              )}
            </div>

            {/* Video URL */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Video URL
              </label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="url"
                    value={editForm.videoUrl || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, videoUrl: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
                    placeholder="Nhập đường dẫn video..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("detail-video-upload")?.click()
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <input
                    id="detail-video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileUpload(e.target.files[0], "videoUrl")
                    }
                  />
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-600 text-sm truncate flex items-center gap-2">
                  <Video size={18} className="text-gray-400 flex-shrink-0" />
                  {item.videoUrl || "Chưa có video"}
                </p>
              )}
            </div>

            {/* Image URL */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Image URL
              </label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="url"
                    value={editForm.imageUrl || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, imageUrl: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all pr-12"
                    placeholder="Nhập đường dẫn hình ảnh..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("detail-image-upload")?.click()
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <input
                    id="detail-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileUpload(e.target.files[0], "imageUrl")
                    }
                  />
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-600 text-sm truncate flex items-center gap-2">
                  <Eye size={18} className="text-gray-400 flex-shrink-0" />
                  {item.imageUrl || "Chưa có hình ảnh"}
                </p>
              )}
            </div>
          </div>
        </div>

        {isUploading && (
          <div className="px-8 pb-4">
            <p className="text-sm text-primary-600 flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" /> Đang tải tệp lên...
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({ ...item });
                }}
                disabled={isUploading}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
              >
                <X size={18} />
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
              >
                <Edit size={18} />
                Chỉnh sửa
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 size={18} />
                Xóa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa từ "${item.word}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
