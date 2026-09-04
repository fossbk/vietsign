"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  FolderKanban,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  School,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createTopic,
  deleteTopic,
  fetchMyTopics,
  fetchSelectedTopicVocabularies,
  replaceTopicVocabularies,
  TopicItem,
  updateTopic,
} from "@/services/topicService";
import { fetchAllWords } from "@/services/dictionaryService";
import { DictionaryItem } from "@/data/dictionaryData";
import { normalizeFileUrl, uploadFile } from "@/services/uploadService";
import { Modal } from "@/shared/components/common/Modal";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";

const EMPTY_FORM = { name: "", description: "", image_location: "" };

export function TopicsManagement() {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{
    open: boolean;
    topic: TopicItem | null;
  }>({ open: false, topic: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<TopicItem | null>(null);
  const [vocabularyModal, setVocabularyModal] = useState<{
    open: boolean;
    topic: TopicItem | null;
  }>({ open: false, topic: null });
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryItem[]>([]);
  const [selectedVocabularyIds, setSelectedVocabularyIds] = useState<number[]>(
    [],
  );
  const [vocabularySearch, setVocabularySearch] = useState("");
  const [isVocabularyLoading, setIsVocabularyLoading] = useState(false);
  const [isVocabularySaving, setIsVocabularySaving] = useState(false);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      setTopics(await fetchMyTopics());
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách chủ đề");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredTopics = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return topics;
    return topics.filter(
      (topic) =>
        topic.name.toLocaleLowerCase("vi").includes(keyword) ||
        topic.description?.toLocaleLowerCase("vi").includes(keyword),
    );
  }, [topics, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview("");
    setModal({ open: true, topic: null });
  };

  const openEdit = (topic: TopicItem) => {
    setForm({
      name: topic.name,
      description: topic.description || "",
      image_location: topic.imageLocation || "",
    });
    setImageFile(null);
    setImagePreview(topic.imageLocation || "");
    setModal({ open: true, topic });
  };

  const closeTopicModal = () => {
    setModal({ open: false, topic: null });
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn đúng định dạng file ảnh");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5 MB");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm((current) => ({ ...current, image_location: "" }));
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setIsSaving(true);
    try {
      let imageLocation = form.image_location.trim() || null;
      if (imageFile) {
        setIsImageUploading(true);
        imageLocation = await uploadFile(imageFile, "topic");
        if (!imageLocation) throw new Error("Không nhận được đường dẫn ảnh");
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_location: imageLocation,
        is_common: false,
      };

      if (modal.topic) {
        await updateTopic(modal.topic.id, payload);
        toast.success("Đã cập nhật chủ đề");
      } else {
        await createTopic(payload);
        toast.success("Đã tạo chủ đề mới");
      }

      closeTopicModal();
      setForm(EMPTY_FORM);
      await loadTopics();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          (modal.topic ? "Cập nhật chủ đề thất bại" : "Tạo chủ đề thất bại"),
      );
    } finally {
      setIsImageUploading(false);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTopic(deleteTarget.id);
      setTopics((current) =>
        current.filter((topic) => topic.id !== deleteTarget.id),
      );
      toast.success("Đã xóa chủ đề");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Xóa chủ đề thất bại");
    } finally {
      setDeleteTarget(null);
    }
  };

  const openVocabularyModal = async (topic: TopicItem) => {
    setVocabularyModal({ open: true, topic });
    setVocabularySearch("");
    setIsVocabularyLoading(true);
    try {
      const [words, selectedWords] = await Promise.all([
        fetchAllWords({ status: "APPROVED", limit: 10000 }),
        fetchSelectedTopicVocabularies(topic.id),
      ]);
      setDictionaryWords(words);
      setSelectedVocabularyIds(selectedWords.map((word) => word.id));
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Không thể tải bộ từ điển",
      );
    } finally {
      setIsVocabularyLoading(false);
    }
  };

  const filteredDictionaryWords = useMemo(() => {
    const keyword = vocabularySearch.trim().toLocaleLowerCase("vi");
    if (!keyword) return dictionaryWords;
    return dictionaryWords.filter(
      (word) =>
        word.word.toLocaleLowerCase("vi").includes(keyword) ||
        word.description?.toLocaleLowerCase("vi").includes(keyword),
    );
  }, [dictionaryWords, vocabularySearch]);

  const toggleVocabulary = (vocabularyId: number) => {
    setSelectedVocabularyIds((current) =>
      current.includes(vocabularyId)
        ? current.filter((id) => id !== vocabularyId)
        : [...current, vocabularyId],
    );
  };

  const toggleAllVisibleVocabularies = () => {
    const visibleIds = filteredDictionaryWords.map((word) => word.id);
    const allVisibleSelected = visibleIds.every((id) =>
      selectedVocabularyIds.includes(id),
    );
    setSelectedVocabularyIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  };

  const handleSaveVocabularies = async () => {
    if (!vocabularyModal.topic) return;
    setIsVocabularySaving(true);
    try {
      await replaceTopicVocabularies(
        vocabularyModal.topic.id,
        selectedVocabularyIds,
      );
      toast.success("Đã cập nhật bộ từ vựng");
      setVocabularyModal({ open: false, topic: null });
      await loadTopics();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Cập nhật từ vựng thất bại",
      );
    } finally {
      setIsVocabularySaving(false);
    }
  };

  const assignedCount = topics.filter(
    (topic) => (topic.classroomCount || 0) > 0,
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý chủ đề
            </h1>
          </div>
          <p className="mt-1 text-gray-500">
            Tạo kho chủ đề của bạn, sau đó gán vào các lớp đang phụ trách.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          <Plus size={18} />
          Tạo chủ đề
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tổng chủ đề</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {topics.length}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm text-emerald-700">Đã gán vào lớp</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">
            {assignedCount}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-700">Tổng từ vựng</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">
            {topics.reduce(
              (total, topic) => total + (topic.vocabularyCount || 0),
              0,
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-xl">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm chủ đề..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="mr-2 animate-spin" size={24} />
            Đang tải chủ đề...
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="py-20 text-center">
            <FolderKanban className="mx-auto h-14 w-14 text-gray-300" />
            <h2 className="mt-4 font-semibold text-gray-800">
              {search ? "Không tìm thấy chủ đề" : "Bạn chưa tạo chủ đề nào"}
            </h2>
            {!search && (
              <button
                onClick={openCreate}
                className="mt-4 font-medium text-primary-600 hover:text-primary-700"
              >
                Tạo chủ đề đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTopics.map((topic) => (
              <article
                key={topic.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:border-primary-200 hover:shadow-md"
              >
                <div className="flex h-32 items-center justify-center bg-gray-50">
                  {topic.imageLocation ? (
                    <img
                      src={normalizeFileUrl(topic.imageLocation)}
                      alt={topic.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-gray-300" />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="truncate font-semibold text-gray-900">
                    {topic.name}
                  </h2>
                  <p className="mt-2 min-h-10 text-sm text-gray-500 line-clamp-2">
                    {topic.description || "Chưa có mô tả"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-primary-700">
                      <School size={13} />
                      {topic.classroomCount || 0} lớp
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      <BookOpen size={13} />
                      {topic.vocabularyCount || 0} từ
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => openVocabularyModal(topic)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                    >
                      <BookOpen size={17} />
                      Chọn từ vựng
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(topic)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-primary-50 hover:text-primary-600"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(topic)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={closeTopicModal}
        title={modal.topic ? "Chỉnh sửa chủ đề" : "Tạo chủ đề"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Tên chủ đề <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ví dụ: Chào hỏi cơ bản"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Mô tả
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Nội dung và mục tiêu của chủ đề"
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Ảnh minh họa
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img
                  src={
                    imagePreview.startsWith("blob:")
                      ? imagePreview
                      : normalizeFileUrl(imagePreview)
                  }
                  alt="Xem trước ảnh minh họa"
                  className="h-44 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-black/50 p-3">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                  >
                    <Upload size={16} />
                    Thay ảnh
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <X size={16} />
                    Gỡ ảnh
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700"
              >
                <Upload size={28} />
                <span className="mt-2 font-medium">Chọn ảnh từ máy tính</span>
                <span className="mt-1 text-xs">JPG, PNG, WEBP hoặc GIF, tối đa 5 MB</span>
              </button>
            )}
          </div>
          <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            Chủ đề được lưu trong kho của bạn. Sau khi tạo, hãy vào lớp học
            và chọn “Thêm chủ đề” để gán vào lớp.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeTopicModal}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || isImageUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSaving && <Loader2 size={17} className="animate-spin" />}
              {isImageUploading
                ? "Đang tải ảnh..."
                : modal.topic
                  ? "Lưu thay đổi"
                  : "Tạo chủ đề"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={vocabularyModal.open}
        onClose={() => setVocabularyModal({ open: false, topic: null })}
        title={`Chọn từ vựng - ${vocabularyModal.topic?.name || ""}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={vocabularySearch}
                onChange={(event) => setVocabularySearch(event.target.value)}
                placeholder="Tìm từ trong bộ từ điển..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="whitespace-nowrap text-sm text-gray-600">
              Đã chọn{" "}
              <span className="font-bold text-primary-700">
                {selectedVocabularyIds.length}
              </span>{" "}
              từ
            </div>
          </div>

          {isVocabularyLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 size={24} className="mr-2 animate-spin" />
              Đang tải bộ từ điển...
            </div>
          ) : dictionaryWords.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-14 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 font-medium text-gray-700">
                Chưa có từ vựng đã duyệt
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAllVisibleVocabularies}
                className="text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                {filteredDictionaryWords.every((word) =>
                  selectedVocabularyIds.includes(word.id),
                )
                  ? "Bỏ chọn kết quả đang hiển thị"
                  : "Chọn tất cả kết quả đang hiển thị"}
              </button>
              <div className="grid max-h-[52vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredDictionaryWords.map((word) => {
                  const selected = selectedVocabularyIds.includes(word.id);
                  return (
                    <button
                      type="button"
                      key={word.id}
                      onClick={() => toggleVocabulary(word.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-primary-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {word.imageUrl ? (
                          <img
                            src={word.imageUrl}
                            alt={word.word}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="m-auto h-full w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">
                          {word.word}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {word.description || word.category}
                        </p>
                      </div>
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                          selected
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {selected && <Check size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {filteredDictionaryWords.length === 0 && (
                <div className="py-10 text-center text-gray-500">
                  Không tìm thấy từ vựng phù hợp
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setVocabularyModal({ open: false, topic: null })}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveVocabularies}
              disabled={isVocabularyLoading || isVocabularySaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isVocabularySaving && (
                <Loader2 size={17} className="animate-spin" />
              )}
              Lưu bộ từ vựng
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa chủ đề"
        message={`Bạn có chắc chắn muốn xóa chủ đề “${deleteTarget?.name || ""}”? Chủ đề sẽ được gỡ khỏi tất cả lớp đã gán.`}
        confirmText="Xóa chủ đề"
      />
    </div>
  );
}
