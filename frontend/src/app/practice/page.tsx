import dynamic from "next/dynamic";
import Loading from "@/app/loading";
import { DashboardLayout } from "@/shared/components/layout";

const PracticeModeSelection = dynamic(
  () =>
    import("@/features/practice").then((mod) => ({
      default: mod.PracticeModeSelection,
    })),
  {
    loading: () => <Loading />,

  }
);

export const metadata = {
  title: "Luyện tập - VietSignSchool",
  description: "Chọn chế độ luyện tập ký hiệu ngôn ngữ",
};

export default function PracticePage() {
  return (
    <DashboardLayout>
      <PracticeModeSelection />
    </DashboardLayout>
  );
}
