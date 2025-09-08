import { Server, Socket } from "socket.io";
import RoomService from "../services/room.service";
import { SOCKET_EVENTS } from "../config/socket_events";
import "../types/socket"; // Import socket type extensions
import { RtpCapabilities } from "./types";
import { Peer, rooms } from "./roomState";
import { MediaSoupDebugger } from "../utils/mediasoup-debug";
export default function registerRoomHandlers(io: Server, socket: Socket) {
  const roomService = RoomService.getInstance(io);

  // Create a new room
  socket.on(
    SOCKET_EVENTS.ROOM.CREATE,
    async (
      data: {
        title: string;
        description?: string;
        maxParticipants?: number;
      },
      callback
    ) => {
      if (!socket.decoded?.user) {
        return callback({ success: false, error: "User not authenticated" });
      }

      console.log("Creating room", socket.decoded.user);
      try {
        const room = await roomService.createRoom(
          {
            ...data,
            host: socket.decoded.user.id,
            hostName: socket.decoded.user.name,
            hostEmail: socket.decoded.user.email,
            maxParticipants: data.maxParticipants,
          },
          socket
        );

        if (callback && typeof callback === "function") {
          callback({ success: true, room: room });
        }
      } catch (error) {
        console.error("Room creation failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Join an existing room (first call - get router RTP capabilities)
  socket.on(
    SOCKET_EVENTS.ROOM.JOIN,
    async (
      data: {
        code: string;
        userId: string;
        userName: string;
        userEmail: string;
      },
      callback
    ) => {
      if (!socket.decoded?.user) {
        return callback({ success: false, error: "User not authenticated" });
      }

      console.log("🔗 Joining room:", { code: data.code, userId: data.userId });
      try {
        const room = await roomService.joinRoom(data, socket);
        const roomState = rooms.get(data.code);

        const producers = [];
        for (const peer of roomState.peers.values()) {
          for (const p of peer.producers.values()) {
            producers.push({
              producerId: p.id,
              kind: p.kind,
              socketId: peer.socketId,
              peerName: peer.userName,
              peerId: peer.userId,
              mediaTag: p.appData?.mediaTag,
            });
          }
        }

        console.log("📋 Existing producers in room:", producers);
        console.log("📊 Room state summary:", {
          roomCode: data.code,
          participantCount: roomState?.peers.size || 0,
          producerCount: producers.length,
          hasRouter: !!roomState?.router,
          routerCapabilities: !!roomState?.router?.rtpCapabilities,
        });

        if (callback && typeof callback === "function") {
          callback({
            success: true,
            room: room,
            routerRtpCapabilities: roomState?.router.rtpCapabilities,
            producers,
          });
        }
      } catch (error) {
        console.error("❌ Room join failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Set peer RTP capabilities (second call - after getting router capabilities)
  socket.on(
    SOCKET_EVENTS.MEDIA.SET_RTP_CAPABILITIES,
    async (
      data: {
        code: string;
        userId: string;
        rtpCapabilities: RtpCapabilities;
      },
      callback
    ) => {
      if (!socket.decoded?.user) {
        return callback({ success: false, error: "User not authenticated" });
      }

      console.log("🎯 Setting RTP capabilities for peer:", {
        code: data.code,
        userId: data.userId,
        hasRtpCapabilities: !!data.rtpCapabilities,
      });

      try {
        const roomState = rooms.get(data.code);
        if (!roomState) {
          return callback({ success: false, error: "Room not found" });
        }

        const peer = roomState.peers.get(data.userId);
        if (!peer) {
          return callback({ success: false, error: "Peer not found in room" });
        }

        // Set the peer's RTP capabilities
        peer.rtpCapabilities = data.rtpCapabilities;

        console.log("✅ RTP capabilities set for peer:", {
          userId: data.userId,
          codecCount: data.rtpCapabilities?.codecs?.length || 0,
          headerExtensionCount:
            data.rtpCapabilities?.headerExtensions?.length || 0,
        });

        // Debug: Log RTP capabilities comparison
        MediaSoupDebugger.logRtpCapabilitiesComparison(data.code, data.userId);

        if (callback && typeof callback === "function") {
          callback({
            success: true,
            room: roomService.createRoomData(roomState),
          });
        }
      } catch (error) {
        console.error("❌ Failed to set RTP capabilities:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Leave a room
  socket.on(
    SOCKET_EVENTS.ROOM.LEAVE,
    async (
      data: {
        code: string;
        userId: string;
      },
      callback
    ) => {
      try {
        await roomService.leaveRoom(data.code, data.userId, socket);

        if (callback && typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Room leave failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // End a room (host only)
  socket.on(
    SOCKET_EVENTS.ROOM.END,
    async (
      data: {
        code: string;
        userId: string;
      },
      callback
    ) => {
      try {
        await roomService.endRoom(data.code, data.userId);

        if (callback && typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Room end failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Get list of active rooms
  socket.on(SOCKET_EVENTS.ROOM.LIST, (_payload, callback) => {
    try {
      const rooms = roomService.getActiveRooms();

      if (callback && typeof callback === "function") {
        callback({ success: true, rooms: rooms });
      }
    } catch (error) {
      console.error("Room list failed:", error);
      if (callback && typeof callback === "function") {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Get specific room details
  socket.on(
    SOCKET_EVENTS.ROOM.DETAILS,
    (
      data: {
        code: string;
      },
      callback
    ) => {
      try {
        const room = roomService.getRoomInfo(data.code);

        if (callback && typeof callback === "function") {
          callback({ success: true, data: room });
        }
      } catch (error) {
        console.error("Room details failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Update participant status (mute, video, etc.)
  socket.on(
    SOCKET_EVENTS.ROOM.UPDATE_PARTICIPANT_STATUS,
    (
      data: {
        meetingId: string;
        userId: string;
        updates: {
          isMuted?: boolean;
          isVideoEnabled?: boolean;
        };
      },
      callback
    ) => {
      try {
        roomService.updateParticipantStatus(
          data.meetingId,
          data.userId,
          data.updates
        );

        if (callback && typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Participant status update failed:", error);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    }
  );

  // Handle socket disconnection
  socket.on(SOCKET_EVENTS.SYSTEM.DISCONNECT, () => {
    roomService.handleDisconnect(socket);
  });
}
