"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  BookOpen,
  LogOut,
  Users,
  GraduationCap,
  Building,
  BarChart3,
  Bell,
  Wrench,
  ClipboardCheck,
  Gamepad2,
  BookOpenCheck,
  PenLine,
  FileEdit,
  UserPlus,
  LayoutDashboard,
  Library,
  Calendar,
  Lightbulb,
  MessageCircle,
  Shield,
  HelpCircle,
  Hand,
  FolderKanban,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "@/core/store/slices/adminSlice";

interface SidebarProps {
  isOpen: boolean;
  isSmallScreen?: boolean;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  allowedRoles: string[]; // Danh sách các role được phép truy cập
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isSmallScreen = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.admin.user);

  const handleLogout = () => {
    dispatch(logout());
    // Redirect về trang chủ sau khi đăng xuất
    router.push("/");
  };

  // Định nghĩa tất cả các menu item và quyền truy cập
  // Note: Roles từ API dùng UPPERCASE: ADMIN, TEACHER, STUDENT, FACILITY_MANAGER, USER, TEST
  // Admin: home, dashboard, quản lý người dùng, quản lý cơ sở, quản lý học tập, quản lý lớp học, thông báo, quản lý công cụ, quản lý kiểm tra, thống kê, quản lý từ điển, quản lý trò chơi
  // FACILITY_MANAGER: home, dashboard, quản lý người dùng, quản lý học tập, quản lý lớp học, thông báo, quản lý công cụ, quản lý kiểm tra, thống kê, từ điển, quản lý trò chơi
  // TEACHER: home, dashboard, thông báo, quản lý lớp học, quản lý học tập, thống kê, quản lý kiểm tra, chấm điểm, từ điển, trò chơi
  // STUDENT & USER: home, dashboard, thông báo, quản lý học tập, thống kê, làm bài kiểm tra, học tập, đăng ký lớp học, từ điển, trò chơi
  // TEST: Truy cập tất cả các trang
  const MENU_ITEMS: MenuItem[] = [
    // === CHUNG CHO TẤT CẢ ===
    {
      icon: <House size={22} />,
      label: "Trang chủ",
      path: "/home",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },
    // {
    //   icon: <LayoutDashboard size={22} />,
    //   label: "Dashboard",
    //   path: "/dashboard",
    //   allowedRoles: [
    //     "ADMIN",
    //     "SUPER_ADMIN",
    //     "FACILITY_MANAGER",
    //     "CENTER_ADMIN",
    //     "SCHOOL_ADMIN",
    //     "TEACHER",
    //     "STUDENT",
    //     "USER",
    //     "TEST",
    //   ],
    // },
    {
      icon: <MessageCircle size={22} />,
      label: "Tin nhắn",
      path: "/messages",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },

    // === QUẢN LÝ (ADMIN & FACILITY_MANAGER) ===
    {
      icon: <Users size={22} />,
      label: "Quản lý người dùng",
      path: "/users-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEST",
      ],
    },
    // {
    //   icon: <Shield size={22} />,
    //   label: "Quản lý phân quyền",
    //   path: "/permissions",
    //   allowedRoles: ["ADMIN", "TEST"],
    // },
    {
      icon: <Building size={22} />,
      label: "Quản lý tổ chức",
      path: "/organizations-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEST",
      ],
    },
    {
      icon: <GraduationCap size={22} />,
      label: "Quản lý học tập",
      path: "/learning-management",
      allowedRoles: ["ADMIN", "SUPER_ADMIN", "TEST"],
    },
    {
      icon: <BookOpenCheck size={22} />,
      label: "Quản lý lớp học",
      path: "/classes-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },
    {
      icon: <FolderKanban size={22} />,
      label: "Quản lý chủ đề",
      path: "/topics-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },
    {
      icon: <Bell size={22} />,
      label: "Thông báo",
      path: "/notifications",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },
    // {
    //   icon: <Wrench size={22} />,
    //   label: "Quản lý công cụ",
    //   path: "/tools",
    //   allowedRoles: ["ADMIN", "SUPER_ADMIN", "TEST"],
    // },
    {
      icon: <ClipboardCheck size={22} />,
      label: "Quản lý kiểm tra",
      path: "/exams-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },
    {
      icon: <BarChart3 size={22} />,
      label: "Thống kê",
      path: "/statistics",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },
    {
      icon: <Library size={22} />,
      label: "Quản lý từ điển",
      path: "/dictionary-management",
      allowedRoles: ["ADMIN", "SUPER_ADMIN", "TEST"],
    },
    // {
    //   icon: <Gamepad2 size={22} />,
    //   label: "Quản lý trò chơi",
    //   path: "/games-management",
    //   allowedRoles: ["ADMIN", "TEST"],
    // },
    {
      icon: <HelpCircle size={22} />,
      label: "Quản lý câu hỏi",
      path: "/questions-management",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },

    // === CHỈ FACILITY_MANAGER, TEACHER, STUDENT, USER ===
    {
      icon: <BookOpen size={22} />,
      label: "Từ điển",
      path: "/vocabularies",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },

    // === CHỈ TEACHER, STUDENT & USER ===
    {
      icon: <Gamepad2 size={22} />,
      label: "Trò chơi",
      path: "/games",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },
    {
      icon: <Hand size={22} />,
      label: "Luyện tập",
      path: "/practice",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },

    // === CHỈ TEACHER ===
    {
      icon: <PenLine size={22} />,
      label: "Chấm điểm",
      path: "/grading",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "TEST",
      ],
    },

    // === CHỈ STUDENT & USER ===
    {
      icon: <FileEdit size={22} />,
      label: "Làm bài kiểm tra",
      path: "/take-exam",
      allowedRoles: ["STUDENT", "TEST"],
    },
    {
      icon: <BookOpenCheck size={22} />,
      label: "Lớp học của tôi",
      path: "/study",
      allowedRoles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "STUDENT", "TEST"],
    },

    // === TRANG BỔ SUNG ===
    {
      icon: <Lightbulb size={22} />,
      label: "Học tập",
      path: "/learn",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },
    {
      icon: <Calendar size={22} />,
      label: "Ký hiệu mỗi ngày",
      path: "/daily-signs",
      allowedRoles: [
        "ADMIN",
        "SUPER_ADMIN",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
        "TEACHER",
        "STUDENT",
        "USER",
        "TEST",
      ],
    },
  ];

  // Lọc menu dựa trên role của user hiện tại
  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    const userRole = user.code;
    return MENU_ITEMS.filter((item) => {
      // Admin and Super Admin can access everything
      if (["ADMIN", "SUPER_ADMIN", "TEST"].includes(userRole)) return true;
      return item.allowedRoles.includes(userRole);
    });
  }, [user]);

  const isActive = (path: string) => pathname === path;

  // On small screens: sidebar slides in/out from left
  // On large screens: sidebar collapses/expands in place
  const getSidebarClasses = () => {
    if (isSmallScreen) {
      // Mobile/small screen behavior: slide in/out
      return isOpen ? "w-60 px-3 translate-x-0" : "w-60 px-3 -translate-x-full";
    } else {
      // Desktop behavior: collapse/expand
      return isOpen ? "w-60 px-3 translate-x-0" : "w-24 px-2 translate-x-0";
    }
  };

  return (
    <aside
      className={`
        fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out pb-4 overflow-y-auto
        ${getSidebarClasses()}
      `}
    >
      <nav className="flex flex-col py-3 space-y-1 h-full">
        {filteredMenuItems.map((item) => {
          const active = isActive(item.path);
          // On small screens, always show expanded style (sidebar slides in as drawer)
          // On large screens, show collapsed/expanded based on isOpen
          const showExpanded = isSmallScreen || isOpen;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center rounded-xl transition-colors duration-200 group
                ${showExpanded
                  ? "flex-row px-3 py-2.5 gap-4 justify-start" // Expanded: horizontal
                  : "flex-col justify-center items-center py-3 gap-0 h-20" // Collapsed: vertical, centered
                }
                ${active
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
              title={!showExpanded ? item.label : ""}
            >
              <div
                className={`${active
                    ? "text-primary-600"
                    : "text-gray-500 group-hover:text-gray-900"
                  } flex-shrink-0`}
              >
                {item.icon}
              </div>

              <span
                className={`
                transition-all duration-200 leading-tight text-center
                ${showExpanded
                    ? "text-sm font-medium w-auto whitespace-nowrap opacity-100" // Open: show text
                    : "text-xs font-medium opacity-100" // Closed: show text small
                  }
              `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
