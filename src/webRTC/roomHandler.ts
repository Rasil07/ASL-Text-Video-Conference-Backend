import { Server, Socket } from "socket.io";
import RoomService from "../services/room.service";
import { SOCKET_EVENTS } from "../config/socket_events";
import "../types/socket"; // Import socket type extensions

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

  // Join an existing room
  socket.on(
    SOCKET_EVENTS.ROOM.JOIN,
    async (
      data: {
        code: string;
        peerId: string;
        userId: string;
        userName: string;
        userEmail: string;
      },
      callback
    ) => {
      try {
        const room = await roomService.joinRoom(data, socket);

        if (callback && typeof callback === "function") {
          callback({ success: true, room: room });
        }
      } catch (error) {
        console.error("Room join failed:", error);
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
