import { Metadata } from "next";
import { DashboardLayout } from "@/shared/components/layout";
import { TopicLearning } from "@/features/study/components/topic";

export const metadata: Metadata = {
  title: "Học theo chủ đề - VietSignSchool",
  description: "Học từ vựng theo chủ đề",
};

export default function TopicLearningPage() {
  return (
    <DashboardLayout>
      <TopicLearning />
    </DashboardLayout>
  );
}
