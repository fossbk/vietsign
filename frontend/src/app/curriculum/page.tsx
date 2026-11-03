import React from "react";
import { Metadata } from "next";
import { DashboardLayout } from "@/shared/components/layout";
import { CurriculumList } from "@/features/curriculum";

export const metadata: Metadata = {
  title: "Chương trình học ký hiệu - VietSignSchool",
  description: "Khung chương trình hỗ trợ dạy và học ngôn ngữ ký hiệu cho học sinh khiếm thính",
};

export default function CurriculumPage() {
  return (
    <DashboardLayout>
      <CurriculumList />
    </DashboardLayout>
  );
}
