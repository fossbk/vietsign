import React from "react";
import { Metadata } from "next";
import { DashboardLayout } from "@/shared/components/layout";
import { ActivityPlayer } from "@/features/curriculum";

export const metadata: Metadata = {
  title: "Hoạt động học tập - VietSignSchool",
  description: "Hoạt động học ngôn ngữ ký hiệu tương tác",
};

export default function ActivityPage() {
  return (
    <DashboardLayout>
      <ActivityPlayer />
    </DashboardLayout>
  );
}
