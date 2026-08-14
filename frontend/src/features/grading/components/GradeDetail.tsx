"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Empty,
  message,
  Modal,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useParams, useRouter } from "next/navigation";
import {
  fetchPracticeSubmission,
  markPracticeSubmission,
} from "@/services/examService";

type PracticeAiResult = {
  model_code?: string;
  status?: string;
  target_text?: string | null;
  predicted_label?: string | number | null;
  action_name?: string | null;
  label_name?: string | null;
  confidence?: number | string | null;
  is_match?: boolean | number | null;
  error_message?: string | null;
};

interface PracticeQuestionResult {
  id?: number;
  contentFromVocabulary: string;
  videoUrl?: string;
  aiAnswer?: string;
  aiResults: PracticeAiResult[];
  isCorrect?: boolean | number | null;
  questionId?: number;
}

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: number[] }).data)
  ) {
    const first = (value as { data: number[] }).data[0];
    if (first === 1) return true;
    if (first === 0) return false;
  }

  return null;
};

const getConfidencePercent = (value: PracticeAiResult["confidence"]) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round((numeric <= 1 ? numeric * 100 : numeric) * 10) / 10;
};

const getAiText = (result: PracticeAiResult) =>
  result.action_name ||
  result.label_name ||
  (result.predicted_label != null ? String(result.predicted_label) : "");

const getFullUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const { normalizeFileUrl } = require("@/services/uploadService");
  return normalizeFileUrl(url);
};

const AiResultTag = ({ result }: { result: PracticeAiResult }) => {
  const isMatch = toBoolean(result.is_match);
  const confidence = getConfidencePercent(result.confidence);
  const predictedText = getAiText(result);

  if (result.status === "FAILED") {
    return (
      <Tooltip title={result.error_message || "AI chấm thất bại"}>
        <Tag color="red">{result.model_code}: Lỗi AI</Tag>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase text-gray-700">
          {result.model_code || "AI"}
        </span>
        <Tag color={isMatch === true ? "green" : isMatch === false ? "red" : "default"}>
          {isMatch === true ? "Đúng" : isMatch === false ? "Sai" : "Chưa đối chiếu"}
        </Tag>
      </div>
      <div className="text-sm text-gray-700">
        Dự đoán: <b>{predictedText || "Không có kết quả"}</b>
      </div>
      <div className="text-xs text-gray-500">
        Từ cần đoán: {result.target_text || "--"}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Độ tin cậy: {confidence == null ? "--" : `${confidence}%`}
      </div>
    </div>
  );
};

const GradeDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId;
  const userId = params.userId;

  const [loading, setLoading] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<
    PracticeQuestionResult[]
  >([]);
  const [gradingList, setGradingList] = useState<
    { isCorrect: boolean | null }[]
  >([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>();
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (!examId || !userId) return;
    setLoading(true);

    import("@/services/userService").then(({ fetchUserById }) => {
      fetchUserById(Number(userId)).then((user) => {
        if (user?.name) {
          document.title = `Chấm điểm: ${user.name} - VietSignSchool`;
        }
      });
    });

    fetchPracticeSubmission(Number(examId), Number(userId))
      .then((response: any) => {
        const data = response?.data || response;
        if (!Array.isArray(data)) {
          setPracticeQuestions([]);
          setGradingList([]);
          return;
        }

        const list = data.map((q: any) => {
          const aiResults = Array.isArray(q.aiResults) ? q.aiResults : [];
          return {
            id: q.id,
            contentFromVocabulary: q.contentFromVocabulary || q.content || "",
            videoUrl: q.studentVideoUrl || q.videos?.[0]?.videoUrl || "",
            aiAnswer: q.aiAnswer || "",
            aiResults,
            isCorrect: toBoolean(q.isCorrect),
            questionId: q.vocabularyId,
          };
        });

        setPracticeQuestions(list);
        setGradingList(
          list.map((item) => ({
            isCorrect: toBoolean(item.isCorrect),
          })),
        );
      })
      .catch((err: any) => {
        console.error("fetchPracticeSubmission error:", err);
        message.error("Lỗi lấy bài làm");
      })
      .finally(() => setLoading(false));
  }, [examId, userId]);

  const stats = useMemo(() => {
    const teacherCorrect = gradingList.filter((g) => g.isCorrect === true).length;
    const teacherWrong = gradingList.filter((g) => g.isCorrect === false).length;
    const aiByModel = ["model1", "model3"].map((modelCode) => {
      const results = practiceQuestions
        .flatMap((q) => q.aiResults)
        .filter((item) => item.model_code === modelCode);
      const correct = results.filter((item) => toBoolean(item.is_match) === true).length;
      const wrong = results.filter((item) => toBoolean(item.is_match) === false).length;
      const failed = results.filter((item) => item.status === "FAILED").length;
      return { modelCode, total: results.length, correct, wrong, failed };
    });

    return {
      total: practiceQuestions.length,
      teacherCorrect,
      teacherWrong,
      aiByModel,
    };
  }, [gradingList, practiceQuestions]);

  const handleGradeChange = (index: number, value: boolean) => {
    setGradingList((prev) => {
      const updated = [...prev];
      updated[index] = { isCorrect: value };
      return updated;
    });
  };

  const showVideoModal = (url: string) => {
    setCurrentVideoUrl(getFullUrl(url));
    setIsModalVisible(true);
  };

  const handleSaveGrading = async () => {
    const total = gradingList.length;
    const correct = gradingList.filter((g) => g.isCorrect === true).length;
    const score = total > 0 ? Math.round((correct / total) * 10 * 10) / 10 : 0;

    setLoading(true);
    try {
      await markPracticeSubmission({
        examId: Number(examId),
        userId: Number(userId),
        score,
        details: gradingList,
      });
      message.success(`Đã lưu điểm: ${score}/10`);
      router.push("/grading");
    } catch (e) {
      message.error("Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<PracticeQuestionResult> = [
    {
      title: "Từ cần đoán",
      dataIndex: "contentFromVocabulary",
      key: "contentFromVocabulary",
      width: 220,
      render: (text: string) => <span className="font-medium">{text || "--"}</span>,
    },
    {
      title: "Video học sinh",
      dataIndex: "videoUrl",
      key: "videoUrl",
      width: 150,
      render: (url: string) =>
        url ? (
          <Button type="link" onClick={() => showVideoModal(url)}>
            Xem video
          </Button>
        ) : (
          <span className="text-gray-400">Chưa nộp</span>
        ),
    },
    {
      title: "Kết quả AI chấm",
      key: "aiResults",
      render: (_: unknown, record: PracticeQuestionResult) =>
        record.aiResults.length > 0 ? (
          <div className="grid min-w-[420px] grid-cols-1 gap-2 xl:grid-cols-2">
            {record.aiResults.map((result, index) => (
              <AiResultTag
                key={`${result.model_code || "ai"}-${index}`}
                result={result}
              />
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có kết quả AI"
          />
        ),
    },
    {
      title: "Giáo viên chấm",
      key: "grading",
      width: 220,
      render: (_: unknown, __: PracticeQuestionResult, idx: number) => (
        <Space>
          <Checkbox
            checked={gradingList[idx]?.isCorrect === true}
            onChange={() => handleGradeChange(idx, true)}
            className="text-green-600"
          >
            Đúng
          </Checkbox>
          <Checkbox
            checked={gradingList[idx]?.isCorrect === false}
            onChange={() => handleGradeChange(idx, false)}
            className="text-red-600"
          >
            Sai
          </Checkbox>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Spin spinning={loading}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Chấm điểm chi tiết</h2>
          <Space>
            <Button onClick={() => router.push("/grading")}>Hủy</Button>
            <Button
              type="primary"
              onClick={handleSaveGrading}
              className="bg-blue-600"
            >
              Lưu kết quả
            </Button>
          </Space>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Tổng số câu</div>
            <div className="mt-1 text-2xl font-bold">{stats.total}</div>
            <div className="mt-3 text-sm text-gray-600">
              Giáo viên: {stats.teacherCorrect} đúng, {stats.teacherWrong} sai
            </div>
          </div>
          {stats.aiByModel.map((item) => {
            const percent =
              item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
            return (
              <div
                key={item.modelCode}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="text-sm font-semibold uppercase text-gray-700">
                  {item.modelCode}
                </div>
                <Progress percent={percent} size="small" />
                <div className="mt-2 text-sm text-gray-600">
                  {item.correct} đúng, {item.wrong} sai, {item.failed} lỗi
                </div>
              </div>
            );
          })}
        </div>

        <Table
          columns={columns}
          dataSource={practiceQuestions}
          rowKey={(record, index) => String(record.id || index)}
          pagination={false}
          bordered
          scroll={{ x: 980 }}
          className="rounded-lg shadow-sm"
        />
      </Spin>

      <Modal
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setCurrentVideoUrl(undefined);
        }}
        footer={null}
        width={760}
        destroyOnClose
        title="Video bài làm"
      >
        {currentVideoUrl && (
          <video controls autoPlay width="100%">
            <source src={currentVideoUrl} type="video/webm" />
            <source src={currentVideoUrl} type="video/mp4" />
          </video>
        )}
      </Modal>
    </div>
  );
};

export default GradeDetail;
