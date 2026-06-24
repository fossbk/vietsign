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
  Table,
  Tabs,
  Tag,
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
import {
  AiPracticeHistoryItem,
  fetchAiPracticeHistory,
  predictAiPractice,
  predictAiPracticeModel3,
} from "@/services/aiPracticeService";
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

const formatConfidence = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return `${Math.round(numeric * 100)}%`;
};

const isHistoryMatch = (value: boolean | number | string | null | undefined) =>
  value === true || value === 1 || value === "1";

const isHistoryMiss = (value: boolean | number | string | null | undefined) =>
  value === false || value === 0 || value === "0";

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
  // Káº¿t quáº£ sau khi xá»­ lÃ½ AI
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

  // Dá»¯ liá»‡u máº«u
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

  // Äá»c file excel
  const [dataExcel, setDataExcel] = useState<any>([]);
  const excelUrl =
    "https://res.cloudinary.com/dso3fp1fx/raw/upload/v1720014385/01_1-200_yttv3i.xlsx";

  // Äá»c dá»¯ liá»‡u lÆ°u file AI tá»­ cloudinary
  useEffect(() => {
    async function fetchData() {
      try {
        // Táº£i tá»‡p tá»« Cloudinary
        const response = await axios.get(excelUrl, {
          responseType: "arraybuffer",
        });

        // Äá»c tá»‡p Excel
        const data = new Uint8Array(response.data);
        const workbook = XLSX.read(data, { type: "array" });

        // Chuyá»ƒn Ä‘á»•i dá»¯ liá»‡u
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

        // LÆ°u dá»¯ liá»‡u vÃ o state
        setDataExcel(transformedData);
      } catch (error) {
        console.error("Lá»—i khi Ä‘á»c tá»‡p Excel:", error);
      }
    }

    fetchData();
  }, [excelUrl]);

  // API láº¥y danh sÃ¡ch  topics
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

  // API láº¥y danh sÃ¡ch tá»« theo topics
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
      startTimeRef.current = null; // Sáº½ Ä‘Æ°á»£c Ä‘áº·t khi status thá»±c sá»± lÃ  "recording"
      startRecording();

      // Kiá»ƒm tra status vÃ  báº¯t Ä‘áº§u Ä‘áº¿m thá»i gian
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

          // Äáº·t timeout Ä‘á»ƒ dá»«ng ghi sau recordingDuration
          recordingTimeoutRef.current = setTimeout(() => {
            handleStopRecording(stopRecording);
          }, recordingDuration * 1000);
        } else {
          // Náº¿u chÆ°a á»Ÿ tráº¡ng thÃ¡i recording, kiá»ƒm tra láº¡i sau 100ms
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

  const [selectedAIModel, setSelectedAIModel] = useState<"model1" | "model2" | "model3">("model1");
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const selectedStatsModel = selectedAIModel === "model3" ? "model3" : "model1";

  const {
    data: aiHistoryResponse,
    isFetching: isFetchingAiHistory,
    refetch: refetchAiHistory,
  } = useQuery({
    queryKey: ["ai-practice-history", selectedStatsModel],
    queryFn: () => fetchAiPracticeHistory({ model: selectedStatsModel, limit: 100 }),
    enabled: isStatsModalOpen,
  });

  const aiHistoryItems = aiHistoryResponse?.data || [];
  const aiHistoryTotal = aiHistoryResponse?.total || aiHistoryItems.length;
  const aiHistoryMatched = aiHistoryItems.filter((item) => isHistoryMatch(item.is_match)).length;
  const aiHistoryMissed = aiHistoryItems.filter((item) => isHistoryMiss(item.is_match)).length;
  const aiHistoryUnknown = Math.max(
    0,
    aiHistoryItems.length - aiHistoryMatched - aiHistoryMissed,
  );
  const aiHistoryAvgConfidence = aiHistoryItems.length
    ? aiHistoryItems.reduce((sum, item) => sum + (Number(item.confidence) || 0), 0) /
      aiHistoryItems.length
    : null;
  const predictionBuckets = Object.entries(
    aiHistoryItems.reduce<Record<string, number>>((acc, item) => {
      const label = item.action_name || String(item.predicted_label || "Không có k?t qu?");
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxPredictionBucket = Math.max(...predictionBuckets.map(([, count]) => count), 1);

  // Kiá»ƒm tra AI
  const mutationDetectAI = useMutation({
    mutationFn: async (data: { videoUrl?: string; file?: File }) => {
      if (selectedAIModel === "model1") {
        if (!data.file) {
          throw new Error("Thiáº¿u file Ä‘áº§u vÃ o cho AI Model 1");
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
          throw new Error("Thiáº¿u videoUrl cho AI Model 2");
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
          throw new Error("Thiáº¿u file cho AI Model 3");
        }
        
        const response3 = await predictAiPracticeModel3(data.file, {
          mode: "free",
          targetText: filterParams?.vocabularyName || "",
          vocabularyId: filterParams?.vocabulary || undefined,
          topicId: filterParams?.topic || undefined,
        });
        
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

      // Loáº¡i bá» pháº§n mÃ´ táº£ trong ngoáº·c (náº¿u cÃ³)
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
          fileLocation: res.fileLocation, // Náº¿u model 3 tráº£ vá» fileLocation, náº¿u khÃ´ng thÃ¬ bá» dÃ²ng nÃ y
        });
        setShowModalResult(true);
        message.success("Xá»­ lÃ½ dá»¯ liá»‡u thÃ nh cÃ´ng");
      } else {
        message.error("KhÃ´ng cÃ³ tá»« nÃ o Ä‘Ãºng vá»›i ná»™i dung cung cáº¥p");
      }
    },
    onError: (error) => {
      console.error("Lá»—i khi gá»i AI model:", error);
      message.error("ÄÃ£ xáº£y ra lá»—i khi xá»­ lÃ½ AI");
    },
  });

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<RcFile | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Function to handle video upload
  const handleUpload = async () => {
    if (!uploadedVideo) {
      message.error("Vui lÃ²ng chá»n má»™t video.");
      return;
    }

    const isVideo = uploadedVideo.type.startsWith("video/");
    const isLt10M = uploadedVideo.size / 1024 / 1024 < 10;

    if (!isVideo) {
      message.error("File pháº£i lÃ  video.");
      return;
    }

    if (!isLt10M) {
      message.error("Video pháº£i nhá» hÆ¡n 10MB.");
      return;
    }

    try {
      setUploadLoading(true); // Set loading state
      if (selectedAIModel === "model1" || selectedAIModel === "model3") {
        // Model 1 & Model 3: gá»­i file trá»±c tiáº¿p, khÃ´ng upload cloud
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

      message.success("Video Ä‘Ã£ Ä‘Æ°á»£c táº£i lÃªn thÃ nh cÃ´ng.");
    } catch (error) {
      console.error("Lá»—i khi táº£i video:", error);
      message.error("KhÃ´ng thá»ƒ táº£i video. Vui lÃ²ng thá»­ láº¡i.");
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
        <Tabs.TabPane tab="Luyá»‡n táº­p tá»« vá»±ng" key="1">
          <div className="relative flex h-[600px] items-start justify-between gap-4 overflow-hidden bg-gray-2">
            <div className="flex w-1/2 flex-col justify-start">
              <div className="mb-2 flex justify-between items-center text-xl font-semibold">
                <div>Dá»¯ liá»‡u máº«u</div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedAIModel}
                    onChange={(value) => setSelectedAIModel(value)}
                    options={[
                      { value: "model1", label: "AI Model 1" },
                      { value: "model3", label: "AI Model 3" },
                    ]}
                    className="w-48"
                  />
                  <Button
                    onClick={() => {
                      setIsStatsModalOpen(true);
                      setTimeout(() => refetchAiHistory(), 0);
                    }}
                  >
                    Th?ng kê
                  </Button>
                </div>
              </div>
              <div className="flex gap-4">
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  placeholder="Chá»n chá»§ Ä‘á»"
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
                  placeholder="Chá»n tá»« vá»±ng"
                  disabled={!filterParams.topic}
                  options={allVocabulary}
                  value={filterParams.vocabulary}
                  onChange={(value, option: any) => {
                    if (value) {
                      option?.vocabularyImageResList.sort(
                        (a: { primary: any }, b: { primary: any }) => {
                          // Sáº¯p xáº¿p sao cho pháº§n tá»­ cÃ³ primary = true Ä‘Æ°á»£c Ä‘áº·t lÃªn Ä‘áº§u
                          return a.primary === b.primary
                            ? 0
                            : a.primary
                              ? -1
                              : 1;
                        },
                      );
                      option?.vocabularyVideoResList.sort(
                        (a: { primary: any }, b: { primary: any }) => {
                          // Sáº¯p xáº¿p sao cho pháº§n tá»­ cÃ³ primary = true Ä‘Æ°á»£c Ä‘áº·t lÃªn Ä‘áº§u
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
                      "KhÃ´ng tÃ¬m tháº¥y tá»« vá»±ng"
                    )
                  }
                />
              </div>
              {/* Button lá»±a chá»n hiá»ƒn kiá»ƒu dá»¯ liá»‡u máº«u */}
              <div className="mt-4  flex items-center gap-2">
                <Button
                  onClick={() =>
                    setModalVideo({ ...modalVideo, type: "video" })
                  }
                  className="border border-neutral-400 text-sm px-3 py-2 h-auto"
                >
                  Dá»¯ liá»‡u máº«u theo video
                </Button>
                <Button
                  onClick={() =>
                    setModalVideo({ ...modalVideo, type: "image" })
                  }
                  className="border border-neutral-400 text-sm px-3 py-2 h-auto"
                >
                  Dá»¯ liá»‡u máº«u theo áº£nh
                </Button>
              </div>
              {/* Dá»¯ liá»‡u máº«u */}
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
                        <p>Tráº¡ng thÃ¡i video: {status}</p>
                        <Select
                          defaultValue={5}
                          onChange={(value) => setRecordingDuration(value)}
                          options={[
                            { value: 3, label: "3 giÃ¢y" },
                            { value: 4, label: "4 giÃ¢y" },
                            { value: 5, label: "5 giÃ¢y" },
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
                              title={`Thá»i gian tá»‘i Ä‘a cho má»—i video lÃ  ${recordingDuration}s.`}
                              placement="top"
                              trigger="hover"
                              color="#4096ff"
                            >
                              <AlertTriangle size={16} color="#4096ff" />
                            </Tooltip>
                          }
                        >
                          Báº¯t Ä‘áº§u quay
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
                          Xem láº¡i file
                        </Button>
                        <Button onClick={() => setUploadModalVisible(true)}>
                          Táº£i video
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
                                // Gá»­i file trá»±c tiáº¿p cho model1 vÃ  model3
                                mutationDetectAI.mutate({ file: capturedFile });
                              } else {
                                const link = await uploadMediaFile(
                                  capturedFile,
                                  "exam",
                                );
                                mutationDetectAI.mutate({ videoUrl: link });
                              }
                            } catch (error) {
                              console.error("Lá»—i khi kiá»ƒm tra video:", error);
                            }
                          }}
                        >
                          Kiá»ƒm tra
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />

              <Modal
                visible={uploadModalVisible}
                title="Táº£i video"
                onCancel={() => setUploadModalVisible(false)}
                footer={[
                  <Button
                    key="cancel"
                    onClick={() => setUploadModalVisible(false)}
                  >
                    Há»§y
                  </Button>,
                  <Button
                    key="check"
                    type="primary"
                    loading={uploadLoading} // Add loading state
                    onClick={handleUpload}
                    style={{ background: "#2f54eb" }}
                  >
                    Kiá»ƒm tra
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
                  <Button>Chá»n video</Button>
                </Upload>
              </Modal>
            </div>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Luyá»‡n táº­p theo báº£ng chá»¯ cÃ¡i" key="2">
          <LearningData />
        </Tabs.TabPane>
      </Tabs>

      <Modal
        open={isStatsModalOpen}
        onCancel={() => setIsStatsModalOpen(false)}
        footer={null}
        title={`Th?ng kê ${selectedAIModel === "model1" ? "AI Model 1" : "AI Model 3"}`}
        width={1100}
      >
        <Spin spinning={isFetchingAiHistory}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">T?ng lu?t ch?m</div>
                <div className="text-2xl font-bold">{aiHistoryTotal}</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-sm text-green-700">D? doán dúng</div>
                <div className="text-2xl font-bold text-green-700">{aiHistoryMatched}</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-sm text-red-700">D? doán sai</div>
                <div className="text-2xl font-bold text-red-700">{aiHistoryMissed}</div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Ð? tin c?y TB</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatConfidence(aiHistoryAvgConfidence)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 font-semibold">T? l? k?t qu?</div>
                {[
                  { label: "Ðúng", count: aiHistoryMatched, color: "bg-green-500" },
                  { label: "Sai", count: aiHistoryMissed, color: "bg-red-500" },
                  { label: "Chua d?i chi?u", count: aiHistoryUnknown, color: "bg-gray-400" },
                ].map((item) => {
                  const percent = aiHistoryItems.length
                    ? Math.round((item.count / aiHistoryItems.length) * 100)
                    : 0;
                  return (
                    <div key={item.label} className="mb-3">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span>{item.count} lu?t ({percent}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 font-semibold">K?t qu? AI ch?m nhi?u nh?t</div>
                {predictionBuckets.length === 0 ? (
                  <div className="text-sm text-gray-500">Chua có d? li?u</div>
                ) : (
                  predictionBuckets.map(([label, count]) => (
                    <div key={label} className="mb-3">
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="truncate">{label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.round((count / maxPredictionBucket) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Table<AiPracticeHistoryItem>
              rowKey="attempt_id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={aiHistoryItems}
              scroll={{ x: 900 }}
              columns={[
                {
                  title: "Th?i gian",
                  dataIndex: "created_at",
                  width: 170,
                  render: (value: string) =>
                    value ? new Date(value).toLocaleString("vi-VN") : "--",
                },
                {
                  title: "T? c?n doán",
                  dataIndex: "target_text",
                  render: (value: string | null) => value || "--",
                },
                {
                  title: "Th?c t? AI ch?m",
                  render: (_, record) =>
                    record.action_name || record.predicted_label || "--",
                },
                {
                  title: "Ð? tin c?y",
                  dataIndex: "confidence",
                  width: 120,
                  render: (value: number | null) => formatConfidence(value),
                },
                {
                  title: "K?t qu?",
                  dataIndex: "is_match",
                  width: 130,
                  render: (value: boolean | number | null) => {
                    if (isHistoryMatch(value)) return <Tag color="green">Ðúng</Tag>;
                    if (isHistoryMiss(value)) return <Tag color="red">Sai</Tag>;
                    return <Tag>Chua d?i chi?u</Tag>;
                  },
                },
                {
                  title: "Tr?ng thái",
                  dataIndex: "status",
                  width: 120,
                  render: (value: string) => (
                    <Tag color={value === "SUCCESS" ? "blue" : "orange"}>{value}</Tag>
                  ),
                },
              ]}
            />
          </div>
        </Spin>
      </Modal>
      {/* Modal hiá»ƒn thá»‹ káº¿t quáº£ */}
      <Modal
        open={showModalResult}
        onCancel={() => setShowModalResult(false)}
        footer={null}
        title="Káº¿t quáº£"
        width={1200}
      >
        <div className="w-full ">
          <Spin spinning={mutationDetectAI.isPending}>
            <div className="mb-4 flex items-center justify-between gap-4 text-[60px] font-bold">
              <div className="w-1/2">
                <div className=" text-[20px]">Tá»« cáº§n biá»ƒu diá»…n</div>
                <div className=" text-[24px] text-primary">
                  {modalVideo.vocabularyContent}
                </div>
              </div>
              <div className="w-1/2">
                <div className="w-1/2 text-[20px]">Tá»« nháº­n diá»‡n</div>
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
      {/* Modal xem láº¡i */}
      <Modal
        open={showModalPreview.open}
        onCancel={() =>
          setShowModalPreview({ ...showModalPreview, open: false })
        }
        footer={null}
        title={
          showModalPreview.type === "image" ? "Xem láº¡i áº£nh: " : "Xem láº¡i video"
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
