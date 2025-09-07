// ============================================================================
// SOCKET EVENTS USAGE EXAMPLES
// ============================================================================
// This file demonstrates how to use the centralized socket events
// instead of hardcoded strings throughout the application.

import {
  SOCKET_EVENTS,
  isValidSocketEvent,
  isRoomEvent,
} from "../config/socket_events";
import { Server, Socket } from "socket.io";

// ============================================================================
// EXAMPLE 1: Using Socket Events in Event Handlers
// ============================================================================

export function exampleRoomHandler(socket: Socket) {
  // ✅ GOOD: Using centralized constants
  socket.on(SOCKET_EVENTS.ROOM.CREATE, (data, callback) => {
    console.log("Room creation requested:", data);
    // Handle room creation...
    callback({ success: true });
  });

  socket.on(SOCKET_EVENTS.ROOM.JOIN, (data, callback) => {
    console.log("Room join requested:", data);
    // Handle room join...
    callback({ success: true });
  });

  // ❌ BAD: Hardcoded strings (avoid this)
  // socket.on("room:create", (data, callback) => { ... });
}

// ============================================================================
// EXAMPLE 2: Broadcasting Events
// ============================================================================

export function exampleBroadcasting(io: Server, socket: Socket) {
  // ✅ GOOD: Using centralized constants for broadcasting
  io.emit(SOCKET_EVENTS.BROADCAST.ROOM_LIST_UPDATED, [
    { id: "1", title: "Room 1" },
    { id: "2", title: "Room 2" },
  ]);

  socket.to("room-123").emit(SOCKET_EVENTS.BROADCAST.PARTICIPANT_JOINED, {
    userId: "user-456",
    userName: "John Doe",
  });

  // ❌ BAD: Hardcoded strings (avoid this)
  // io.emit("room:list-updated", rooms);
}

// ============================================================================
// EXAMPLE 3: Event Validation
// ============================================================================

export function exampleEventValidation(eventName: string) {
  // Check if event is valid
  if (isValidSocketEvent(eventName)) {
    console.log(`Valid event: ${eventName}`);
  } else {
    console.error(`Invalid event: ${eventName}`);
  }

  // Check event category
  if (isRoomEvent(eventName)) {
    console.log("This is a room-related event");
  }
}

// ============================================================================
// EXAMPLE 4: Frontend Usage (TypeScript)
// ============================================================================

/*
// Frontend TypeScript usage example:

import { io, Socket } from 'socket.io-client';

const socket: Socket = io('ws://localhost:3000');

// Listen for room events
socket.on('room:list-updated', (rooms) => {
  console.log('Room list updated:', rooms);
});

socket.on('room:participant-joined', (participant) => {
  console.log('Participant joined:', participant);
});

// Emit room events
socket.emit('room:create', {
  title: 'My Meeting',
  description: 'Team discussion',
  createdBy: 'user-123'
}, (response) => {
  if (response.success) {
    console.log('Room created successfully');
  }
});

socket.emit('room:join', {
  meetingId: 'room-456',
  peerId: 'peer-789',
  userId: 'user-123',
  userName: 'John Doe',
  userEmail: 'john@example.com'
}, (response) => {
  if (response.success) {
    console.log('Joined room successfully');
  }
});
*/

// ============================================================================
// EXAMPLE 5: Event Categories
// ============================================================================

export function exampleEventCategories() {
  console.log("Room Events:", Object.values(SOCKET_EVENTS.ROOM));
  console.log("Meeting Events:", Object.values(SOCKET_EVENTS.MEETING));
  console.log("Media Events:", Object.values(SOCKET_EVENTS.MEDIA));
  console.log("Broadcast Events:", Object.values(SOCKET_EVENTS.BROADCAST));
  console.log("System Events:", Object.values(SOCKET_EVENTS.SYSTEM));
}

// ============================================================================
// EXAMPLE 6: Error Handling with Events
// ============================================================================

export function exampleErrorHandling(socket: Socket) {
  socket.on(SOCKET_EVENTS.ROOM.CREATE, async (data, callback) => {
    try {
      // Simulate room creation
      const room = await createRoom(data);

      // Success response
      callback({
        success: true,
        room,
        event: SOCKET_EVENTS.RESPONSE.ROOM_CREATED,
      });

      // Broadcast to all clients
      socket.broadcast.emit(SOCKET_EVENTS.BROADCAST.ROOM_CREATED, {
        roomId: room.id,
        title: room.title,
      });
    } catch (error) {
      // Error response
      callback({
        success: false,
        error: error.message,
        event: SOCKET_EVENTS.RESPONSE.ERROR,
      });
    }
  });
}

// Mock function for example
async function createRoom(data: any) {
  return { id: "room-123", title: data.title };
}

// ============================================================================
// BENEFITS OF USING CENTRALIZED SOCKET EVENTS
// ============================================================================

/*
1. ✅ CONSISTENCY: All event names are defined in one place
2. ✅ TYPE SAFETY: TypeScript can validate event names
3. ✅ REFACTORING: Easy to rename events across the entire codebase
4. ✅ DOCUMENTATION: Clear overview of all available events
5. ✅ VALIDATION: Built-in event validation helpers
6. ✅ CATEGORIZATION: Events are logically grouped by functionality
7. ✅ MAINTENANCE: Reduces typos and hardcoded strings
8. ✅ SCALABILITY: Easy to add new events as the application grows
*/
