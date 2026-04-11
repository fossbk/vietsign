/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Learning from "@/model/Learning";
import UploadModel from "@/model/UploadModel";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Image,
  Modal,
  Select,
  Spin,
  Tabs,
  Tooltip,
  message,
  Upload,
} from "antd";
import { RcFile } from "antd/lib/upload";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ReactMediaRecorder } from "react-media-recorder-2";
import Webcam from "react-webcam";
import * as XLSX from "xlsx";
import { fetchAllTopics, fetchVocabulariesByTopic } from "@/services/topicService";
import { uploadFile as uploadMediaFile } from "@/services/uploadService";
import { predictAiPractice, predictAiPracticeModel3 } from "@/services/aiPracticeService";
const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};
import LearningData from "./LearningData";

const filterOption = (
  input: string,
  option?: { label: string; value: string },
) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

const PracticeData: React.FC = () => {
  const [webcamReady, setWebcamReady] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(5);
  const [showModalPreview, setShowModalPreview] = useState<{
    open: boolean;
    preview: string | undefined;
    type: string;
  }>({ open: false, preview: "", type: "" });
  const [showModalResult, setShowModalResult] = useState<boolean>(false);
  const webcamRef = useRef<Webcam>(null);
  const isRecordingRef = useRef(false);
  const maxRecordingTime = 5;
  // Kết quả sau khi xử lý AI
  const [resultContent, setResultContent] = useState<{
    content: string;
    fileLocation?: string;
  }>({
    content: "",
    fileLocation: "",
  });
  const startTimeRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStatusRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkButtonRef = useRef<HTMLButtonElement>(null);

  // Dữ liệu mẫu
  const [filterParams, setFilterParams] = useState<any>({
    topic: "",
    vocabulary: "",
    file: "",
    vocabularyName: "",
  });

  const [modalVideo, setModalVideo] = useState<{
    open: boolean;
    previewImg: string;
    previewVideo: string;
    type: string;
    vocabularyContent?: string;
    typeModal?: string;
  }>({
    open: false,
    previewImg: "",
    previewVideo: "",
    type: "",
    vocabularyContent: "",
    typeModal: "create",
  });

  const videoRef = useRef<any>(null);

  const handleWebcamReady = useCallback(() => {
    setWebcamReady(true);
  }, []);

  // Đọc file excel
  const [dataExcel, setDataExcel] = useState<any>([]);
  const excelUrl =
    "https://res.cloudinary.com/dso3fp1fx/raw/upload/v1720014385/01_1-200_yttv3i.xlsx";

  // Đọc dữ liệu lưu file AI tử cloudinary
  useEffect(() => {
    async function fetchData() {
      try {
        // Tải tệp từ Cloudinary
        const response = await axios.get(excelUrl, {
          responseType: "arraybuffer",
        });

        // Đọc tệp Excel
        const data = new Uint8Array(response.data);
        const workbook = XLSX.read(data, { type: "array" });

        // Chuyển đổi dữ liệu
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const transformedData = jsonData.map((item: any) => {
          const newItem = {
            ...item,
            id: item["__EMPTY"],
            word: item["Words"],
            link: item["Link Video"],
          };
          delete newItem["__EMPTY"];
          delete newItem["Words"];
          delete newItem["Link Video"];
          return newItem;
        });

        // Lưu dữ liệu vào state
        setDataExcel(transformedData);
      } catch (error) {
        console.error("Lỗi khi đọc tệp Excel:", error);
      }
    }

    fetchData();
  }, [excelUrl]);

  // API lấy danh sách  topics
  const { data: allTopics } = useQuery({
    queryKey: ["getAllTopics"],
    queryFn: async () => {
      const topicsData = await fetchAllTopics();
      return (Array.isArray(topicsData) ? topicsData : []).map((item: any) => ({
        id: item.id,
        value: item.id,
        label: item.name,
        text: item.name,
      }));
    },
  });

  // API lấy danh sách từ theo topics
  const { data: allVocabulary, isFetching: isFetchingVocabulary } = useQuery({
    queryKey: ["getVocabularyTopic", filterParams.topic],
    queryFn: async () => {
      const vocabularies = await fetchVocabulariesByTopic(filterParams.topic);

      if (vocabularies.length > 0) {
        return vocabularies.map((item: any) => ({
          id: item.id,
          value: item.id,
          label: item.word,
          vocabularyImageResList: item.imageUrl
            ? [{ imageLocation: item.imageUrl, primary: true }]
            : item.vocabularyImageResList || [],
          vocabularyVideoResList: item.videoUrl
            ? [{ videoLocation: item.videoUrl, primary: true }]
            : item.vocabularyVideoResList || [],
        }));
      }
      return [];
    },
    enabled: !!filterParams.topic,
  });

  const handleStartRecording = useCallback(
    (startRecording: any, stopRecording: any) => {
      if (isRecordingRef.current) return;
      isRecordingRef.current = true;
      setRecordingTime(0);
      startTimeRef.current = null; // Sẽ được đặt khi status thực sự là "recording"
      startRecording();

      // Kiểm tra status và bắt đầu đếm thời gian
      const checkRecordingStatus = () => {
        if (recordingStatusRef.current === "recording") {
          if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
          }

          intervalRef.current = setInterval(() => {
            const elapsedTime = Math.floor(
              (Date.now() - startTimeRef.current!) / 1000,
            );
            setRecordingTime(elapsedTime);

            if (elapsedTime >= recordingDuration) {
              handleStopRecording(stopRecording);
            }
          }, 1000);

          // Đặt timeout để dừng ghi sau recordingDuration
          recordingTimeoutRef.current = setTimeout(() => {
            handleStopRecording(stopRecording);
          }, recordingDuration * 1000);
        } else {
          // Nếu chưa ở trạng thái recording, kiểm tra lại sau 100ms
          setTimeout(checkRecordingStatus, 100);
        }
      };

      checkRecordingStatus();
    },
    [recordingDuration],
  );

  const handleStopRecording = useCallback(
    async (stopRecording: () => void) => {
      if (!isRecordingRef.current) return;

      isRecordingRef.current = false;
      stopRecording();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      startTimeRef.current = null;
      setRecordingTime(0);
      setShowModalPreview({
        ...showModalPreview,
        open: false,
        type: "video",
      });
      setTimeout(() => {
        if (checkButtonRef.current) {
          checkButtonRef.current.click();
        }
      }, 1000);
    },

    [showModalPreview],
  );

  const convertBlobUrlToFile = async (mediaBlobUrl: string) => {
    const response = await fetch(mediaBlobUrl);
    const blob: any = await response.blob();
    const metadata = { type: blob.type, lastModified: blob.lastModified };
    return new File([blob], `volunteer_${Date.now()}.mp4`, metadata);
  };

  const uploadVideo = async (mediaBlobUrl: string) => {
    const file = await convertBlobUrlToFile(mediaBlobUrl);
    return await uploadMediaFile(file, "exam");
  };

  const [selectedAIModel, setSelectedAIModel] = useState("model1");

  // Kiểm tra AI
  const mutationDetectAI = useMutation({
    mutationFn: async (data: { videoUrl?: string; file?: File }) => {
      if (selectedAIModel === "model1") {
        if (!data.file) {
          throw new Error("Thiếu file đầu vào cho AI Model 1");
        }

        const aiResponse = await predictAiPractice({
          file: data.file,
          mode: "free",
          targetText: filterParams?.vocabularyName || "",
          vocabularyId: filterParams?.vocabulary || undefined,
          topicId: filterParams?.topic || undefined,
        });

        const rawResponse = aiResponse?.data?.raw_response as any;
        let nestedLabelName =
          aiResponse?.data?.label_name ||
          rawResponse?.label_name ||
          rawResponse?.labelName ||
          "";

        // Some backends persist raw_response as stringified JSON.
        if (!nestedLabelName && typeof rawResponse === "string") {
          try {
            const parsed = JSON.parse(rawResponse);
            nestedLabelName = parsed?.label_name || parsed?.labelName || "";
          } catch {
            // ignore parse error and fallback below
          }
        }

        const actionName =
          nestedLabelName ||
          aiResponse?.data?.label_name ||
          aiResponse?.data?.action_name ||
          aiResponse?.data?.predicted_label ||
          (aiResponse?.data?.raw_response as any)?.label_name ||
          (aiResponse?.data?.raw_response as any)?.action_name ||
          (aiResponse?.data?.raw_response as any)?.label ||
          "";

        return {
          action_name: actionName,
          label_name: nestedLabelName,
          fileLocation: data.videoUrl,
          raw: aiResponse,
        };
      } else if (selectedAIModel === "model2") {
        if (!data.videoUrl) {
          throw new Error("Thiếu videoUrl cho AI Model 2");
        }
        const response = await axios.post(
          "https://wesign.ibme.edu.vn/ai/t2/ai/detection",
          { videoUrl: data.videoUrl },
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        return response.data;
      } else if (selectedAIModel === "model3") {
        if (!data.file) {
          throw new Error("Thiếu file cho AI Model 3");
        }
        
        const response3 = await predictAiPracticeModel3(data.file);
        
        // Response format is handled by our backend now
        const top1 = response3.data?.top_k?.[0];

        return {
          action_name: top1?.label || "",
          label_name: top1?.label || "",
          label_id: top1?.class_id ?? null,
          confidence: top1?.probability ?? null,
          top_k: response3.data?.top_k || [],
        };
      }
    },
    onSuccess: async (res: any) => {
      const explicitLabelName =
        (typeof res?.label_name === "string" && res.label_name.trim()) ||
        (typeof res?.raw?.data?.label_name === "string" &&
          res.raw.data.label_name.trim()) ||
        (typeof res?.raw?.data?.raw_response?.label_name === "string" &&
          res.raw.data.raw_response.label_name.trim()) ||
        "";

      const vocabularyName =
        typeof filterParams?.vocabularyName === "string"
          ? filterParams.vocabularyName.toLowerCase().trim()
          : null;

      const content =
        typeof (explicitLabelName || res?.action_name) === "string"
          ? String(explicitLabelName || res?.action_name).toLowerCase().trim()
          : null;

      // Loại bỏ phần mô tả trong ngoặc (nếu có)
      const normalize = (str: string) =>
        str.replace(/\s*\(.*?\)\s*/g, "").trim();

      const normalizedContent = content ? normalize(content) : null;
      const normalizedVocabularyName = vocabularyName
        ? normalize(vocabularyName)
        : null;

      if (
        normalizedContent &&
        normalizedVocabularyName &&
        normalizedContent === normalizedVocabularyName
      ) {
        const body = {
          dataLocation: filterParams.file,
          vocabularyId: filterParams.vocabulary,
        };
        await Learning.sendData(body);
      }

      if (explicitLabelName || res?.action_name) {
        setResultContent({
          content: explicitLabelName || res.action_name,
          fileLocation: res.fileLocation, // Nếu model 3 trả về fileLocation, nếu không thì bỏ dòng này
        });
        setShowModalResult(true);
        message.success("Xử lý dữ liệu thành công");
      } else {
        message.error("Không có từ nào đúng với nội dung cung cấp");
      }
    },
    onError: (error) => {
      console.error("Lỗi khi gọi AI model:", error);
      message.error("Đã xảy ra lỗi khi xử lý AI");
    },
  });

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<RcFile | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Function to handle video upload
  const handleUpload = async () => {
    if (!uploadedVideo) {
      message.error("Vui lòng chọn một video.");
      return;
    }

    const isVideo = uploadedVideo.type.startsWith("video/");
    const isLt10M = uploadedVideo.size / 1024 / 1024 < 10;

    if (!isVideo) {
      message.error("File phải là video.");
      return;
    }

    if (!isLt10M) {
      message.error("Video phải nhỏ hơn 10MB.");
      return;
    }

    try {
      setUploadLoading(true); // Set loading state
      if (selectedAIModel === "model1" || selectedAIModel === "model3") {
        // Model 1 & Model 3: gửi file trực tiếp, không upload cloud
        mutationDetectAI.mutate(
          { file: uploadedVideo },
          {
            onSettled: () => {
              setUploadLoading(false);
              setUploadModalVisible(false);
              setUploadedVideo(null);
            },
          },
        );
      } else {
        const videoUrl = await uploadMediaFile(uploadedVideo, "exam");

        mutationDetectAI.mutate(
          { videoUrl },
          {
            onSettled: () => {
              setUploadLoading(false);
              setUploadModalVisible(false);
              setUploadedVideo(null);
            },
          },
        );
      }

      message.success("Video đã được tải lên thành công.");
    } catch (error) {
      console.error("Lỗi khi tải video:", error);
      message.error("Không thể tải video. Vui lòng thử lại.");
      setUploadLoading(false);
    }
  };

  // Function to get video duration
  const getVideoDuration = (file: RcFile): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <>
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Luyện tập từ vựng" key="1">
          <div className="relative flex h-[600px] items-start justify-between gap-4 overflow-hidden bg-gray-2">
            <div className="flex w-1/2 flex-col justify-start">
              <div className="mb-2 flex justify-between items-center text-xl font-semibold">
                <div>Dữ liệu mẫu</div>
                <Select
                  defaultValue="model1"
                  onChange={(value) => setSelectedAIModel(value)}
                  options={[
                    { value: "model1", label: "AI Model 1" },
                    { value: "model2", label: "AI Model 2" },
                    { value: "model3", label: "AI Model 3" },
                  ]}
                  className="w-48"
                />
              </div>
              <div className="flex gap-4">
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  placeholder="Chọn chủ đề"
                  options={allTopics}
                  onChange={(value, option: any) =>
                    setFilterParams({
                      ...filterParams,
                      topic: value,
                      vocabulary: null,
                    })
                  }
                  filterOption={filterOption}
                />
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  placeholder="Chọn từ vựng"
                  disabled={!filterParams.topic}
                  options={allVocabulary}
                  value={filterParams.vocabulary}
                  onChange={(value, option: any) => {
                    if (value) {
                      option?.vocabularyImageResList.sort(
                        (a: { primary: any }, b: { primary: any }) => {
                          // Sắp xếp sao cho phần tử có primary = true được đặt lên đầu
                          return a.primary === b.primary
                            ? 0
                            : a.primary
                              ? -1
                              : 1;
                        },
                      );
                      option?.vocabularyVideoResList.sort(
                        (a: { primary: any }, b: { primary: any }) => {
                          // Sắp xếp sao cho phần tử có primary = true được đặt lên đầu
                          return a.primary === b.primary
                            ? 0
                            : a.primary
                              ? -1
                              : 1;
                        },
                      );
                      setFilterParams({
                        ...filterParams,
                        vocabulary: value,
                        vocabularyName: option.label,
                      });
                      setModalVideo((prevModalVideo) => ({
                        ...prevModalVideo,
                        previewImg:
                          option?.vocabularyImageResList[0]?.imageLocation,
                        previewVideo:
                          option?.vocabularyVideoResList[0]?.videoLocation,
                        vocabularyContent: option.label,
                      }));
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play();
                      }
                    } else {
                      setModalVideo({
                        ...modalVideo,
                        previewImg: "",
                        previewVideo: "",
                      });
                    }
                  }}
                  filterOption={filterOption}
                  loading={isFetchingVocabulary}
                  notFoundContent={
                    isFetchingVocabulary ? (
                      <Spin size="small" />
                    ) : (
                      "Không tìm thấy từ vựng"
                    )
                  }
                />
              </div>
              {/* Button lựa chọn hiển kiểu dữ liệu mẫu */}
              <div className="mt-4  flex items-center gap-2">
                <Button
                  onClick={() =>
                    setModalVideo({ ...modalVideo, type: "video" })
                  }
                  className="border border-neutral-400 text-sm px-3 py-2 h-auto"
                >
                  Dữ liệu mẫu theo video
                </Button>
                <Button
                  onClick={() =>
                    setModalVideo({ ...modalVideo, type: "image" })
                  }
                  className="border border-neutral-400 text-sm px-3 py-2 h-auto"
                >
                  Dữ liệu mẫu theo ảnh
                </Button>
              </div>
              {/* Dữ liệu mẫu */}
              <div className="mt-3 flex items-start justify-start ">
                {modalVideo.type === "image" && modalVideo.previewImg && (
                  <Image
                    src={modalVideo.previewImg}
                    alt="Uploaded"
                    style={{ width: 400, height: 400 }}
                    className="flex items-start justify-start"
                  />
                )}
                {modalVideo.type === "video" && modalVideo.previewVideo && (
                  <video
                    ref={videoRef}
                    controls
                    style={{ width: 800, maxHeight: 400 }}
                    className="flex items-start justify-start"
                  >
                    <source src={modalVideo.previewVideo} type="video/mp4" />
                  </video>
                )}
              </div>
            </div>
            <div className="w-1/2">
              {!webcamReady && (
                <div className="flex justify-center">
                  <Spin />
                </div>
              )}
              <Webcam
                className="scale-x-[-1] object-fill"
                width="100%"
                height={50}
                ref={webcamRef}
                audio={false}
                onUserMedia={handleWebcamReady}
                style={{
                  filter: "FlipH",
                  height: "70%",
                }}
              />
              <ReactMediaRecorder
                video={true}
                render={({
                  status,
                  startRecording,
                  stopRecording,
                  mediaBlobUrl,
                }) => {
                  recordingStatusRef.current = status;
                  return (
                    <div className="mt-3 object-contain overflow-y-auto max-h-[200px]">
                      <div className="flex gap-2 items-center">
                        <p>Trạng thái video: {status}</p>
                        <Select
                          defaultValue={5}
                          onChange={(value) => setRecordingDuration(value)}
                          options={[
                            { value: 3, label: "3 giây" },
                            { value: 4, label: "4 giây" },
                            { value: 5, label: "5 giây" },
                          ]}
                          className="w-24"
                        />
                        <Button
                          className="flex items-center gap-3"
                          onClick={() => {
                            handleStartRecording(startRecording, stopRecording);
                          }}
                          disabled={
                            !webcamReady ||
                            isRecordingRef.current ||
                            filterParams.vocabulary === ""
                          }
                          icon={
                            <Tooltip
                              title={`Thời gian tối đa cho mỗi video là ${recordingDuration}s.`}
                              placement="top"
                              trigger="hover"
                              color="#4096ff"
                            >
                              <AlertTriangle size={16} color="#4096ff" />
                            </Tooltip>
                          }
                        >
                          Bắt đầu quay
                          {isRecordingRef.current && (
                            <p
                              className="text-sm text-black"
                              style={{ color: "red" }}
                            >
                              {formatTime(Math.max(0, recordingTime))}
                            </p>
                          )}
                        </Button>
                        <Button
                          disabled={!mediaBlobUrl}
                          onClick={() => {
                            if (showModalPreview.type === "image") {
                              setShowModalPreview({
                                ...showModalPreview,
                                open: true,
                              });
                            } else {
                              setShowModalPreview({
                                ...showModalPreview,
                                open: true,
                                preview: mediaBlobUrl,
                              });
                            }
                          }}
                        >
                          Xem lại file
                        </Button>
                        <Button onClick={() => setUploadModalVisible(true)}>
                          Tải video
                        </Button>
                        <Button
                          size="large"
                          type="primary"
                          style={{ background: "#2f54eb" }}
                          disabled={!mediaBlobUrl}
                          loading={mutationDetectAI.isPending}
                          ref={checkButtonRef}
                          className="text-center"
                          onClick={async () => {
                            try {
                              if (!mediaBlobUrl) {
                                return;
                              }

                              const capturedFile = await convertBlobUrlToFile(
                                mediaBlobUrl,
                              );

                              if (selectedAIModel === "model1" || selectedAIModel === "model3") {
                                // Gửi file trực tiếp cho model1 và model3
                                mutationDetectAI.mutate({ file: capturedFile });
                              } else {
                                const link = await uploadMediaFile(
                                  capturedFile,
                                  "exam",
                                );
                                mutationDetectAI.mutate({ videoUrl: link });
                              }
                            } catch (error) {
                              console.error("Lỗi khi kiểm tra video:", error);
                            }
                          }}
                        >
                          Kiểm tra
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />

              <Modal
                visible={uploadModalVisible}
                title="Tải video"
                onCancel={() => setUploadModalVisible(false)}
                footer={[
                  <Button
                    key="cancel"
                    onClick={() => setUploadModalVisible(false)}
                  >
                    Hủy
                  </Button>,
                  <Button
                    key="check"
                    type="primary"
                    loading={uploadLoading} // Add loading state
                    onClick={handleUpload}
                    style={{ background: "#2f54eb" }}
                  >
                    Kiểm tra
                  </Button>,
                ]}
              >
                <Upload
                  beforeUpload={(file) => {
                    setUploadedVideo(file);
                    return false;
                  }}
                  accept="video/*"
                  maxCount={1}
                >
                  <Button>Chọn video</Button>
                </Upload>
              </Modal>
            </div>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Luyện tập theo bảng chữ cái" key="2">
          <LearningData />
        </Tabs.TabPane>
      </Tabs>

      {/* Modal hiển thị kết quả */}
      <Modal
        open={showModalResult}
        onCancel={() => setShowModalResult(false)}
        footer={null}
        title="Kết quả"
        width={1200}
      >
        <div className="w-full ">
          <Spin spinning={mutationDetectAI.isPending}>
            <div className="mb-4 flex items-center justify-between gap-4 text-[60px] font-bold">
              <div className="w-1/2">
                <div className=" text-[20px]">Từ cần biểu diễn</div>
                <div className=" text-[24px] text-primary">
                  {modalVideo.vocabularyContent}
                </div>
              </div>
              <div className="w-1/2">
                <div className="w-1/2 text-[20px]">Từ nhận diện</div>
                <div className="text-[24px] text-primary">
                  {resultContent.content}
                </div>
              </div>
            </div>

            {resultContent.fileLocation && (
              <video
                width={800}
                controls
                src={resultContent.fileLocation}
              ></video>
            )}
          </Spin>
        </div>
      </Modal>
      {/* Modal xem lại */}
      <Modal
        open={showModalPreview.open}
        onCancel={() =>
          setShowModalPreview({ ...showModalPreview, open: false })
        }
        footer={null}
        title={
          showModalPreview.type === "image" ? "Xem lại ảnh: " : "Xem lại video"
        }
        width={800}
      >
        <div className="flex justify-center">
          {showModalPreview.type === "video" ? (
            <video controls src={showModalPreview.preview}></video>
          ) : (
            <Image
              preview={false}
              src={showModalPreview.preview}
              alt="preview"
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default PracticeData;
