import React from "react";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  HelpCircle,
  Keyboard,
} from "lucide-react";
import { useTheme } from "@/core/providers/ThemeProvider";
import { useLogout } from "@/shared/hooks/useAuth";

interface UserDropdownProps {
  user: any;
  onClose: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user, onClose }) => {
  const { logout } = useLogout();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-semibold text-gray-900 truncate">
            {user?.name || "Người dùng"}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {user?.email || "user@example.com"}
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        <Link
          href="/settings/account"
          className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          <User size={20} className="text-gray-500" />
          <span className="text-sm font-medium">Hồ sơ của bạn</span>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          <Settings size={20} className="text-gray-500" />
          <span className="text-sm font-medium">Cài đặt</span>
        </Link>
        <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {theme === "light" ? (
            <Sun size={20} className="text-amber-500" />
          ) : (
            <Moon size={20} className="text-gray-500" />
          )}
          <span className="text-sm font-medium flex-1 text-left">
            Giao diện: {theme === "light" ? "Sáng" : "Tối"}
          </span>
          <div
            className={`w-10 h-5 rounded-full relative transition-colors ${
              theme === "dark" ? "bg-primary-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                theme === "dark" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>
      </div>

      <div className="border-t border-gray-100 my-1"></div>

      <div className="py-2">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
          <HelpCircle size={20} className="text-gray-500" />
          <span className="text-sm font-medium">Trợ giúp</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
          <Keyboard size={20} className="text-gray-500" />
          <span className="text-sm font-medium">Phím tắt</span>
        </button>
      </div>

      <div className="border-t border-gray-100 my-1"></div>

      <div className="py-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;
