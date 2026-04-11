import dynamic from "next/dynamic";
import Loading from "@/app/loading";
import { DashboardLayout } from "@/shared/components/layout";

const AiPractice = dynamic(
  () =>
    import("@/features/practice/components/AiPractice").then((mod) => ({
      default: mod.AiPractice,
    })),
  {
    loading: () => <Loading />,

  }
);

export const metadata = {
  title: "Luyện tập AI - Luyện tập - VietSignSchool",
  description: "Thực hiện ký hiệu và AI sẽ nhận diện",
};

export default function AiPracticePage() {
  return (
    <DashboardLayout>
      <AiPractice />
    </DashboardLayout>
  );
}
