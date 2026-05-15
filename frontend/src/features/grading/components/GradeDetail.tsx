"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Checkbox, Spin, message, Modal } from "antd";
import { useParams, useRouter } from "next/navigation";
import {
  fetchPracticeSubmission,
  markPracticeSubmission,
} from "@/services/examService";

interface PracticeQuestionResult {
  contentFromVocabulary: string;
  videoUrl?: string; // Student video
  aiAnswer?: string; // Optional
  questionId?: number;
}

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

  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Helper for video URL
  const getFullUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    // Use dynamic import to avoid circular deps
    const { normalizeFileUrl } = require("@/services/uploadService");
    return normalizeFileUrl(url);
  };

  useEffect(() => {
    if (!examId || !userId) return;
    setLoading(true);

    // Fetch user for title
    import("@/services/userService").then(({ fetchUserById }) => {
      fetchUserById(Number(userId)).then((user) => {
        if (user?.name) {
          document.title = `Chấm điểm: ${user.name} - Chấm điểm - VietSignSchool`;
        }
      });
    });

    fetchPracticeSubmission(Number(examId), Number(userId))
      .then((response: any) => {
        // API returns { success, data: [...] }
        const data = response?.data || response;
        if (Array.isArray(data)) {
          const list = data.map((q: any) => ({
            contentFromVocabulary: q.contentFromVocabulary || q.content,
            videoUrl: q.studentVideoUrl || q.videos?.[0]?.videoUrl || "",
            aiAnswer: q.aiAnswer || "",
            questionId: q.vocabularyId,
          }));
          setPracticeQuestions(list);
          setGradingList(list.map(() => ({ isCorrect: null })));
        } else {
          setPracticeQuestions([]);
        }
      })
      .catch((err: any) => {
        console.error("fetchPracticeSubmission error:", err);
        message.error("Lỗi lấy bài làm");
      })
      .finally(() => setLoading(false));
  }, [examId, userId]);

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
        details: gradingList, // Optional: save detailed grading
      });
      message.success(`Đã lưu điểm: ${score}/10`);
      router.push("/grading");
    } catch (e) {
      message.error("Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Câu hỏi",
      dataIndex: "contentFromVocabulary",
      key: "contentFromVocabulary",
      width: 250,
    },
    {
      title: "Video học sinh",
      dataIndex: "videoUrl",
      key: "videoUrl",
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
      title: "Chấm điểm",
      key: "grading",
      width: 200,
      render: (_: any, __: any, idx: number) => (
        <div className="flex gap-4">
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
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Spin spinning={loading}>
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold">Chấm điểm chi tiết</h2>
          <div>
            <Button onClick={() => router.push("/grading")} className="mr-4">
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleSaveGrading}
              className="bg-blue-600"
            >
              Lưu kết quả
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={practiceQuestions}
          rowKey={(r, i) => String(i)}
          pagination={false}
          bordered
          className="shadow-sm rounded-lg"
        />
      </Spin>

      <Modal
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setCurrentVideoUrl(undefined);
        }}
        footer={null}
        width={700}
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
