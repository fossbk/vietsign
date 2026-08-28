import { Metadata } from "next";
import { DashboardLayout } from "@/shared/components/layout";
import { TopicsManagement } from "@/features/management/topics";

export const metadata: Metadata = {
  title: "Quản lý chủ đề - VietSignSchool",
  description: "Tạo và quản lý kho chủ đề của giáo viên",
};

export default function TopicsManagementPage() {
  return (
    <DashboardLayout>
      <TopicsManagement />
    </DashboardLayout>
  );
}
