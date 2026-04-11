import dynamic from "next/dynamic";
import Loading from "@/app/loading";
import { DashboardLayout } from "@/shared/components/layout";

const WordPractice = dynamic(
  () =>
    import("@/features/practice/components/WordPractice").then((mod) => ({
      default: mod.WordPractice,
    })),
  {
    loading: () => <Loading />,

  }
);

export const metadata = {
  title: "Luyện tập theo từ - Luyện tập - VietSignSchool",
  description: "Học và thực hành các ký hiệu cho từng từ riêng lẻ",
};

export default function WordPracticePage() {
  return (
    <DashboardLayout>
      <WordPractice />
    </DashboardLayout>
  );
}
