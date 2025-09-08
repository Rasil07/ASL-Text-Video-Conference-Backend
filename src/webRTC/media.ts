import { Server, Socket } from "socket.io";
import * as mediasoup from "mediasoup";
import { getPeer, rooms } from "./roomState";
import { WebRtcTransport, RtpParameters, Router } from "./types";
import { APP_CONFIG, SOCKET_EVENTS } from "../config";
import { MediaSoupDebugger } from "../utils/mediasoup-debug";

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

async function createWebRtcTransport(router: mediasoup.types.Router) {
  const transport = await router.createWebRtcTransport({
    // The announcedIp should be the public IP address of the backend server (the mediasoup server),
    // not the frontend. This is the IP that clients will use to connect for media transport.
    listenIps: [{ ip: "0.0.0.0", announcedIp: process.env.ANNOUNCED_IP }], // set your backend server's public IP here
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000,
  });
  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

export async function registerMediaHandlers(io: Server, socket: Socket) {
  console.log("🎬 Registering media handlers for socket:", socket.id);

  socket.on(
    SOCKET_EVENTS.MEDIA.CREATE_WEBRTC_TRANSPORT,
    async (
      data: { roomId: string; direction: "send" | "recv" },
      cb: (params: any) => void
    ) => {
      console.log("🚀 Creating WebRTC transport:", {
        roomId: data.roomId,
        direction: data.direction,
        socketId: socket.id,
        userId: socket.decoded?.user?.id,
      });

      const room = rooms.get(data.roomId);
      if (!room) {
        console.error("❌ Room not found:", data.roomId);
        return cb({ success: false, error: "Room not found" });
      }

      const peer = getPeer(data.roomId, socket.decoded?.user?.id);
      if (!peer) {
        console.error("❌ Peer not found:", {
          roomId: data.roomId,
          userId: socket.decoded?.user?.id,
        });
        return cb({ success: false, error: "Peer not found" });
      }

      console.log("👤 Peer found:", {
        userId: peer.userId,
        userName: peer.userName,
        hasRtpCapabilities: !!peer.rtpCapabilities,
        transportCount: peer.transports.size,
      });

      try {
        const { transport, params } = await createWebRtcTransport(room.router);
        peer.transports.set(transport.id, transport);

        console.log("✅ WebRTC transport created:", {
          transportId: transport.id,
          direction: data.direction,
          iceParameters: !!params.iceParameters,
          iceCandidates: params.iceCandidates?.length || 0,
          dtlsParameters: !!params.dtlsParameters,
        });

        // Debug: Log transport status after creation
        MediaSoupDebugger.logTransportStatus(
          data.roomId,
          socket.decoded?.user?.id
        );

        cb({ success: true, transport: params });
      } catch (error) {
        console.error("❌ Failed to create WebRTC transport:", error);
        cb({ success: false, error: "Failed to create transport" });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.MEDIA.CONNECT_TRANSPORT,
    async ({ code, transportId, dtlsParameters }, cb) => {
      console.log("🔗 Connecting transport:", {
        code,
        transportId,
        socketId: socket.id,
        userId: socket.decoded?.user?.id,
        hasDtlsParameters: !!dtlsParameters,
      });

      try {
        const room = rooms.get(code);
        if (!room) {
          console.error("❌ Room not found for transport connection:", code);
          return cb({ error: "Room not found" });
        }

        const peer = getPeer(room.code, socket.decoded?.user?.id);
        if (!peer) {
          console.error("❌ Peer not found for transport connection:", {
            code,
            userId: socket.decoded?.user?.id,
          });
          return cb({ error: "Peer not found" });
        }

        const transport = peer.transports.get(transportId);
        if (!transport) {
          console.error("❌ Transport not found:", {
            transportId,
            availableTransports: Array.from(peer.transports.keys()),
          });
          return cb({ error: "Transport not found" });
        }

        await transport.connect({ dtlsParameters });
        console.log("✅ Transport connected successfully:", {
          transportId,
          code,
        });

        // Debug: Log transport status after connection
        MediaSoupDebugger.logTransportStatus(code, socket.decoded?.user?.id);

        cb({ connected: true });
      } catch (e) {
        console.error("❌ Transport connection failed:", e);
        cb({ error: "connectTransport failed" });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.MEDIA.PRODUCE,
    async ({ transportId, kind, rtpParameters, appData, code }, cb) => {
      console.log("🎥 Creating producer:", {
        code,
        transportId,
        kind,
        socketId: socket.id,
        userId: socket.decoded?.user?.id,
        hasRtpParameters: !!rtpParameters,
      });

      try {
        const room = rooms.get(code!);
        if (!room) {
          console.error("❌ Room not found for producer:", code);
          return cb({ error: "Room not found" });
        }

        const peer = getPeer(code, socket.decoded?.user?.id);
        if (!peer) {
          console.error("❌ Peer not found for producer:", {
            code,
            userId: socket.decoded?.user?.id,
          });
          return cb({ error: "Peer not found" });
        }

        const transport = peer.transports.get(transportId);
        if (!transport) {
          console.error("❌ Transport not found for producer:", {
            transportId,
            availableTransports: Array.from(peer.transports.keys()),
          });
          return cb({ error: "Transport not found" });
        }

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData,
        });

        peer.producers.set(producer.id, producer);
        console.log("✅ Producer created:", {
          producerId: producer.id,
          kind,
          code,
          userId: peer.userId,
          producerCount: peer.producers.size,
        });

        // notify others in room a new producer is available
        socket.to(room.code).emit(SOCKET_EVENTS.BROADCAST.NEW_PRODUCER, {
          producer: {
            producerId: producer.id,
            kind: producer.kind,
            peerId: peer.userId,
            peerName: peer.userName,
            mediaTag: producer.appData?.mediaTag,
          },
        });

        console.log("📢 Notified room about new producer:", {
          roomCode: room.code,
          producerId: producer.id,
          kind,
          roomParticipantCount: room.peers.size,
        });

        // Debug: Log media flow after producer creation
        MediaSoupDebugger.logMediaFlow(code);

        // handle producer close on transport close
        producer.on("transportclose", () => {
          console.log("🔌 Producer transport closed:", {
            producerId: producer.id,
            kind,
          });
          peer.producers.delete(producer.id);
          // Notify others that producer is closed
          socket.to(room.code).emit(SOCKET_EVENTS.BROADCAST.PRODUCER_CLOSED, {
            producerId: producer.id,
          });
        });

        // handle producer close event
        producer.on("@close", () => {
          console.log("🔌 Producer closed:", {
            producerId: producer.id,
            kind,
          });
          peer.producers.delete(producer.id);
          // Notify others that producer is closed
          socket.to(room.code).emit(SOCKET_EVENTS.BROADCAST.PRODUCER_CLOSED, {
            producerId: producer.id,
          });
        });

        cb({ id: producer.id });
      } catch (e) {
        console.error("❌ Producer creation failed:", e);
        cb({ error: "produce failed" });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.MEDIA.CREATE_CONSUMER,
    async ({ producerId, transportId, code }, cb) => {
      console.log("🎧 Creating consumer:", {
        code,
        producerId,
        transportId,
        socketId: socket.id,
        userId: socket.decoded?.user?.id,
      });

      try {
        const room = rooms.get(code!);
        if (!room) {
          console.error("❌ Room not found for consumer:", code);
          return cb({ error: "Room not found" });
        }

        const peer = getPeer(code, socket.decoded?.user?.id);
        if (!peer) {
          console.error("❌ Peer not found for consumer:", {
            code,
            userId: socket.decoded?.user?.id,
          });
          return cb({ error: "Peer not found" });
        }

        if (!peer.rtpCapabilities) {
          console.error("❌ Peer RTP capabilities not set:", {
            code,
            userId: socket.decoded?.user?.id,
          });
          return cb({ error: "RTP capabilities not set" });
        }

        const producerPeerTransport = peer.transports.get(transportId);
        if (!producerPeerTransport) {
          console.error("❌ Transport not found for consumer:", {
            transportId,
            availableTransports: Array.from(peer.transports.keys()),
          });
          return cb({ error: "Transport not found" });
        }

        const producer = [...room.peers.values()]
          .flatMap((p) => [...p.producers.values()])
          .find((p) => p.id === producerId);

        if (!producer) {
          console.error("❌ Producer not found:", {
            producerId,
            availableProducers: [...room.peers.values()].flatMap((p) =>
              Array.from(p.producers.keys())
            ),
          });
          return cb({ error: "Producer not found" });
        }

        console.log("🔍 Found producer:", {
          producerId,
          kind: producer.kind,
          producerUserId: [...room.peers.values()].find((p) =>
            p.producers.has(producerId)
          )?.userId,
        });

        // can this peer consume this producer?
        if (
          !room.router.canConsume({
            producerId,
            rtpCapabilities: peer.rtpCapabilities!,
          })
        ) {
          console.error("❌ Cannot consume producer:", {
            producerId,
            hasRtpCapabilities: !!peer.rtpCapabilities,
            codecCount: peer.rtpCapabilities?.codecs?.length || 0,
          });
          return cb({ error: "Cannot consume" });
        }

        const consumer = await producerPeerTransport.consume({
          producerId,
          rtpCapabilities: peer.rtpCapabilities!,
          paused: true, // start paused; client will resume
        });

        peer.consumers.set(consumer.id, consumer);
        console.log("✅ Consumer created:", {
          consumerId: consumer.id,
          producerId,
          kind: consumer.kind,
          code,
          userId: peer.userId,
          consumerCount: peer.consumers.size,
        });

        // Debug: Log media flow after consumer creation
        MediaSoupDebugger.logMediaFlow(code);

        consumer.on("transportclose", () => {
          console.log("🔌 Consumer transport closed:", {
            consumerId: consumer.id,
            producerId,
          });
          peer.consumers.delete(consumer.id);
        });

        consumer.on("producerclose", () => {
          console.log("🔌 Producer closed, removing consumer:", {
            consumerId: consumer.id,
            producerId,
          });
          peer.consumers.delete(consumer.id);
          socket
            .to(room.code)
            .emit(SOCKET_EVENTS.BROADCAST.PRODUCER_CLOSED, { producerId });
        });

        cb({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (e) {
        console.error("❌ Consumer creation failed:", e);
        cb({ error: "createConsumer failed" });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.MEDIA.RESUME_CONSUMER,
    async ({ consumerId, code }, cb) => {
      console.log("▶️ Resuming consumer:", {
        code,
        consumerId,
        socketId: socket.id,
        userId: socket.decoded?.user?.id,
      });

      try {
        const room = rooms.get(code!);
        if (!room) {
          console.error("❌ Room not found for resume consumer:", code);
          return cb({ error: "Room not found" });
        }

        const peer = getPeer(code, socket.decoded?.user?.id);
        if (!peer) {
          console.error("❌ Peer not found for resume consumer:", {
            code,
            userId: socket.decoded?.user?.id,
          });
          return cb({ error: "Peer not found" });
        }

        const consumer = peer.consumers.get(consumerId);
        if (!consumer) {
          console.error("❌ Consumer not found:", {
            consumerId,
            availableConsumers: Array.from(peer.consumers.keys()),
          });
          return cb({ error: "Consumer not found" });
        }

        await consumer.resume();
        console.log("✅ Consumer resumed:", {
          consumerId,
          code,
          userId: peer.userId,
        });
        cb({ resumed: true });
      } catch (e) {
        console.error("❌ Resume consumer failed:", e);
        cb({ error: "resumeConsumer failed" });
      }
    }
  );

  // socket.on("disconnect", () => {
  //   if (!code) return;
  //   const room = rooms.get(code);
  //   if (!room) return;
  //   const peer = room.peers.get(socket.id);
  //   if (!peer) return;

  //   // cleanup
  //   peer.consumers.forEach(c => c.close());
  //   peer.producers.forEach(p => p.close());
  //   peer.transports.forEach(t => t.close());
  //   room.peers.delete(socket.id);

  //   // optional: if room empty, close router
  //   if (room.peers.size === 0) {
  //     room.router.close();
  //     rooms.delete(room.id);
  //   }
  // });
}
