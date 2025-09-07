// ============================================================================
// STANDARDIZED ROOM DATA STRUCTURE
// ============================================================================
// This file defines the standardized room data structure that all room events
// should return, matching the database schema with additional runtime fields.

import { Types } from "mongoose";

// ============================================================================
// CORE ROOM DATA INTERFACE
// ============================================================================

export interface RoomData {
  // ============================================================================
  // DATABASE SCHEMA FIELDS
  // ============================================================================

  /** Unique room identifier */
  _id: string;

  /** Room title */
  title: string;

  /** Optional room description */
  description?: string;

  /** Host user ID (ObjectId as string) */
  host: string;

  /** Human-friendly room code for joining */
  code: string;

  /** Current room status */
  status: "scheduled" | "ongoing" | "ended" | "cancelled";

  /** When the room was started */
  startedAt?: Date;

  /** When the room was ended */
  endedAt?: Date;

  /** Room configuration options */
  options: {
    /** Whether guests can join without authentication */
    allowGuests: boolean;

    /** Maximum number of participants */
    maxParticipants: number;

    /** Whether recording is enabled */
    recordingEnabled: boolean;

    /** ASL-specific settings */
    asl: {
      /** Whether captions are enabled */
      captionsEnabled: boolean;

      /** Whether text-to-speech is enabled */
      ttsEnabled: boolean;

      /** Language for captions */
      captionLanguage: string;
    };
  };

  /** When the room was created */
  createdAt: Date;

  /** When the room was last updated */
  updatedAt: Date;

  // ============================================================================
  // RUNTIME CALCULATED FIELDS
  // ============================================================================

  /** Host's display name */
  hostName: string;

  /** Host's email address */
  hostEmail: string;

  /** Current number of participants */
  participantCount: number;

  /** List of current participants */
  participants: ParticipantData[];
}

// ============================================================================
// PARTICIPANT DATA INTERFACE
// ============================================================================

export interface ParticipantData {
  /** Unique peer identifier */
  peerId: string;

  /** User ID */
  userId: string;

  /** User's display name */
  userName: string;

  /** User's email address */
  userEmail: string;

  /** Socket connection ID */
  socketId: string;

  /** When the participant joined */
  joinedAt: Date;

  /** Whether this participant is the host */
  isHost: boolean;

  /** Whether the participant is muted */
  isMuted: boolean;

  /** Whether video is enabled */
  isVideoEnabled: boolean;
}

// ============================================================================
// ROOM EVENT RESPONSE INTERFACES
// ============================================================================

export interface RoomEventResponse {
  /** Whether the operation was successful */
  success: boolean;

  /** Room data (if successful) */
  data?: RoomData;

  /** Error message (if failed) */
  error?: string;
}

export interface RoomListResponse {
  /** Whether the operation was successful */
  success: boolean;

  /** List of active rooms */
  data?: RoomData[];

  /** Error message (if failed) */
  error?: string;
}

// ============================================================================
// ROOM CREATION DATA INTERFACE
// ============================================================================

export interface CreateRoomData {
  /** Room title */
  title: string;

  /** Optional room description */
  description?: string;

  /** Host user ID */
  host: string;

  /** Host's display name */
  hostName: string;

  /** Host's email address */
  hostEmail: string;

  /** Maximum number of participants */
  maxParticipants?: number;
}

// ============================================================================
// ROOM JOIN DATA INTERFACE
// ============================================================================

export interface JoinRoomData {
  /** Room code to join */
  code: string;

  /** Unique peer identifier */
  peerId: string;

  /** User ID */
  userId: string;

  /** User's display name */
  userName: string;

  /** User's email address */
  userEmail: string;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example room data structure returned by all room events:

const exampleRoomData: RoomData = {
  // Schema fields
  _id: "507f1f77bcf86cd799439011",
  title: "Team Standup Meeting",
  description: "Daily standup for the development team",
  host: "507f1f77bcf86cd799439012",
  code: "ABC123",
  status: "ongoing",
  startedAt: new Date("2024-01-15T10:00:00Z"),
  endedAt: undefined,
  options: {
    allowGuests: true,
    maxParticipants: 20,
    recordingEnabled: false,
    asl: {
      captionsEnabled: true,
      ttsEnabled: false,
      captionLanguage: "en"
    }
  },
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:30:00Z"),
  
  // Runtime calculated fields
  hostName: "John Doe",
  hostEmail: "john.doe@example.com",
  participantCount: 3,
  participants: [
    {
      peerId: "peer-123",
      userId: "507f1f77bcf86cd799439012",
      userName: "John Doe",
      userEmail: "john.doe@example.com",
      socketId: "socket-456",
      joinedAt: new Date("2024-01-15T10:00:00Z"),
      isHost: true,
      isMuted: false,
      isVideoEnabled: true
    },
    {
      peerId: "peer-789",
      userId: "507f1f77bcf86cd799439013",
      userName: "Jane Smith",
      userEmail: "jane.smith@example.com",
      socketId: "socket-101",
      joinedAt: new Date("2024-01-15T10:05:00Z"),
      isHost: false,
      isMuted: true,
      isVideoEnabled: false
    }
  ]
};

// Example event responses:

// Room creation response
const createResponse: RoomEventResponse = {
  success: true,
  data: exampleRoomData
};

// Room list response
const listResponse: RoomListResponse = {
  success: true,
  data: [exampleRoomData]
//};

// Error response
const errorResponse: RoomEventResponse = {
  success: false,
  error: "Room not found"
};
*/
