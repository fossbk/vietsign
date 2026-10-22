"use client";
import React from "react";
import { PlayCircle, BrainCircuit, Clock, Target, Sparkles, Heart } from "lucide-react";
import { FeatureCardProps } from "@/shared/types";

const FeatureItem: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  reverse,
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row ${
        reverse ? "md:flex-row-reverse" : ""
      } items-center gap-10 md:gap-20 py-16`}
    >
      <div className="flex-shrink-0 group">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-100 shadow-xl flex items-center justify-center text-primary-600 group-hover:scale-105 group-hover:shadow-2xl transition-all duration-500">
          {icon}
        </div>
      </div>
      <div
        className={`text-center ${
          reverse ? "md:text-left" : "md:text-right"
        } max-w-lg`}
      >
        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
      </div>
    </div>
  );
};

export const Features: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-50 rounded-full blur-3xl opacity-50 dark:hidden"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-50 dark:hidden"></div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Sparkles size={16} />
            Tại sao chọn VietSignSchool?
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Học ngôn ngữ ký hiệu <span className="text-primary-600">hiệu quả</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Phương pháp học tập hiện đại kết hợp video, bài tập tương tác 
            và trí tuệ nhân tạo để giúp bạn tiến bộ nhanh chóng.
          </p>
        </div>

        {/* Feature 1 */}
        <FeatureItem
          icon={<PlayCircle size={72} className="ml-1" />}
          title="Video minh họa sống động"
          description="Học ngôn ngữ ký hiệu qua video chất lượng cao với góc quay rõ ràng, tốc độ phát có thể điều chỉnh và mô tả chi tiết bằng AI."
          reverse={true}
        />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4"></div>

        {/* Feature 2 */}
        <FeatureItem
          icon={<BrainCircuit size={72} />}
          title="Học tập tương tác thông minh"
          description="Tham gia các bài tập tương tác, bài giảng ngắn gọn và bài ôn tập được cá nhân hóa theo tiến độ học tập của bạn."
          reverse={false}
        />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4"></div>

        {/* Feature 3 */}
        <FeatureItem
          icon={<Clock size={72} />}
          title="Tiết kiệm thời gian"
          description="Chương trình học theo mô-đun linh hoạt, phù hợp với lịch trình bận rộn. Học mọi lúc, mọi nơi chỉ với 10 phút mỗi ngày."
          reverse={true}
        />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4"></div>

        {/* Feature 4 */}
        <FeatureItem
          icon={<Heart size={72} />}
          title="Cộng đồng hỗ trợ"
          description="Kết nối với cộng đồng người học, giáo viên và người khiếm thính. Chia sẻ kinh nghiệm và cùng nhau tiến bộ."
          reverse={false}
        />
      </div>

      {/* Call to Action */}
      <div className="mt-20 text-center">
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 rounded-2xl shadow-xl">
          <div className="text-white text-left">
            <h3 className="font-bold text-xl mb-1">Bắt đầu học miễn phí</h3>
            <p className="text-green-100 text-base ">Học mọi lúc, mọi nơi</p>
          </div>
          <button className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-full hover:bg-green-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Đăng ký ngay
          </button>
        </div>
      </div>
    </section>
  );
};
