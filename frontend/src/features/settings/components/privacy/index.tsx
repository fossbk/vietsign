"use client";

import React, { useState } from "react";
import { Shield, Eye, Database, Lock, UserCheck, ShieldAlert, Fingerprint, FileText, Save, X, ArrowLeft, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Modal } from "@/shared/components/common/Modal";
import UserModel from "@/domain/entities/User";
import { logout } from "@/core/store/slices/adminSlice";

export const PrivacySettings: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    profileVisibility: "public",
    showAchievements: true,
    showActivity: true,
    allowDataCollection: true,
    marketingEmails: false
  });

  const handleSave = () => {
    setIsEditing(false);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeletePassword("");
    setDeleteError(null);
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deletePassword) {
      setDeleteError("Vui lòng nhập mật khẩu để xác nhận.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await UserModel.deleteAccount(deletePassword);
      dispatch(logout());
      router.replace("/");
    } catch (error: any) {
      setDeleteError(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa tài khoản thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <button 
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại cài đặt</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
              <Shield size={40} className="text-white" />
            </div>
            <div className="text-center md:text-left">
              <p className="text-red-100 text-sm mb-1 uppercase tracking-wider font-semibold">Cài đặt quyền riêng tư</p>
              <h1 className="text-3xl font-bold mb-2">Quyền riêng tư & Dữ liệu</h1>
              <p className="text-red-100 opacity-90">Quản lý cách thông tin của bạn được hiển thị và cách chúng tôi xử lý dữ liệu.</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hiển thị hồ sơ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Hiển thị hồ sơ</label>
              {isEditing ? (
                <select 
                  value={editForm.profileVisibility} 
                  onChange={(e) => setEditForm({ ...editForm, profileVisibility: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="public">Công khai</option>
                  <option value="friends">Chỉ bạn bè</option>
                  <option value="private">Riêng tư</option>
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Eye size={14} />
                    {editForm.profileVisibility === 'public' ? 'Công khai' : editForm.profileVisibility === 'friends' ? 'Chỉ bạn bè' : 'Riêng tư'}
                  </span>
                </p>
              )}
            </div>

            {/* Hiển thị thành tích */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Hiển thị thành tích</label>
              {isEditing ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`text-sm font-medium ${editForm.showAchievements ? 'text-green-600' : 'text-gray-400'}`}>
                    {editForm.showAchievements ? 'Đang bật' : 'Đang tắt'}
                  </span>
                  <button 
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.showAchievements ? 'bg-primary-600' : 'bg-gray-200'}`}
                    onClick={() => setEditForm({ ...editForm, showAchievements: !editForm.showAchievements })}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.showAchievements ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${editForm.showAchievements ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <UserCheck size={14} />
                    {editForm.showAchievements ? 'Hiển thị' : 'Ẩn'}
                  </span>
                </p>
              )}
            </div>

            {/* Hiển thị hoạt động */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Hiển thị hoạt động</label>
              {isEditing ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`text-sm font-medium ${editForm.showActivity ? 'text-green-600' : 'text-gray-400'}`}>
                    {editForm.showActivity ? 'Đang bật' : 'Đang tắt'}
                  </span>
                  <button 
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.showActivity ? 'bg-primary-600' : 'bg-gray-200'}`}
                    onClick={() => setEditForm({ ...editForm, showActivity: !editForm.showActivity })}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.showActivity ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${editForm.showActivity ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {editForm.showActivity ? 'Hiển thị' : 'Ẩn'}
                  </span>
                </p>
              )}
            </div>

            {/* Thu thập dữ liệu */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Cho phép thu thập dữ liệu</label>
              {isEditing ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`text-sm font-medium ${editForm.allowDataCollection ? 'text-green-600' : 'text-gray-400'}`}>
                    {editForm.allowDataCollection ? 'Đang bật' : 'Đang tắt'}
                  </span>
                  <button 
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.allowDataCollection ? 'bg-primary-600' : 'bg-gray-200'}`}
                    onClick={() => setEditForm({ ...editForm, allowDataCollection: !editForm.allowDataCollection })}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.allowDataCollection ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${editForm.allowDataCollection ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    <Database size={14} />
                    {editForm.allowDataCollection ? 'Cho phép' : 'Không cho phép'}
                  </span>
                </p>
              )}
            </div>

            {/* Email tiếp thị */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Email tiếp thị & khuyến mãi</label>
              {isEditing ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`text-sm font-medium ${editForm.marketingEmails ? 'text-green-600' : 'text-gray-400'}`}>
                    {editForm.marketingEmails ? 'Đang bật' : 'Đang tắt'}
                  </span>
                  <button 
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.marketingEmails ? 'bg-primary-600' : 'bg-gray-200'}`}
                    onClick={() => setEditForm({ ...editForm, marketingEmails: !editForm.marketingEmails })}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.marketingEmails ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${editForm.marketingEmails ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {editForm.marketingEmails ? 'Đã đăng ký' : 'Chưa đăng ký'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <UserCheck size={24} className="text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">{editForm.profileVisibility === 'public' ? 'Công khai' : 'Riêng tư'}</p>
              <p className="text-xs text-gray-500">Trạng thái hồ sơ</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl text-center">
              <ShieldAlert size={24} className="text-red-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">Người dùng đã chặn</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl text-center">
              <Fingerprint size={24} className="text-indigo-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">Mạnh</p>
              <p className="text-xs text-gray-500">Bảo vệ định danh</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <FileText size={24} className="text-blue-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">Chấp nhận</p>
              <p className="text-xs text-gray-500">Điều khoản</p>
            </div>
          </div>

          {/* Data Actions */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quản lý dữ liệu</h3>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors flex items-center gap-2">
                <Database size={18} />
                Tải về dữ liệu
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <Lock size={18} />
                Yêu cầu xóa tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
              >
                <X size={18} />
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
              >
                <Save size={18} />
                Lưu thay đổi
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
            >
              <Edit size={18} />
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Xóa tài khoản"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-5">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Tài khoản sẽ bị vô hiệu hóa và bạn sẽ được đăng xuất khỏi hệ thống.
            Hãy nhập mật khẩu để xác nhận thao tác này.
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500"
              autoComplete="current-password"
              required
            />
          </div>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? "Đang xóa..." : "Xóa tài khoản"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
