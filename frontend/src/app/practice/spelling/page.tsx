import dynamic from "next/dynamic";
import Loading from "@/app/loading";
import { DashboardLayout } from "@/shared/components/layout";

const SpellingPractice = dynamic(
  () =>
    import("@/features/practice/components/SpellingPractice").then((mod) => ({
      default: mod.SpellingPractice,
    })),
  {
    loading: () => <Loading />,

  }
);

export const metadata = {
  title: "Luyện tập đánh vần - Luyện tập - VietSignSchool",
  description: "Đánh vần từ bằng ký hiệu chữ cái",
};

export default function SpellingPracticePage() {
  return (
    <DashboardLayout>
      <SpellingPractice />
    </DashboardLayout>
  );
}
