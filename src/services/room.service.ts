import { Server, Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { rooms, RoomState } from "../webRTC/roomState";
import { createRouter } from "../webRTC/media";
import { Room } from "../models/room";
import { SOCKET_EVENTS } from "../config/socket_events";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateRoomData {
  title: string;
  description?: string;
  host: string;
  hostName: string;
  hostEmail: string;
  maxParticipants?: number;
}

export interface JoinRoomData {
  code: string;
  peerId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

// Standardized room data structure matching schema + runtime fields
export interface RoomData {
  // Schema fields
  _id: string;
  title: string;
  description?: string;
  host: string;
  code: string;
  status: "scheduled" | "ongoing" | "ended" | "cancelled";
  startedAt?: Date;
  endedAt?: Date;
  options: {
    allowGuests: boolean;
    maxParticipants: number;
    recordingEnabled: boolean;
    asl: {
      captionsEnabled: boolean;
      ttsEnabled: boolean;
      captionLanguage: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  // Runtime calculated fields
  hostName: string;
  hostEmail: string;
  participantCount: number;
  participants: ParticipantData[];
}

export interface ParticipantData {
  peerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  joinedAt: Date;
  isHost: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface RoomSettings {
  maxParticipants?: number;
  allowScreenShare?: boolean;
  allowChat?: boolean;
  allowRecording?: boolean;
  isPrivate?: boolean;
  requirePassword?: boolean;
  password?: string;
}

export interface ParticipantData {
  peerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  isHost: boolean;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// ROOM SERVICE CLASS
// ============================================================================

class RoomService {
  private io: Server;
  private static instance: RoomService;
  private readonly ROOM_CLEANUP_DELAY = 5000; // 5 seconds

  private constructor(io: Server) {
    this.io = io;
  }

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================

  public static getInstance(io: Server): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService(io);
    }
    return RoomService.instance;
  }

  // ============================================================================
  // ROOM MANAGEMENT - PUBLIC METHODS
  // ============================================================================

  /**
   * Create a new room (both WebRTC and database)
   */
  public async createRoom(
    data: CreateRoomData,
    socket: Socket
  ): Promise<RoomData> {
    try {
      const meetingId = this.generateMeetingId();

      console.log("Meeting ID", meetingId);
      const router = await this.createWebRTCRouter();
      const roomState = this.createRoomState(meetingId, data, router);

      // Store in memory
      rooms.set(meetingId, roomState);

      // Persist to database (optional)
      await this.persistRoomToDatabase(data, meetingId);

      // Add creator as first participant
      this.addParticipant(meetingId, {
        peerId: uuid(),
        userId: data.host,
        userName: data.hostName || "Host",
        userEmail: data.hostEmail || "",
        socketId: socket.id,
        joinedAt: new Date(),
        isHost: true,
        isMuted: false,
        isVideoEnabled: true,
      });

      // Broadcast events
      this.broadcastRoomCreation(meetingId, data);
      this.broadcastRoomList();

      return this.createRoomData(rooms.get(meetingId)!);
    } catch (error) {
      this.handleError("Failed to create room", error);
      throw error;
    }
  }

  /**
   * Join an existing room
   */
  public async joinRoom(data: JoinRoomData, socket: Socket): Promise<RoomData> {
    try {
      const room = this.validateRoomForJoin(data.code);
      this.validateUserNotInRoom(room, data.userId);

      // Add participant
      this.addParticipant(data.code, {
        peerId: data.peerId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        socketId: socket.id,
        joinedAt: new Date(),
        isHost: false,
        isMuted: false,
        isVideoEnabled: true,
      });

      // Join socket room
      socket.join(data.code);

      // Notify other participants
      this.notifyParticipantJoined(socket, data.code, data);
      this.broadcastRoomList();

      return this.createRoomData(rooms.get(data.code)!);
    } catch (error) {
      this.handleError("Failed to join room", error);
      throw error;
    }
  }

  /**
   * Leave a room
   */
  public async leaveRoom(
    meetingId: string,
    userId: string,
    socket: Socket
  ): Promise<void> {
    try {
      const room = this.getRoom(meetingId);
      const participant = this.getParticipant(room, userId);

      // Remove participant
      this.removeParticipant(room, participant, socket, meetingId);

      // Handle host transfer or room cleanup
      await this.handleParticipantLeave(room, participant, meetingId, userId);

      // Notify other participants
      this.notifyParticipantLeft(socket, meetingId, participant);
      this.broadcastRoomList();
    } catch (error) {
      this.handleError("Failed to leave room", error);
      throw error;
    }
  }

  /**
   * End a room (host only)
   */
  public async endRoom(meetingId: string, userId: string): Promise<void> {
    try {
      const room = this.getRoom(meetingId);
      this.validateHostPermission(room, userId);

      // Mark room as inactive
      room.status = "ended";

      // Notify all participants
      this.io
        .to(meetingId)
        .emit(SOCKET_EVENTS.BROADCAST.ROOM_ENDED, { code: meetingId });

      // Schedule cleanup
      this.scheduleRoomCleanup(meetingId);

      // Update database
      await this.updateRoomInDatabase(userId);

      // Broadcast updated room list
      this.broadcastRoomList();
    } catch (error) {
      this.handleError("Failed to end room", error);
      throw error;
    }
  }

  // ============================================================================
  // ROOM QUERY METHODS
  // ============================================================================

  /**
   * Get list of active rooms
   */
  public getActiveRooms(): RoomData[] {
    return Array.from(rooms.values())
      .filter((room) => room.status === "ongoing")
      .map((room) => this.createRoomData(room));
  }

  /**
   * Get specific room information
   */
  public getRoomInfo(meetingId: string): RoomData {
    const room = this.getRoom(meetingId);
    return this.createRoomData(room);
  }

  /**
   * Get room participants
   */
  public getRoomParticipants(meetingId: string): ParticipantData[] {
    const room = this.getRoom(meetingId);

    return Array.from(room.peers.values()).map((peer) => ({
      peerId: peer.peerId,
      userId: peer.userId,
      userName: peer.userName,
      userEmail: peer.userEmail,
      socketId: peer.socketId,
      joinedAt: peer.joinedAt,
      isHost: peer.isHost,
      isMuted: peer.isMuted,
      isVideoEnabled: peer.isVideoEnabled,
    }));
  }

  // ============================================================================
  // PARTICIPANT MANAGEMENT
  // ============================================================================

  /**
   * Update participant status (mute, video, etc.)
   */
  public updateParticipantStatus(
    meetingId: string,
    userId: string,
    updates: Partial<Pick<ParticipantData, "isMuted" | "isVideoEnabled">>
  ): void {
    const room = this.getRoom(meetingId);
    const participant = this.getParticipant(room, userId);

    // Update participant status
    this.applyParticipantUpdates(participant, updates);

    // Broadcast status update to room
    this.io
      .to(meetingId)
      .emit(SOCKET_EVENTS.BROADCAST.PARTICIPANT_STATUS_UPDATED, {
        userId,
        updates,
      });
  }

  // ============================================================================
  // BROADCASTING & NOTIFICATIONS
  // ============================================================================

  /**
   * Broadcast room list to all connected clients
   */
  public broadcastRoomList(): void {
    const activeRooms = this.getActiveRooms();
    this.io.emit(SOCKET_EVENTS.BROADCAST.ROOM_LIST_UPDATED, activeRooms);
  }

  /**
   * Handle socket disconnection
   */
  public handleDisconnect(socket: Socket): void {
    let roomsUpdated = false;

    // Find rooms where this socket was a participant
    for (const [meetingId, room] of rooms.entries()) {
      const participant = this.findParticipantBySocket(room, socket.id);

      if (participant) {
        this.handleDisconnectedParticipant(room, participant, meetingId);
        roomsUpdated = true;
      }
    }

    if (roomsUpdated) {
      this.broadcastRoomList();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - ROOM CREATION
  // ============================================================================

  private generateMeetingId(): string {
    return uuid();
  }

  private async createWebRTCRouter() {
    return await createRouter();
  }

  private createRoomState(
    meetingId: string,
    data: CreateRoomData,
    router: any
  ): RoomState {
    return {
      code: meetingId,
      title: data.title,
      description: data.description,
      hostName: data.hostName,
      hostEmail: data.hostEmail,
      createdBy: data.host,
      createdAt: new Date(),
      router,
      peers: new Map(),
      status: "ongoing",
    };
  }

  private async persistRoomToDatabase(
    data: CreateRoomData,
    meetingId: string
  ): Promise<void> {
    try {
      const dbRoom = new Room({
        title: data.title,
        description: data.description,
        status: "ongoing",
        host: data.host,
        code: meetingId,
        options: {
          maxParticipants: data.maxParticipants,
        },
      });
      await dbRoom.save();
    } catch (dbError) {
      console.warn("Failed to save room to database:", dbError);
      // Continue with in-memory room even if DB fails
    }
  }

  private generateRoomCode(): string {
    return uuid()
      .replace(/-/g, "")
      .slice(0, Math.floor(Math.random() * 5) + 6); // 6-10 char unique code
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - VALIDATION
  // ============================================================================

  private getRoom(meetingId: string): RoomState {
    const room = rooms.get(meetingId);
    if (!room) {
      throw new Error("Room not found");
    }
    return room;
  }

  private validateRoomForJoin(meetingId: string): RoomState {
    const room = this.getRoom(meetingId);
    if (room.status !== "ongoing") {
      throw new Error("Room is not active");
    }
    return room;
  }

  private validateUserNotInRoom(room: RoomState, userId: string): void {
    const existingParticipant = Array.from(room.peers.values()).find(
      (peer) => peer.userId === userId
    );
    if (existingParticipant) {
      throw new Error("User is already in the room");
    }
  }

  private validateHostPermission(room: RoomState, userId: string): void {
    const host = Array.from(room.peers.values()).find(
      (peer) => peer.isHost && peer.userId === userId
    );
    if (!host) {
      throw new Error("Only the host can end the room");
    }
  }

  private getParticipant(room: RoomState, userId: string) {
    const participant = Array.from(room.peers.values()).find(
      (peer) => peer.userId === userId
    );
    if (!participant) {
      throw new Error("User is not in the room");
    }
    return participant;
  }

  private findParticipantBySocket(room: RoomState, socketId: string) {
    return Array.from(room.peers.values()).find(
      (peer) => peer.socketId === socketId
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - PARTICIPANT MANAGEMENT
  // ============================================================================

  private addParticipant(
    meetingId: string,
    participantData: ParticipantData
  ): void {
    const room = this.getRoom(meetingId);

    room.peers.set(participantData.peerId, {
      peerId: participantData.peerId,
      userId: participantData.userId,
      userName: participantData.userName,
      userEmail: participantData.userEmail,
      socketId: participantData.socketId,
      isHost: participantData.isHost,
      isMuted: false,
      isVideoEnabled: true,
      joinedAt: new Date(),
      producers: new Map(),
      consumers: new Map(),
    });
  }

  private removeParticipant(
    room: RoomState,
    participant: any,
    socket: Socket,
    meetingId: string
  ): void {
    room.peers.delete(participant.peerId);
    socket.leave(meetingId);
  }

  private applyParticipantUpdates(
    participant: any,
    updates: Partial<Pick<ParticipantData, "isMuted" | "isVideoEnabled">>
  ): void {
    if (updates.isMuted !== undefined) {
      participant.isMuted = updates.isMuted;
    }
    if (updates.isVideoEnabled !== undefined) {
      participant.isVideoEnabled = updates.isVideoEnabled;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - ROOM LIFECYCLE
  // ============================================================================

  private async handleParticipantLeave(
    room: RoomState,
    participant: any,
    meetingId: string,
    userId: string
  ): Promise<void> {
    // If host leaves and there are other participants, transfer host
    if (participant.isHost && room.peers.size > 0) {
      this.transferHost(room, meetingId);
    } else if (room.peers.size === 0) {
      // If no participants left, end the room
      await this.endRoom(meetingId, userId);
    }
  }

  private transferHost(room: RoomState, meetingId: string): void {
    const newHost = Array.from(room.peers.values())[0];
    newHost.isHost = true;
    room.createdBy = newHost.userId;

    // Notify about host transfer
    this.io.to(meetingId).emit(SOCKET_EVENTS.BROADCAST.HOST_TRANSFERRED, {
      newHostId: newHost.userId,
      newHostName: newHost.userName,
    });
  }

  private handleDisconnectedParticipant(
    room: RoomState,
    participant: any,
    meetingId: string
  ): void {
    // Remove participant
    room.peers.delete(participant.peerId);

    // If host disconnected, transfer host or end room
    if (participant.isHost) {
      if (room.peers.size > 0) {
        this.transferHost(room, meetingId);
      } else {
        // No participants left, end the room
        room.status = "ended";
        this.scheduleRoomCleanup(meetingId);
      }
    }

    // Notify other participants
    this.io.to(meetingId).emit(SOCKET_EVENTS.BROADCAST.PARTICIPANT_LEFT, {
      peerId: participant.peerId,
      userId: participant.userId,
      userName: participant.userName,
    });
  }

  private scheduleRoomCleanup(meetingId: string): void {
    setTimeout(() => {
      rooms.delete(meetingId);
      this.broadcastRoomList();
    }, this.ROOM_CLEANUP_DELAY);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - NOTIFICATIONS
  // ============================================================================

  private broadcastRoomCreation(meetingId: string, data: CreateRoomData): void {
    const roomData = this.createRoomData(rooms.get(meetingId)!);
    this.io.emit(SOCKET_EVENTS.BROADCAST.ROOM_CREATED, roomData);
  }

  private notifyParticipantJoined(
    socket: Socket,
    meetingId: string,
    data: JoinRoomData
  ): void {
    socket.to(meetingId).emit(SOCKET_EVENTS.BROADCAST.PARTICIPANT_JOINED, {
      peerId: data.peerId,
      userId: data.userId,
      userName: data.userName,
    });
  }

  private notifyParticipantLeft(
    socket: Socket,
    meetingId: string,
    participant: any
  ): void {
    socket.to(meetingId).emit(SOCKET_EVENTS.BROADCAST.PARTICIPANT_LEFT, {
      peerId: participant.peerId,
      userId: participant.userId,
      userName: participant.userName,
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - DATA TRANSFORMATION
  // ============================================================================

  /**
   * Create standardized room data structure from RoomState and database room
   */
  private createRoomData(roomState: RoomState, dbRoom?: any): RoomData {
    const participants = Array.from(roomState.peers.values()).map((peer) => ({
      peerId: peer.peerId,
      userId: peer.userId,
      userName: peer.userName,
      userEmail: peer.userEmail,
      socketId: peer.socketId,
      joinedAt: peer.joinedAt,
      isHost: peer.isHost,
      isMuted: peer.isMuted,
      isVideoEnabled: peer.isVideoEnabled,
    }));

    return {
      // Schema fields
      _id: roomState.code,
      title: roomState.title,
      description: roomState.description,
      host: roomState.createdBy,
      code: roomState.code,
      status: roomState.status as "ongoing" | "ended" | "cancelled",
      startedAt: roomState.createdAt,
      endedAt: roomState.status === "ended" ? new Date() : undefined,
      options: {
        allowGuests: true,
        maxParticipants: 20, // Default value
        recordingEnabled: false,
        asl: {
          captionsEnabled: true,
          ttsEnabled: false,
          captionLanguage: "en",
        },
      },
      createdAt: roomState.createdAt,
      updatedAt: new Date(),

      // Runtime calculated fields
      hostName: participants.find((p) => p.isHost)?.userName || "Unknown",
      hostEmail: participants.find((p) => p.isHost)?.userEmail || "",
      participantCount: participants.length,
      participants,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - DATABASE OPERATIONS
  // ============================================================================

  private async updateRoomInDatabase(userId: string): Promise<void> {
    try {
      await Room.findOneAndUpdate(
        { createdBy: userId },
        { status: "inactive" }
      );
    } catch (dbError) {
      console.warn("Failed to update room in database:", dbError);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - ERROR HANDLING
  // ============================================================================

  private handleError(context: string, error: any): void {
    console.error(`${context}:`, error);
    throw new Error(`${context}: ${error.message}`);
  }
}

export default RoomService;
