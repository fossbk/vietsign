"use client";
import React from "react";
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Gamepad2,
  Monitor,
  Smartphone,
  GraduationCap,
  Users,
  Award,
} from "lucide-react";
import { LearningToolProps, DictionaryMode } from "@/shared/types";

interface HeroProps {
  onOpenTool: (mode: DictionaryMode) => void;
}

const ToolCard: React.FC<LearningToolProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 group transform hover:-translate-y-2"
  >
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="text-primary-600 group-hover:text-primary-700 transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const StatItem: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="flex items-center gap-3 text-white/90">
    <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
    <div>
      <div className="font-bold text-2xl">{value}</div>
      <div className="text-sm text-green-200">{label}</div>
    </div>
  </div>
);

export const Hero: React.FC<HeroProps> = ({ onOpenTool }) => {
  const router = useRouter();

  const handleDesktopClick = () => {
    router.push('/login');
  };

  const handleAndroidClick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.ibme.wesign2', '_blank');
  };

  const handleIOSClick = () => {
    window.open('https://apps.apple.com/vn/app/wesign/id6737101584?l=vi', '_blank');
  };

  return (
    <section className="relative pt-16 min-h-[700px] flex flex-col md:flex-row">
      {/* Left Side: Dark Green Gradient */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white flex flex-col justify-center px-8 lg:px-16 py-20 md:py-0 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 w-fit">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium">Nền tảng học ngôn ngữ ký hiệu #1 Việt Nam</span>
        </div>

        <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
          VietSign<span className="text-green-300">School</span> <br />
          <span className="bg-gradient-to-r from-green-200 to-green-300 bg-clip-text text-transparent">
            Ngôn ngữ ký hiệu
          </span>
        </h1>
        
        <p className="text-green-100 mb-8 max-w-lg text-lg leading-relaxed">
          Học ngôn ngữ ký hiệu Việt Nam dễ dàng với video minh họa, 
          bài tập tương tác và cộng đồng hỗ trợ. Kết nối với thế giới im lặng.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-8 mb-10">
          <StatItem
            icon={<Users size={20} />}
            value="10,000+"
            label="Học viên"
          />
          <StatItem
            icon={<BookOpen size={20} />}
            value="500+"
            label="Từ vựng"
          />
          <StatItem
            icon={<Award size={20} />}
            value="50+"
            label="Bài học"
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Main CTA */}
          <button
            onClick={handleDesktopClick}
            className="relative z-10 flex items-center justify-center gap-3 px-8 py-4 bg-white text-primary-700 font-semibold rounded-full hover:bg-green-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Monitor size={22} />
            <span>Bắt đầu học ngay</span>
          </button>
          
          {/* App Download Buttons */}
          <div className="flex flex-row gap-3">
            <button
              onClick={handleAndroidClick}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm group"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-white/70 leading-none">Tải về trên</p>
                <p className="text-sm font-semibold leading-tight">Google Play</p>
              </div>
            </button>
            <button
              onClick={handleIOSClick}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm group"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-white/70 leading-none">Tải về trên</p>
                <p className="text-sm font-semibold leading-tight">App Store</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Light Background */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center px-8 lg:px-16 py-20 md:py-0 relative">
        <div className="max-w-lg mx-auto w-full">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1 dark:bg-primary-100 dark:text-primary-700 rounded-full text-sm font-medium mb-4">
              Công cụ học tập
            </span>
            <h2 className="text-3xl font-bold dark:text-gray-400 mb-3">
              Khám phá các tính năng
            </h2>
            <p className="dark:text-gray-400">
              Chọn công cụ phù hợp để bắt đầu hành trình học tập
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ToolCard
              icon={<BookOpen size={28} />}
              title="Từ điển"
              description="Tìm kiếm ký hiệu theo chủ đề hoặc từ khóa với AI."
              onClick={() => onOpenTool(DictionaryMode.SEARCH)}
            />
            <ToolCard
              icon={<Calendar size={28} />}
              title="Ký hiệu mỗi ngày"
              description="Học một ký hiệu mới mỗi ngày qua email."
              onClick={() => onOpenTool(DictionaryMode.SIGN_OF_DAY)}
            />
            <ToolCard
              icon={<Gamepad2 size={28} />}
              title="Trò chơi"
              description="Ôn tập ký hiệu qua các trò chơi thú vị."
              onClick={() => onOpenTool(DictionaryMode.GAME)}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
