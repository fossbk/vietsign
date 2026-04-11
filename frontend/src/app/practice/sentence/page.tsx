import dynamic from "next/dynamic";
import Loading from "@/app/loading";
import { DashboardLayout } from "@/shared/components/layout";

const SentencePractice = dynamic(
  () =>
    import("@/features/practice/components/SentencePractice").then((mod) => ({
      default: mod.SentencePractice,
    })),
  {
    loading: () => <Loading />,

  }
);

export const metadata = {
  title: "Luyện tập theo câu - Luyện tập - VietSignSchool",
  description: "Thực hành ghép các ký hiệu thành câu hoàn chỉnh",
};

export default function SentencePracticePage() {
  return (
    <DashboardLayout>
      <SentencePractice />
    </DashboardLayout>
  );
}
