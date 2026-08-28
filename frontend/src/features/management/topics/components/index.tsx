"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FolderKanban,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  School,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createTopic,
  deleteTopic,
  fetchMyTopics,
  TopicItem,
  updateTopic,
} from "@/services/topicService";
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
  const [deleteTarget, setDeleteTarget] = useState<TopicItem | null>(null);

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
    setModal({ open: true, topic: null });
  };

  const openEdit = (topic: TopicItem) => {
    setForm({
      name: topic.name,
      description: topic.description || "",
      image_location: topic.imageLocation || "",
    });
    setModal({ open: true, topic });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_location: form.image_location.trim() || null,
        is_common: false,
      };

      if (modal.topic) {
        await updateTopic(modal.topic.id, payload);
        toast.success("Đã cập nhật chủ đề");
      } else {
        await createTopic(payload);
        toast.success("Đã tạo chủ đề mới");
      }

      setModal({ open: false, topic: null });
      setForm(EMPTY_FORM);
      await loadTopics();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          (modal.topic ? "Cập nhật chủ đề thất bại" : "Tạo chủ đề thất bại"),
      );
    } finally {
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
                      src={topic.imageLocation}
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
                  <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
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
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, topic: null })}
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
              Đường dẫn ảnh minh họa
            </label>
            <input
              type="url"
              value={form.image_location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  image_location: event.target.value,
                }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            Chủ đề được lưu trong kho của bạn. Sau khi tạo, hãy vào lớp học
            và chọn “Thêm chủ đề” để gán vào lớp.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal({ open: false, topic: null })}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSaving && <Loader2 size={17} className="animate-spin" />}
              {modal.topic ? "Lưu thay đổi" : "Tạo chủ đề"}
            </button>
          </div>
        </form>
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
