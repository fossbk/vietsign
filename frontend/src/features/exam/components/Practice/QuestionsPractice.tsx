"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, message, Spin, Select } from "antd";
import Webcam from "react-webcam";
import {
  fetchPracticeExamDetail,
  submitPracticeExam,
} from "@/services/examService";
import { fetchWordById } from "@/services/dictionaryService";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type VideoData = {
  file: File;
  previewUrl: string;
};

const QuestionsPractice: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const examId = params?.id;
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [videoList, setVideoList] = useState<(VideoData | null)[]>([]);
  const [showPreview, setShowPreview] = useState<{
    open: boolean;
    url: string;
  }>({
    open: false,
    url: "",
  });
  const [confirmModal, setConfirmModal] = useState(false);
  const [recordDuration, setRecordDuration] = useState<number>(3); // Thời gian quay mặc định 3 giây

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Kiểm tra xem có phải là trang review không
  const isReview = searchParams.get("review") === "true";

  // Thêm state cho video mẫu
  const [sampleVideos, setSampleVideos] = useState<string[]>([]);

  useEffect(() => {
    // Get user from localStorage
    const userJson = localStorage.getItem("user");
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
  }, []);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    fetchPracticeExamDetail(Number(examId))
      .then(async (data) => {
        if (data && Array.isArray(data)) {
          setPracticeQuestions(data);
          setVideoList(new Array(data.length).fill(null));
          if (isReview) {
            const vocabularyIds: number[] = data.map(
              (q: any) => q.vocabularyId,
            );
            const videoPromises = vocabularyIds.map((id) =>
              fetchWordById(id)
                .then((vocab) => vocab?.videoUrl || "")
                .catch(() => ""),
            );
            const videos = await Promise.all(videoPromises);
            setSampleVideos(videos);
          }
        } else {
          setPracticeQuestions([]);
          setVideoList([]);
        }
      })
      .catch(() => {
        message.error("Không lấy được danh sách câu hỏi thực hành");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId, isReview]);

  const handleStartRecording = () => {
    const stream = webcamRef.current?.stream;
    if (!stream) {
      message.error("Vui lòng đợi camera sẵn sàng hoặc cho phép quyền truy cập camera.");
      return;
    }

    setIsRecording(true);
    recordedChunksRef.current = [];
    // Khởi tạo MediaRecorder
    if (!stream || !(stream instanceof MediaStream)) {
      message.error("Không thể khởi tạo luồng video (MediaStream). Vui lòng kiểm tra camera.");
      return; // Or throw new Error("Không thể khởi tạo luồng video (MediaStream).");
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = handleSaveVideo;
    mediaRecorder.start();

    // Tự động dừng sau recordDuration giây
    recordTimeoutRef.current = setTimeout(() => {
      handleStopRecording();
    }, recordDuration * 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  };

  const handleSaveVideo = () => {
    if (recordedChunksRef.current.length === 0) {
      message.error("Không có dữ liệu video.");
      return;
    }

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const previewUrl = URL.createObjectURL(blob);
    // Use user.id instead of user.userId
    const userId = user?.id || user?.user_id || "unknown";
    const filename = `${examId}-${userId}-${currentWordIndex + 1}.webm`;
    const file = new File([blob], filename, { type: "video/webm" });

    setVideoList((prev) => {
      const updated = [...prev];
      updated[currentWordIndex] = { file, previewUrl };
      return updated;
    });

    recordedChunksRef.current = []; // reset sau khi lưu xong
    message.success(`Đã lưu video cho câu hỏi ${currentWordIndex + 1}`);
  };

  const handleSubmit = () => {
    setConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const validVideos = videoList.filter((v) => v !== null) as VideoData[];

    if (validVideos.length === 0) {
      message.warning("Bạn chưa quay video nào để nộp!");
      setConfirmModal(false);
      return;
    }

    if (!user) {
      message.error("Bạn chưa đăng nhập!");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("examId", String(examId));
      formData.append("userId", String(user.id || user.user_id));

      // Build the list of vocabularyIds in order (parallel with videos)
      const vocabIds: string[] = [];

      videoList.forEach((item, index) => {
        if (item?.file) {
          const question = practiceQuestions[index];
          // vocabularyId can be in different fields depending on API response shape
          const vocabId =
            question?.vocabularyId ??
            question?.vocabulary_id ??
            question?.vocabulary_exam_id ??
            "";

          vocabIds.push(String(vocabId));

          const now = new Date();
          const isoPart = now
            .toISOString()
            .replace(/[-:.]/g, "")
            .replace("T", "_")
            .replace("Z", "Z");
          const msPart = now.getTime();
          const timestamp = `${isoPart}_${msPart}`;

          // Include vocabId in filename as fallback for backend
          const fileName = `${examId}-${user.id || user.user_id}-${index + 1}-${vocabId || "0"}-${timestamp}.webm`;
          const file = new File([item.file], fileName, {
            type: item.file.type,
          });
          formData.append("videos", file);
        }
      });

      // Bug fix: explicitly send vocabularyIds so backend doesn't rely on filename parsing
      // Send as comma-separated string (backend handles both array and comma-separated)
      if (vocabIds.length > 0) {
        formData.append("vocabularyIds", vocabIds.join(","));
      }

      await submitPracticeExam(formData);
      message.success("Nộp bài thành công!");
      router.push("/take-exam");
    } catch (err) {
      console.error(err);
      message.error("Nộp bài thất bại!");
    }
    setLoading(false);
    setConfirmModal(false);
  };


  return (
    <Spin spinning={loading}>
      <div className="flex gap-4 p-4">
        <div className="w-1/3 bg-gray-100 p-6 rounded-md flex flex-col items-center">
          <h3 className="text-lg font-bold mb-6">Danh sách từ/câu</h3>
          <div
            className="mb-6 w-full text-center border-2 border-blue-400 rounded-lg p-6 bg-white shadow"
            style={{ minHeight: 120 }}
          >
            <div className="text-primary text-2xl font-bold mb-2">
              Câu hỏi {currentWordIndex + 1}/{practiceQuestions.length}
            </div>
            <div className="text-xl font-semibold text-gray-800">
              {practiceQuestions[currentWordIndex]?.contentFromExamVocabulary || 
               practiceQuestions[currentWordIndex]?.content || 
               practiceQuestions[currentWordIndex]?.vocabulary_content ||
               "Bài tập thực hành"}
            </div>
          </div>
          <div className="flex justify-between w-full gap-4 mt-4">
            <Button
              type="default"
              size="large"
              style={{
                flex: 1,
                background: "#f0f5ff",
                color: "#2f54eb",
                fontWeight: 600,
                border: "1.5px solid #2f54eb",
              }}
              disabled={currentWordIndex === 0}
              onClick={() => setCurrentWordIndex((i) => i - 1)}
            >
              ← Quay lại
            </Button>
            <Button
              type="primary"
              size="large"
              style={{
                flex: 1,
                background: "#2f54eb",
                color: "#fff",
                fontWeight: 600,
                border: "1.5px solid #2f54eb",
              }}
              disabled={currentWordIndex === practiceQuestions.length - 1}
              onClick={() => setCurrentWordIndex((i) => i + 1)}
            >
              Tiếp theo →
            </Button>
          </div>
        </div>

        <div className="w-2/3 bg-white p-6 rounded-md flex flex-col items-center">
          <h3 className="text-lg font-bold mb-4">
            {isReview
              ? "Video mẫu ngôn ngữ ký hiệu"
              : "Biểu diễn ngôn ngữ ký hiệu"}
          </h3>
          {isReview ? (
            // Hiển thị video mẫu
            sampleVideos[currentWordIndex] ? (
              <video
                controls
                src={sampleVideos[currentWordIndex]}
                style={{
                  width: "100%",
                  maxWidth: 900,
                  height: 520,
                  background: "#000",
                  borderRadius: 18,
                  objectFit: "cover",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                }}
              />
            ) : (
              <div>Không có video mẫu cho từ này.</div>
            )
          ) : (
            // Hiển thị webcam như cũ
            <>
              {/* Thêm chọn thời gian quay */}
              <div className="mb-4 flex items-center gap-4">
                <span>Chọn thời gian quay:</span>
                <Select
                  value={recordDuration}
                  style={{ width: 100 }}
                  onChange={setRecordDuration}
                  disabled={isRecording}
                  options={[
                    { value: 3, label: "3 giây" },
                    { value: 4, label: "4 giây" },
                    { value: 5, label: "5 giây" },
                  ]}
                />
              </div>
              <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full"
                style={{
                  width: "100%",
                  maxWidth: 900,
                  height: 520,
                  background: "#000",
                  borderRadius: 18,
                  objectFit: "cover",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                }}
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: "user",
                }}
              />
              <div className="flex justify-between w-full mt-8 gap-4">
                <Button
                  type="primary"
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  style={{
                    minWidth: 140,
                    fontWeight: 600,
                    fontSize: 16,
                    background: "#2f54eb",
                  }}
                >
                  Bắt đầu quay
                </Button>
                <Button
                  type="default"
                  onClick={handleStopRecording}
                  disabled={!isRecording}
                  style={{ minWidth: 140, fontWeight: 600, fontSize: 16 }}
                >
                  Dừng quay
                </Button>
                <Button
                  type="dashed"
                  disabled={!videoList[currentWordIndex]}
                  onClick={() =>
                    setShowPreview({
                      open: true,
                      url: videoList[currentWordIndex]?.previewUrl || "",
                    })
                  }
                  style={{
                    minWidth: 140,
                    fontWeight: 600,
                    fontSize: 16,
                    border: "1.5px dashed #2f54eb",
                    color: "#2f54eb",
                  }}
                >
                  Xem lại file
                </Button>
              </div>
            </>
          )}
          {/* Nút nộp bài chỉ hiển thị khi không phải review */}
          {!isReview && (
            <div className="flex justify-center w-full mt-10">
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                style={{
                  minWidth: 200,
                  fontWeight: 700,
                  fontSize: 18,
                  background: "#52c41a",
                  border: "none",
                }}
              >
                Nộp bài
              </Button>
            </div>
          )}
          {isReview && (
            <div className="flex justify-center mt-8">
              <Button
                type="primary"
                size="large"
                style={{
                  flex: 1,
                  background: "#2f54eb",
                  color: "#fff",
                  fontWeight: 600,
                  border: "1.5px solid #2f54eb",
                }}
                onClick={() => router.push("/exam")}
              >
                Quay về danh sách bài kiểm tra
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showPreview.open}
        onCancel={() => setShowPreview({ open: false, url: "" })}
        footer={null}
        title="Xem lại video"
        width={900}
        destroyOnClose
      >
        <div className="flex justify-center">
          {showPreview.url && (
            <video
              key={showPreview.url}
              controls
              src={showPreview.url}
              style={{ width: "100%", maxWidth: 800, borderRadius: 12 }}
            />
          )}
        </div>
      </Modal>

      <Modal
        open={confirmModal}
        onCancel={() => setConfirmModal(false)}
        onOk={handleConfirmSubmit}
        okText="Nộp bài"
        cancelText="Tiếp tục làm bài"
        title="Xác nhận nộp bài"
        width={600}
        destroyOnClose
        okButtonProps={{
          style: { background: "#2f54eb" },
        }}
      >
        <div>
          <p>Bạn có chắc chắn muốn nộp bài không?</p>
          <div className="mt-4">
            <b>Trạng thái các câu hỏi:</b>
            <ul style={{ marginTop: 8 }}>
              {practiceQuestions.map((q, idx) => (
                <li
                  key={idx}
                  style={{ color: videoList[idx] ? "#52c41a" : "#ff4d4f" }}
                >
                  Câu {idx + 1}: {q.contentFromExamVocabulary} —
                  {videoList[idx] ? " Đã làm" : " Chưa làm"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </Spin>
  );
};

export default QuestionsPractice;
