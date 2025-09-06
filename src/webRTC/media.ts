import { Server, Socket } from "socket.io";
import * as mediasoup from "mediasoup";
import { rooms } from "./roomState";
import { WebRtcTransport, RtpParameters, Router } from "./types";
import { APP_CONFIG } from "../config";

let worker: mediasoup.types.Worker;

export async function createRouter() {
  if (!worker) {
    worker = await mediasoup.createWorker({
      rtcMinPort: Number(APP_CONFIG.rtc_min_port),
      rtcMaxPort: Number(APP_CONFIG.rtc_max_port),
    });
    worker.on("died", () => {
      console.error("❌ mediasoup worker died");
      process.exit(1);
    });
  }
  // support both H264 + VP8 + Opus
  const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
      preferredPayloadType: 111,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: { "x-google-start-bitrate": 1000 },
      preferredPayloadType: 120,
    },
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": 1,
        "level-asymmetry-allowed": 1,
        "profile-level-id": "42e01f",
      },
      preferredPayloadType: 121,
    },
  ];
  return await worker.createRouter({ mediaCodecs });
}
