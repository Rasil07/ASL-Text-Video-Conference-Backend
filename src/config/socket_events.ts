// ============================================================================
// WEBSOCKET EVENTS CONFIGURATION
// ============================================================================
// This file centralizes all WebSocket event names to avoid hardcoding
// and ensure consistency across the application.

export const SOCKET_EVENTS = {
  // ============================================================================
  // ROOM EVENTS (Client → Server)
  // ============================================================================
  ROOM: {
    // Room Management
    CREATE: "room:create",
    JOIN: "room:join",
    LEAVE: "room:leave",
    END: "room:end",
    LIST: "room:list",
    DETAILS: "room:details",
    LIST_CHANGED: "room:list-changed",
    // Participant Management
    UPDATE_PARTICIPANT_STATUS: "room:update-participant-status",
  },

  // ============================================================================
  // MEETING EVENTS (Client → Server) - Legacy/Alternative naming
  // ============================================================================
  MEETING: {
    CREATE: "meeting:create",
    JOIN: "meeting:join",
    LIST: "meeting:list",
    DETAILS: "meeting:details",
    END: "meeting:end",
  },

  // ============================================================================
  // MEDIA EVENTS (Client → Server)
  // ============================================================================
  MEDIA: {
    // Transport Management
    CREATE_WEBRTC_TRANSPORT: "media:create-webrtc-transport",
    CONNECT_TRANSPORT: "media:connect-transport",

    // Producer Management
    PRODUCE: "media:produce",
    CLOSE_PRODUCER: "media:close-producer",

    // Consumer Management
    CONSUME: "media:consume",
    RESUME_CONSUMER: "media:resume-consumer",
    PAUSE_CONSUMER: "media:pause-consumer",
    CLOSE_CONSUMER: "media:close-consumer",

    // RTP Capabilities
    GET_RTP_CAPABILITIES: "media:get-rtp-capabilities",
  },

  // ============================================================================
  // AUTHENTICATION EVENTS (Client → Server)
  // ============================================================================
  AUTH: {
    LOGIN: "auth:login",
    LOGOUT: "auth:logout",
    VERIFY_TOKEN: "auth:verify-token",
    REFRESH_TOKEN: "auth:refresh-token",
  },

  // ============================================================================
  // SYSTEM EVENTS
  // ============================================================================
  SYSTEM: {
    DISCONNECT: "disconnect",
    CONNECT: "connect",
    ERROR: "error",
    PING: "ping",
    PONG: "pong",
  },

  // ============================================================================
  // BROADCAST EVENTS (Server → Client)
  // ============================================================================
  BROADCAST: {
    // Room Events
    ROOM_CREATED: "room:created",
    ROOM_ENDED: "room:ended",
    ROOM_LIST_UPDATED: "room:list-updated",

    // Participant Events
    PARTICIPANT_JOINED: "room:participant-joined",
    PARTICIPANT_LEFT: "room:participant-left",
    PARTICIPANT_STATUS_UPDATED: "room:participant-status-updated",
    HOST_TRANSFERRED: "room:host-transferred",

    // Meeting Events (Legacy)
    MEETING_CREATED: "meeting:created",
    MEETING_ENDED: "meeting:ended",
    MEETING_LIST_UPDATED: "meeting:list-updated",
    MEETING_LIST_CHANGED: "meeting:list:changed",
    PEER_JOINED: "meeting:peer-joined",

    // Media Events
    TRANSPORT_CREATED: "media:transport-created",
    TRANSPORT_CONNECTED: "media:transport-connected",
    PRODUCER_CREATED: "media:producer-created",
    PRODUCER_CLOSED: "media:producer-closed",
    CONSUMER_CREATED: "media:consumer-created",
    CONSUMER_RESUMED: "media:consumer-resumed",
    CONSUMER_PAUSED: "media:consumer-paused",
    CONSUMER_CLOSED: "media:consumer-closed",

    // System Events
    CONNECTION_ERROR: "connection:error",
    CONNECTION_SUCCESS: "connection:success",
  },

  // ============================================================================
  // RESPONSE EVENTS (Server → Client)
  // ============================================================================
  RESPONSE: {
    // Generic Response Format
    SUCCESS: "response:success",
    ERROR: "response:error",

    // Room Responses
    ROOM_CREATED: "response:room-created",
    ROOM_JOINED: "response:room-joined",
    ROOM_LEFT: "response:room-left",
    ROOM_ENDED: "response:room-ended",
    ROOM_LIST: "response:room-list",
    ROOM_DETAILS: "response:room-details",

    // Meeting Responses (Legacy)
    MEETING_CREATED: "response:meeting-created",
    MEETING_JOINED: "response:meeting-joined",
    MEETING_ENDED: "response:meeting-ended",
    MEETING_LIST: "response:meeting-list",
    MEETING_DETAILS: "response:meeting-details",

    // Media Responses
    RTP_CAPABILITIES: "response:rtp-capabilities",
    TRANSPORT_CREATED: "response:transport-created",
    TRANSPORT_CONNECTED: "response:transport-connected",
    PRODUCER_CREATED: "response:producer-created",
    CONSUMER_CREATED: "response:consumer-created",
  },
} as const;

// ============================================================================
// EVENT CATEGORIES FOR EASIER ACCESS
// ============================================================================

export const CLIENT_TO_SERVER_EVENTS = {
  ...SOCKET_EVENTS.ROOM,
  ...SOCKET_EVENTS.MEETING,
  ...SOCKET_EVENTS.MEDIA,
  ...SOCKET_EVENTS.AUTH,
  ...SOCKET_EVENTS.SYSTEM,
} as const;

export const SERVER_TO_CLIENT_EVENTS = {
  ...SOCKET_EVENTS.BROADCAST,
  ...SOCKET_EVENTS.RESPONSE,
} as const;

// ============================================================================
// TYPE DEFINITIONS FOR TYPE SAFETY
// ============================================================================

export type SocketEventName =
  | (typeof SOCKET_EVENTS.ROOM)[keyof typeof SOCKET_EVENTS.ROOM]
  | (typeof SOCKET_EVENTS.MEETING)[keyof typeof SOCKET_EVENTS.MEETING]
  | (typeof SOCKET_EVENTS.MEDIA)[keyof typeof SOCKET_EVENTS.MEDIA]
  | (typeof SOCKET_EVENTS.AUTH)[keyof typeof SOCKET_EVENTS.AUTH]
  | (typeof SOCKET_EVENTS.SYSTEM)[keyof typeof SOCKET_EVENTS.SYSTEM]
  | (typeof SOCKET_EVENTS.BROADCAST)[keyof typeof SOCKET_EVENTS.BROADCAST]
  | (typeof SOCKET_EVENTS.RESPONSE)[keyof typeof SOCKET_EVENTS.RESPONSE];

export type ClientToServerEvent = keyof typeof CLIENT_TO_SERVER_EVENTS;
export type ServerToClientEvent = keyof typeof SERVER_TO_CLIENT_EVENTS;

// ============================================================================
// EVENT VALIDATION HELPERS
// ============================================================================

export const isValidSocketEvent = (
  eventName: string
): eventName is SocketEventName => {
  const allEvents = Object.values(SOCKET_EVENTS).flatMap((category) =>
    Object.values(category)
  );
  return allEvents.includes(eventName as SocketEventName);
};

export const isRoomEvent = (eventName: string): boolean => {
  return Object.values(SOCKET_EVENTS.ROOM).includes(eventName as any);
};

export const isMeetingEvent = (eventName: string): boolean => {
  return Object.values(SOCKET_EVENTS.MEETING).includes(eventName as any);
};

export const isMediaEvent = (eventName: string): boolean => {
  return Object.values(SOCKET_EVENTS.MEDIA).includes(eventName as any);
};

export const isBroadcastEvent = (eventName: string): boolean => {
  return Object.values(SOCKET_EVENTS.BROADCAST).includes(eventName as any);
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SOCKET_EVENTS;
