/* eslint-disable @next/next/no-img-element */
import * as handpose from "@tensorflow-models/handpose";
import * as tf from "@tensorflow/tfjs";
import * as fp from "fingerpose";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

import Handsigns from "@/utils/handsigns";
import "@tensorflow/tfjs-backend-webgl";
import { Button, Col, Image, Layout, Row, Space, Typography } from "antd";
import { Camera, CameraOff } from "lucide-react";
import { drawHand } from "./drawHand";
import { Signimage, Signpass } from "../assets/handimage";

const { Title } = Typography;
const { Header, Content } = Layout;

interface Sign {
  alt: string;
  src: { src: string };
}

export default function LearningData() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loader, setLoader] = useState<boolean>(true);
  const [camState, setCamState] = useState<"on" | "off">("on");
  const [sign, setSign] = useState<string | null>(null);

  let signList: Sign[] = [];
  let currentSign = 0;

  let gamestate: "started" | "played" | "finished" = "started";

  async function runHandpose() {
    await tf.setBackend("webgl");
    await tf.ready();

    const net = await handpose.load();
    _signList();

    setInterval(() => {
      detect(net);
    }, 150);
  }

  function _signList() {
    signList = generateSigns();
  }

  function shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateSigns(): Sign[] {
    const password = shuffle(Signpass);
    return password;
  }

  async function detect(net: handpose.HandPose) {
    if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
      const video = webcamRef.current.video as HTMLVideoElement;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      canvasRef.current!.width = videoWidth;
      canvasRef.current!.height = videoHeight;

      const hand: any = await net.estimateHands(video);

      if (hand.length > 0) {
        setLoader(false);

        const GE = new fp.GestureEstimator([
          Handsigns.aSign,
          Handsigns.bSign,
          Handsigns.cSign,
          Handsigns.dSign,
          Handsigns.eSign,
          Handsigns.fSign,
          Handsigns.gSign,
          Handsigns.hSign,
          Handsigns.iSign,
          Handsigns.jSign,
          Handsigns.kSign,
          Handsigns.lSign,
          Handsigns.mSign,
          Handsigns.nSign,
          Handsigns.oSign,
          Handsigns.pSign,
          Handsigns.qSign,
          Handsigns.rSign,
          Handsigns.sSign,
          Handsigns.tSign,
          Handsigns.uSign,
          Handsigns.vSign,
          Handsigns.wSign,
          Handsigns.xSign,
          Handsigns.ySign,
          Handsigns.zSign,
        ]);

        const estimatedGestures = await GE.estimate(hand[0].landmarks, 7);

        if (gamestate === "started") {
        }

        if (
          estimatedGestures.gestures !== undefined &&
          estimatedGestures.gestures.length > 0
        ) {
          const confidence = estimatedGestures.gestures.map(
            (p: any) => p.score,
          );
          const maxConfidence = confidence.indexOf(
            Math.max.apply(undefined, confidence),
          );

          if (gamestate !== "played") {
            _signList();
            gamestate = "played";
            document.getElementById("emojimage")!.classList.add("play");
          } else if (gamestate === "played") {
            const el: any = document.querySelector("#app-title");
            el!.innerText = "";

            if (currentSign === signList.length) {
              _signList();
              currentSign = 0;
              return;
            }

            if (signList[currentSign].src.src) {
              document
                .getElementById("emojimage")!
                .setAttribute("src", signList[currentSign].src.src);
              if (
                signList[currentSign].alt ===
                estimatedGestures.gestures[maxConfidence].name
              ) {
                currentSign++;
              }

              setSign(estimatedGestures.gestures[maxConfidence].name);
            }
          } else if (gamestate === "finished") {
            return;
          } else {
            return;
          }
        }
      }

      const ctx = canvasRef.current!.getContext("2d")!;
      drawHand(hand, ctx);
    }
  }

  useEffect(() => {
    runHandpose();
  }, []);

  function turnOffCamera() {
    if (camState === "on") {
      setCamState("off");
    } else {
      setCamState("on");
    }
  }

  return (
    <Layout style={{ backgroundColor: "#5784BA", height: "100vh" }}>
      <Header style={{ backgroundColor: "#5784BA" }}>
        <Title
          level={3}
          style={{ color: "white", textAlign: "center" }}
          className="tutor-text"
        ></Title>
      </Header>
      <Content
        style={{
          padding: "0 50px",
        }}
      >
        <Row justify="center" align="middle" style={{ width: "100%" }}>
          <Col span={24}>
            <Title
              level={1}
              style={{ color: "white", textAlign: "center" }}
              id="app-title"
            ></Title>
          </Col>
          <Col span={24} style={{ textAlign: "center" }}>
            <div id="webcam-container" className="relative">
              {camState === "on" ? (
                <>
                  <Webcam
                    id="webcam"
                    width={700}
                    height={600}
                    ref={webcamRef}
                    style={{
                      filter: "FlipH",
                    }}
                    className="absolute left-0 top-0 z-999 scale-x-[-1] object-contain"
                  />
                  <canvas
                    id="gesture-canvas"
                    ref={canvasRef}
                    width={700}
                    height={600}
                    style={{
                      filter: "FlipH",
                    }}
                    className="absolute left-0 top-0 z-999 scale-x-[-1] object-cover pb-3"
                  />
                </>
              ) : (
                <div
                  id="webcam"
                  style={{ backgroundColor: "black", height: "100%" }}
                ></div>
              )}

              {sign && (
                <div
                  style={{
                    position: "absolute",
                    marginLeft: "auto",
                    marginRight: "auto",
                    right: 200,
                    top: 200,
                  }}
                >
                  <div
                    style={{
                      color: "white",
                      fontSize: "32px",
                      marginBottom: 8,
                    }}
                  >
                    Kết quả
                  </div>

                  <Image alt="" preview={false} src={Signimage[sign]?.src} />
                </div>
              )}
            </div>

            <img
              style={{
                position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                right: 200,
                top: 0,
                height: 150,
                objectFit: "cover",
                marginTop: 20,
              }}
              alt=""
              id="emojimage"
            />
          </Col>
        </Row>
      </Content>
      <Row justify="center" style={{ padding: "20px 0" }}>
        <Space>
          <Button
            icon={
              camState === "on" ? (
                <Camera size={20} />
              ) : (
                <CameraOff size={20} />
              )
            }
            onClick={turnOffCamera}
            type="primary"
          >
            Camera
          </Button>
        </Space>
      </Row>

      {loader && (
        <div className="loading absolute inset-0 z-999 flex items-center justify-center bg-gray-2">
          <div className="spinner h-32 w-32 animate-spin rounded-full border-8 border-t-8 border-t-blue-500"></div>
          <div className="absolute text-xl text-white">Loading</div>
        </div>
      )}
    </Layout>
  );
}
