import { redirect } from "next/navigation";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  redirect(`/take-exam/${examId}`);
}
