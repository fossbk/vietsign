"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  User,
  Shield,
  Key,
  Smartphone,
  Mail,
  Globe,
  Clock,
  CreditCard,
  Save,
  X,
  ArrowLeft,
  Edit,
} from "lucide-react";
import { useRouter } from "next/navigation";
import UserModel from "@/domain/entities/User";
import { useDispatch } from "react-redux";
import { login } from "@/core/store/slices/adminSlice"; // Although named adminSlice, it handles user auth state
import { Modal } from "@/shared/components/common/Modal";

export const AccountSettings: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.admin.user); // Should be fetched from Redux or API

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    language: "Tiếng Việt (VN)",
    twoFactor: true,
    securityLevel: "Mạnh",
  });

  // Password change state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update effect to sync form with user data when user changes
  React.useEffect(() => {
    if (user) {
      setEditForm((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
      }));
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updatedUser = await UserModel.updateProfile({
        name: editForm.name,
        email: editForm.email,
        phone_number: editForm.phone_number,
        // Note: language, twoFactor, securityLevel might not be supported by backend yet
      });

      // Update redux state
      // Assuming response wraps user in data or returns user directly - check UserModel implementation
      // UserModel.updateProfile returns res.data. Let's assume structure.
      // If API returns the updated user object or success message

      // Re-fetch profile to be sure or just update local state if we trust the input
      const profile = await UserModel.getProfile();
      dispatch(login(profile.user || profile)); // Update store

      setSuccessMessage("Cập nhật thông tin thành công!");
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to update profile", err);
      setError(err.message || "Đã xảy ra lỗi khi cập nhật thông tin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (passwordForm.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu mới không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await UserModel.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccessMessage("Đổi mật khẩu thành công!");
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error("Failed to change password", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl border border-green-100 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <X size={18} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span>Quay lại cài đặt</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Account Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold border-2 border-white/30 shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="text-center md:text-left">
              <p className="text-blue-100 text-sm mb-1 uppercase tracking-wider font-semibold">
                Cài đặt tài khoản
              </p>
              <h1 className="text-3xl font-bold mb-2">{user?.name}</h1>
              <p className="text-blue-100 opacity-90">
                Quản lý thông tin cá nhân, quyền riêng tư và cài đặt bảo mật của
                bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Họ và tên */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Họ và tên
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <User size={18} className="text-gray-400" />
                  {editForm.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <Mail size={18} className="text-gray-400" />
                  {editForm.email}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Số điện thoại
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone_number: e.target.value })
                  }
                  placeholder="Nhập số điện thoại"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <Smartphone size={18} className="text-gray-400" />
                  {editForm.phone_number || "Chưa cập nhật"}
                </p>
              )}
            </div>

            {/* Ngôn ngữ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Ngôn ngữ
              </label>
              {isEditing ? (
                <select
                  value={editForm.language}
                  onChange={(e) =>
                    setEditForm({ ...editForm, language: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                >
                  <option value="Tiếng Việt (VN)">Tiếng Việt (VN)</option>
                  <option value="English (US)">English (US)</option>
                </select>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                  <Globe size={18} className="text-gray-400" />
                  {editForm.language}
                </p>
              )}
            </div>

            {/* Xác thực 2 lớp */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Xác thực 2 lớp
              </label>
              {isEditing ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                  <span
                    className={`text-sm font-medium ${
                      editForm.twoFactor ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {editForm.twoFactor ? "Đang bật" : "Đang tắt"}
                  </span>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editForm.twoFactor ? "bg-primary-600" : "bg-gray-200"
                    }`}
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        twoFactor: !editForm.twoFactor,
                      })
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editForm.twoFactor ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      editForm.twoFactor
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Shield size={14} />
                    {editForm.twoFactor ? "Đã bật" : "Chưa bật"}
                  </span>
                </p>
              )}
            </div>

            {/* Độ an toàn & Mật khẩu */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Mật khẩu
              </label>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-gray-400" />
                  <span className="text-gray-900">••••••••</span>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>

            {/* Gói dịch vụ */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Gói dịch vụ
              </label>
              <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                <CreditCard size={18} className="text-gray-400" />
                Free
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <Clock size={24} className="text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-gray-900">12</p>
              <p className="text-xs text-gray-500">Tháng tham gia</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <Key size={24} className="text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-gray-900">Mạnh</p>
              <p className="text-xs text-gray-500">Độ an toàn</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl text-center">
              <Shield size={24} className="text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-gray-900">Bật</p>
              <p className="text-xs text-gray-500">Xác thực 2 lớp</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl text-center">
              <Smartphone size={24} className="text-indigo-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-gray-900">2</p>
              <p className="text-xs text-gray-500">Thiết bị liên kết</p>
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

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi mật khẩu"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm disabled:opacity-70"
            >
              {isLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
