/* eslint-disable @next/next/no-img-element */
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Form,
  Pagination,
  Radio,
  Skeleton,
  message,
  Modal,
} from "antd";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, PlayCircle, ImageIcon } from "lucide-react";
import { fetchExamById, submitExam } from "@/services/examService";
import { API_BASE_URL } from "@/core/config/api"; // Ensure this exists or use relative path if needed

// Helper to get full media URL
const getFullUrl = (path?: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // If API_BASE_URL is defined, use it, otherwise relative
  const baseUrl = "http://localhost:5000"; // Fallback or imported config
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function QuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const searchParams = useSearchParams();
  const isRedo = searchParams.get("redo") === "true";
  const isReview = searchParams.get("review") === "true";

  const [form] = Form.useForm();
  const [currentPage, setCurrentPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(isReview);
  const [examScore, setExamScore] = useState<number | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [mediaModal, setMediaModal] = useState<{
    visible: boolean;
    type: "video" | "image" | null;
    url: string;
    title: string;
  }>({ visible: false, type: null, url: "", title: "" });

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
  }, []);

  const {
    data: detailExam,
    isLoading,
    refetch: refetchExam,
  } = useQuery({
    queryKey: ["getExamDetail", id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchExamById(Number(id));
    },
    enabled: !!id,
  });

  // Questions are embedded in the exam detail in our updated backend logic
  // Use 'any' type to avoid TS errors on dynamic field 'questionsList'
  const lstQuestions = (detailExam as any)?.questionsList || [];

  // Logic for redo/review (fetching old attempts) is omitted for now
  // until backend supports fetching detailed attempts.

  const isCompleted = submitted || isReview;

  const showMediaModal = (answer: any) => {
    const vLoc =
      answer.videoLocation ||
      answer.video_location ||
      answer.video ||
      answer.videoUrl;
    const iLoc =
      answer.imageLocation ||
      answer.image_location ||
      answer.image ||
      answer.imageUrl;

    const videoUrl = getFullUrl(vLoc);
    const imageUrl = getFullUrl(iLoc);

    if (vLoc) {
      setMediaModal({
        visible: true,
        type: "video",
        url: videoUrl,
        title: `Đáp án`,
      });
    } else if (iLoc) {
      setMediaModal({
        visible: true,
        type: "image",
        url: imageUrl,
        title: `Đáp án`,
      });
    }
  };

  const renderAnswerContent = (answer: any) => {
    const vLoc =
      answer.videoLocation ||
      answer.video_location ||
      answer.video ||
      answer.videoUrl;
    const iLoc =
      answer.imageLocation ||
      answer.image_location ||
      answer.image ||
      answer.imageUrl;
    const hasMedia = vLoc || iLoc;

    if (!answer.content && hasMedia) {
      return (
        <div className="flex items-center gap-2">
          <Button
            type="link"
            icon={vLoc ? <PlayCircle size={16} /> : <ImageIcon size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              showMediaModal(answer);
            }}
            className="p-0"
          >
            {vLoc ? `Xem video` : `Xem hình ảnh`}
          </Button>
          {showResults && answer.correct && (
            <span className="ml-2 text-green-600 font-bold">(Đáp án đúng)</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center flex-wrap">
        <span>{answer.content}</span>
        {hasMedia && (
          <Button
            type="link"
            size="small"
            icon={vLoc ? <PlayCircle size={16} /> : <ImageIcon size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              showMediaModal(answer);
            }}
            className="ml-2"
          >
            {vLoc ? "Video" : "Hình ảnh"}
          </Button>
        )}
        {showResults && answer.correct && (
          <span className="ml-2 text-green-600 font-bold">(Đáp án đúng)</span>
        )}
      </div>
    );
  };

  const [allAnswers, setAllAnswers] = useState<{ [index: number]: any }>({});

  const mutationSubmit = useMutation({
    mutationFn: async (payload: any) => {
      return await submitExam(Number(id), payload);
    },
    onSuccess: (data: any) => {
      Modal.success({
        title: "Nộp bài thành công!",
        content: (
          <div className="py-4 text-center">
            <p className="text-lg">Chúc mừng bạn đã hoàn thành bài kiểm tra.</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              Điểm của bạn: {examScore?.toFixed(1)}/10
            </p>
          </div>
        ),
        okText: "Quay lại danh sách",
        onOk: () => {
          router.push("/take-exam");
        },
      });
      setSubmitted(true);
      setShowResults(true);
    },
    onError: () => {
      message.error("Nộp bài thất bại.");
    },
  });

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch (e) {
      // Form validations
    }

    // Checking if all questions answered? Optional.

    // Calculate Score Client-Side
    let correctCount = 0;
    const answerPayload: any[] = [];

    lstQuestions.forEach((q: any, index: number) => {
      const selected = allAnswers[index];
      const selectedArr = Array.isArray(selected)
        ? selected
        : selected
          ? [selected]
          : [];

      // Check correctness
      // Backend returns answerResList with 'correct' boolean
      const correctAnswers = q.answerResList
        .filter((a: any) => a.correct)
        .map((a: any) => a.answerId); // number

      // Compare sorted arrays
      const s1 = [...correctAnswers].sort().toString();
      const s2 = [...selectedArr].sort().toString();

      let isCorrect = false;
      if (s1 === s2 && s1 !== "") {
        correctCount++;
        isCorrect = true;
      }

      answerPayload.push({
        questionId: q.questionId,
        selectedAnswers: selectedArr,
        isCorrect: isCorrect,
      });
    });

    const score = parseFloat(
      ((correctCount / (lstQuestions.length || 1)) * 10).toFixed(2),
    );
    setExamScore(score);

    if (!user) {
      message.error("Vui lòng đăng nhập để nộp bài");
      return;
    }

    const payload = {
      student_id: user.id || user.user_id,
      score: score,
      answers: answerPayload,
      time_spent: "00:00:00", // Implement timer if needed
    };

    // Show confirm
    Modal.confirm({
      title: "Xác nhận nộp bài",
      content: `Bạn đã làm được ${Object.keys(allAnswers).length}/${lstQuestions.length} câu. Bạn có chắc chắn muốn nộp?`,
      onOk: () => {
        mutationSubmit.mutate(payload);
      },
    });
  };

  // Pagination
  const questionsPerPage = 1;
  const currentQuestion = lstQuestions?.[currentPage - 1];

  if (isLoading) return <Skeleton active className="p-10" />;
  if (!detailExam)
    return <div className="p-10">Không tìm thấy bài kiểm tra</div>;

  return (
    <div className="p-4 md:p-10 bg-gray-50 min-h-screen">
      <Breadcrumb
        className="mb-6"
        items={[
          {
            title: (
              <span className="cursor-pointer" onClick={() => router.back()}>
                <ArrowLeft size={16} /> Quay lại
              </span>
            ),
          },
          { title: detailExam.title },
        ]}
      />

      <Form form={form} layout="vertical">
        {currentQuestion ? (
          <Card
            title={
              <div
                style={{ fontSize: 18, fontWeight: 700, whiteSpace: "normal" }}
              >
                Câu {currentPage}: {currentQuestion.content}
              </div>
            }
            className="mb-6 shadow-md rounded-xl"
            extra={
              showResults && (
                <span
                  className={
                    allAnswers[currentPage - 1]
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                >
                  {allAnswers[currentPage - 1] ? "Đã chọn" : "Chưa chọn"}
                </span>
              )
            }
          >
            {/* Media Display */}
            {(currentQuestion.videoLocation ||
              currentQuestion.video_location ||
              currentQuestion.video ||
              currentQuestion.videoUrl ||
              currentQuestion.imageLocation ||
              currentQuestion.image_location ||
              currentQuestion.image ||
              currentQuestion.imageUrl) && (
              <div className="flex justify-center mb-6 bg-gray-100 p-4 rounded-lg">
                {(currentQuestion.videoLocation ||
                  currentQuestion.video_location ||
                  currentQuestion.video ||
                  currentQuestion.videoUrl) && (
                  <video
                    width="100%"
                    style={{ maxWidth: 500, maxHeight: 300 }}
                    controls
                  >
                    <source
                      src={getFullUrl(
                        currentQuestion.videoLocation ||
                          currentQuestion.video_location ||
                          currentQuestion.video ||
                          currentQuestion.videoUrl,
                      )}
                      type="video/mp4"
                    />
                  </video>
                )}
                {(currentQuestion.imageLocation ||
                  currentQuestion.image_location ||
                  currentQuestion.image ||
                  currentQuestion.imageUrl) && (
                  <img
                    src={getFullUrl(
                      currentQuestion.imageLocation ||
                        currentQuestion.image_location ||
                        currentQuestion.image ||
                        currentQuestion.imageUrl,
                    )}
                    alt="Question Media"
                    style={{
                      maxWidth: 400,
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
            )}

            <Form.Item name={["answerList", currentPage - 1]} className="mb-0">
              {currentQuestion.questionType === "MULTIPLE_ANSWERS" ? (
                <Checkbox.Group
                  disabled={submitted || showResults}
                  value={allAnswers[currentPage - 1] || []}
                  onChange={(value) => {
                    setAllAnswers((prev) => ({
                      ...prev,
                      [currentPage - 1]: value,
                    }));
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.answerResList?.map((answer: any) => (
                      <div
                        key={answer.answerId}
                        className={`p-4 rounded-lg border transition-colors ${
                          showResults && answer.correct
                            ? "bg-green-50 border-green-300"
                            : "bg-white border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <Checkbox value={answer.answerId} className="w-full">
                          {renderAnswerContent(answer)}
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                </Checkbox.Group>
              ) : (
                <Radio.Group
                  value={allAnswers[currentPage - 1]}
                  onChange={(e) => {
                    setAllAnswers((prev) => ({
                      ...prev,
                      [currentPage - 1]: e.target.value,
                    }));
                  }}
                  className="w-full"
                  disabled={submitted || showResults}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.answerResList?.map((answer: any) => (
                      <div
                        key={answer.answerId}
                        className={`p-4 rounded-lg border transition-colors ${
                          showResults && answer.correct
                            ? "bg-green-50 border-green-300"
                            : "bg-white border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <Radio value={answer.answerId} className="w-full">
                          {renderAnswerContent(answer)}
                        </Radio>
                      </div>
                    ))}
                  </div>
                </Radio.Group>
              )}
            </Form.Item>
          </Card>
        ) : (
          <div className="p-10 text-center">Không có câu hỏi nào.</div>
        )}

        <div className="flex justify-between items-center mt-8 bg-white p-4 rounded-xl shadow-sm">
          <Pagination
            current={currentPage}
            total={lstQuestions?.length || 0}
            pageSize={questionsPerPage}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />

          <div className="flex gap-4">
            {submitted && (
              <div className="text-xl font-bold text-blue-600">
                Điểm: {examScore?.toFixed(1)}/10
              </div>
            )}
            {!submitted && !isReview && lstQuestions.length > 0 && (
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={mutationSubmit.isPending}
                className="bg-blue-600"
              >
                Nộp bài
              </Button>
            )}
            {isReview && (
              <Button onClick={() => router.push("/exam")}>
                Quay lại danh sách
              </Button>
            )}
          </div>
        </div>
      </Form>

      {/* Media Modal */}
      <Modal
        title={mediaModal.title}
        open={mediaModal.visible}
        onCancel={() =>
          setMediaModal({ visible: false, type: null, url: "", title: "" })
        }
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        <div className="flex justify-center bg-black rounded-lg overflow-hidden">
          {mediaModal.type === "video" && mediaModal.url && (
            <video
              width="100%"
              controls
              autoPlay
              key={mediaModal.url}
              style={{ maxHeight: "80vh" }}
            >
              <source src={mediaModal.url} type="video/mp4" />
            </video>
          )}
          {mediaModal.type === "image" && mediaModal.url && (
            <img
              src={mediaModal.url}
              alt="Answer Media"
              style={{ maxHeight: "80vh", objectFit: "contain" }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
