# MediaSoup Pipeline Flow & Debugging Guide

## 🔄 **Fixed Room Join Flow**

The room join process has been separated into two distinct events to avoid confusion:

### **1. First Call: `room:join`**

```typescript
// Frontend calls this first
socket.emit(
  "room:join",
  {
    code: "room-123",
    userId: "user-456",
    userName: "John Doe",
    userEmail: "john@example.com",
  },
  (response) => {
    // Response contains:
    // - success: boolean
    // - room: RoomData (complete room information)
    // - routerRtpCapabilities: RtpCapabilities (router's capabilities)
  }
);
```

**Purpose**: Join the room and get the router's RTP capabilities.

### **2. Second Call: `media:set-rtp-capabilities`**

```typescript
// Frontend calls this after getting router capabilities
socket.emit(
  "media:set-rtp-capabilities",
  {
    code: "room-123",
    userId: "user-456",
    rtpCapabilities: clientRtpCapabilities, // Client's RTP capabilities
  },
  (response) => {
    // Response contains:
    // - success: boolean
  }
);
```

**Purpose**: Set the peer's RTP capabilities for media consumption.

## 🎬 **Complete MediaSoup Pipeline Flow**

### **Step 1: Room Join**

```
Frontend → Backend
room:join → Join room, get router RTP capabilities
```

### **Step 2: Set RTP Capabilities**

```
Frontend → Backend
media:set-rtp-capabilities → Set peer RTP capabilities
```

### **Step 3: Create Transports**

```
Frontend → Backend
media:create-webrtc-transport (direction: "send") → Create send transport
media:create-webrtc-transport (direction: "recv") → Create receive transport
```

### **Step 4: Connect Transports**

```
Frontend → Backend
media:connect-transport → Connect send transport
media:connect-transport → Connect receive transport
```

### **Step 5: Produce Media**

```
Frontend → Backend
media:produce → Create producer (audio/video)
```

### **Step 6: Consume Media**

```
Backend → Frontend
newProducer event → Notify about new producer
Frontend → Backend
media:create-consumer → Create consumer for producer
```

### **Step 7: Resume Consumer**

```
Frontend → Backend
media:resume-consumer → Resume paused consumer
```

## 🐛 **Debugging Utilities**

### **Available Debug Functions**

```typescript
import {
  debugRoom,
  debugAllRooms,
  debugPeer,
  debugPipeline,
  debugRtpCapabilities,
  debugTransports,
  debugMediaFlow,
  validateRoom,
} from "../utils/mediasoup-debug";

// Debug specific room
debugRoom("room-123");

// Debug all rooms
debugAllRooms();

// Debug specific peer
debugPeer("room-123", "user-456");

// Debug pipeline flow
debugPipeline("room-123", "user-456", "CREATE_TRANSPORT", {
  direction: "send",
});

// Debug RTP capabilities
debugRtpCapabilities("room-123", "user-456");

// Debug transport status
debugTransports("room-123", "user-456");

// Debug media flow (producers/consumers)
debugMediaFlow("room-123");

// Validate room integrity
validateRoom("room-123");
```

### **Debug Output Examples**

#### **Room State Debug**

```
🏠 === ROOM STATE: room-123 ===
📊 Basic Info: {
  title: "Team Meeting",
  status: "ongoing",
  createdBy: "user-456",
  hostName: "John Doe"
}
🔧 Router Info: {
  hasRouter: true,
  codecCount: 3,
  headerExtensionCount: 2
}
👥 Participants (2):
  👤 Peer: user-456 {
    userName: "John Doe",
    isHost: true,
    transportCount: 2,
    producerCount: 1,
    consumerCount: 1
  }
🏠 === END ROOM STATE ===
```

#### **Media Flow Debug**

```
🎬 === MEDIA FLOW: room-123 ===
🎥 Producers (2):
  - prod-123: audio (from user-456)
  - prod-124: video (from user-456)
🎧 Consumers (2):
  - cons-123: audio (user-789 consuming prod-123)
  - cons-124: video (user-789 consuming prod-124)
🎬 === END MEDIA FLOW ===
```

## 🔍 **Common Issues & Solutions**

### **Issue 1: "Peer not found"**

**Cause**: User not properly joined to room
**Solution**: Ensure `room:join` is called before any media operations

### **Issue 2: "RTP capabilities not set"**

**Cause**: `media:set-rtp-capabilities` not called
**Solution**: Call `media:set-rtp-capabilities` after `room:join`

### **Issue 3: "Transport not found"**

**Cause**: Transport not created or wrong transport ID
**Solution**: Create transport with `media:create-webrtc-transport` first

### **Issue 4: "Cannot consume"**

**Cause**: RTP capabilities mismatch between router and peer
**Solution**: Check RTP capabilities with `debugRtpCapabilities()`

### **Issue 5: "Producer not found"**

**Cause**: Producer doesn't exist or was closed
**Solution**: Check media flow with `debugMediaFlow()`

## 📊 **Event Flow Summary**

```
1. room:join → Get router RTP capabilities
2. media:set-rtp-capabilities → Set peer RTP capabilities
3. media:create-webrtc-transport (send) → Create send transport
4. media:create-webrtc-transport (recv) → Create receive transport
5. media:connect-transport (send) → Connect send transport
6. media:connect-transport (recv) → Connect receive transport
7. media:produce → Create producer
8. newProducer event → Notify others about new producer
9. media:create-consumer → Create consumer for producer
10. media:resume-consumer → Resume consumer
```

## 🎯 **Key Points**

1. **Two-step join process**: `room:join` then `media:set-rtp-capabilities`
2. **Transport creation**: Create both send and receive transports
3. **RTP capabilities**: Must be set before creating consumers
4. **Producer/Consumer flow**: Producers notify others, consumers are created on demand
5. **Debugging**: Use debug utilities to trace the entire pipeline

## 🚀 **Frontend Implementation Example**

```typescript
// 1. Join room
socket.emit(
  "room:join",
  {
    code: "room-123",
    userId: "user-456",
    userName: "John Doe",
    userEmail: "john@example.com",
  },
  (response) => {
    if (response.success) {
      // 2. Set RTP capabilities
      socket.emit(
        "media:set-rtp-capabilities",
        {
          code: "room-123",
          userId: "user-456",
          rtpCapabilities: device.rtpCapabilities,
        },
        (response) => {
          if (response.success) {
            // 3. Create transports
            createTransports();
          }
        }
      );
    }
  }
);

async function createTransports() {
  // Create send transport
  socket.emit(
    "media:create-webrtc-transport",
    {
      roomId: "room-123",
      direction: "send",
    },
    async (response) => {
      if (response.success) {
        const sendTransport = device.createSendTransport(response.transport);
        // Connect and produce media...
      }
    }
  );

  // Create receive transport
  socket.emit(
    "media:create-webrtc-transport",
    {
      roomId: "room-123",
      direction: "recv",
    },
    async (response) => {
      if (response.success) {
        const recvTransport = device.createRecvTransport(response.transport);
        // Connect and consume media...
      }
    }
  );
}
```
