# Client-Side MediaSoup Debugging Guide

## 🔍 **Issues Fixed in Backend:**

### **1. Added Missing Socket Events**

```typescript
// Added to SOCKET_EVENTS.BROADCAST
NEW_PRODUCER: "room:new-producer",
PRODUCER_CLOSED: "room:producer-closed",
```

### **2. Fixed Producer Data Structure**

The backend now sends complete producer information:

```typescript
{
  producer: {
    producerId: producer.id,
    kind: producer.kind,
    peerId: peer.userId,
    peerName: peer.userName,
    mediaTag: producer.appData?.mediaTag,
  }
}
```

### **3. Enhanced Producer Cleanup**

Added proper event handlers for producer cleanup and notifications.

## 🐛 **Client-Side Issues to Check:**

### **Issue 1: Socket Event Constants Mismatch**

**Problem**: Your client uses `SOCKET_EVENTS.ROOM.NEW_PRODUCER` but backend emits `SOCKET_EVENTS.BROADCAST.NEW_PRODUCER`.

**Solution**: Update your client's socket events config:

```typescript
// In your client's socket_events.ts
export const SOCKET_EVENTS = {
  ROOM: {
    // ... other events
    NEW_PRODUCER: "room:new-producer",
    PRODUCER_CLOSED: "room:producer-closed",
  },
};
```

### **Issue 2: Event Listener Setup**

**Problem**: Your client sets up the NEW_PRODUCER listener after joining, but it should be set up before.

**Solution**: Move event listener setup to the constructor or early in the join process:

```typescript
class SFUClient {
  constructor(roomId: string) {
    this.roomId = roomId;
    this.socket = getSocket();

    // Set up event listeners immediately
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on(
      SOCKET_EVENTS.ROOM.NEW_PRODUCER,
      this.handleNewProducer.bind(this)
    );
    this.socket.on(
      SOCKET_EVENTS.ROOM.PRODUCER_CLOSED,
      this.handleProducerClosed.bind(this)
    );
  }

  private async handleNewProducer({ producer }: { producer: ProducerSummary }) {
    console.log("New producer detected:", producer);
    try {
      const result = await this.consume(producer);
      // Handle the new stream...
    } catch (error) {
      console.error("Error consuming producer:", error);
    }
  }

  private handleProducerClosed({ producerId }: { producerId: string }) {
    console.log("Producer closed:", producerId);
    const stream = this.getStreamByProducerId(producerId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.producerStreams.delete(producerId);
    }
  }
}
```

### **Issue 3: Producer Consumption Timing**

**Problem**: Your client tries to consume existing producers before setting RTP capabilities.

**Solution**: Ensure RTP capabilities are set before consuming:

```typescript
async joinRoom(user: IUser) {
  // 1. Join room and get router capabilities
  const res = await emitWithAck(SOCKET_EVENTS.ROOM.JOIN, {
    code: this.roomId,
    userId: user.userId,
    userName: user.userName,
    userEmail: user.userEmail,
  });

  if (!res) return null;

  // 2. Load device with router capabilities
  this.device = new mediasoupClient.Device();
  await this.device.load({ routerRtpCapabilities: res.routerRtpCapabilities });

  // 3. Set RTP capabilities
  await new Promise<void>((resolve, reject) => {
    this.socket.emit(
      SOCKET_EVENTS.MEDIA.SET_RTP_CAPABILITIES,
      {
        code: this.roomId,
        userId: user.userId,
        rtpCapabilities: this.device.rtpCapabilities,
      },
      (ack: { success: boolean }) => {
        if (ack.success) resolve();
        else reject(new Error("Failed to set RTP caps"));
      }
    );
  });

  // 4. Now consume existing producers
  const existingProducers: ProducerSummary[] = res.producers || [];
  return { room: res.room as IRoom, producers: existingProducers };
}
```

### **Issue 4: Stream Management**

**Problem**: Your client doesn't properly manage stream lifecycle.

**Solution**: Add proper stream management:

```typescript
class SFUClient {
  private streams: Map<string, MediaStream> = new Map();
  private producerStreams: Map<string, MediaStream> = new Map();

  async consume(producer: ProducerSummary) {
    // ... existing consume logic ...

    const stream = new MediaStream([consumer.track]);
    this.producerStreams.set(producer.producerId, stream);
    this.streams.set(stream.id, stream);

    return {
      stream,
      peerId: producer.peerId,
      peerName: producer.peerName,
      kind: producer.kind,
    };
  }

  getStreamByProducerId(producerId: string): MediaStream | undefined {
    return this.producerStreams.get(producerId);
  }

  close() {
    // Close all producers
    this.producers.forEach((p) => p.close());

    // Close all consumers
    this.consumers.forEach((c) => c.close());

    // Stop all streams
    this.streams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });

    // Close transports
    this.sendTransport?.close();
    this.recvTransport?.close();

    // Clear maps
    this.producers.clear();
    this.consumers.clear();
    this.streams.clear();
    this.producerStreams.clear();

    // Disconnect socket
    this.socket.disconnect();
  }
}
```

## 🔧 **Debugging Steps:**

### **1. Check Socket Connection**

```typescript
console.log("Socket connected:", this.socket.connected);
console.log("Socket ID:", this.socket.id);
```

### **2. Check Device Loading**

```typescript
console.log("Device loaded:", this.device.loaded);
console.log("Device RTP capabilities:", this.device.rtpCapabilities);
```

### **3. Check Transport Creation**

```typescript
console.log("Send transport:", this.sendTransport?.id);
console.log("Recv transport:", this.recvTransport?.id);
```

### **4. Check Producer Creation**

```typescript
console.log("Producers:", Array.from(this.producers.keys()));
console.log(
  "Producer details:",
  Array.from(this.producers.values()).map((p) => ({
    id: p.id,
    kind: p.kind,
    appData: p.appData,
  }))
);
```

### **5. Check Consumer Creation**

```typescript
console.log("Consumers:", Array.from(this.consumers.keys()));
console.log(
  "Consumer details:",
  Array.from(this.consumers.values()).map((c) => ({
    id: c.id,
    kind: c.kind,
    producerId: c.producerId,
  }))
);
```

### **6. Check Streams**

```typescript
console.log("Streams:", Array.from(this.streams.keys()));
console.log("Producer streams:", Array.from(this.producerStreams.keys()));
```

## 🎯 **Complete Fixed Client Code:**

```typescript
class SFUClient {
  public socket: Socket;
  private roomId: string;
  private device!: mediasoupClient.types.Device;
  private sendTransport?: mediasoupClient.types.Transport;
  private recvTransport?: mediasoupClient.types.Transport;
  private producers: Map<string, mediasoupClient.types.Producer> = new Map();
  private consumers: Map<string, mediasoupClient.types.Consumer> = new Map();
  private streams: Map<string, MediaStream> = new Map();
  private producerStreams: Map<string, MediaStream> = new Map();

  constructor(roomId: string) {
    this.roomId = roomId;
    this.socket = getSocket();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on(
      SOCKET_EVENTS.ROOM.NEW_PRODUCER,
      this.handleNewProducer.bind(this)
    );
    this.socket.on(
      SOCKET_EVENTS.ROOM.PRODUCER_CLOSED,
      this.handleProducerClosed.bind(this)
    );
  }

  private async handleNewProducer({ producer }: { producer: ProducerSummary }) {
    console.log("New producer detected:", producer);
    try {
      const result = await this.consume(producer);
      // Emit event to React component
      this.socket.emit("newRemoteStream", result);
    } catch (error) {
      console.error("Error consuming producer:", error);
    }
  }

  private handleProducerClosed({ producerId }: { producerId: string }) {
    console.log("Producer closed:", producerId);
    const stream = this.getStreamByProducerId(producerId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.producerStreams.delete(producerId);
      this.streams.delete(stream.id);
      // Emit event to React component
      this.socket.emit("remoteStreamClosed", { producerId });
    }
  }

  // ... rest of your existing methods
}
```

## 🚨 **Common Issues & Solutions:**

1. **"Device not loaded"** → Ensure `device.load()` is called with router capabilities
2. **"RTP capabilities not set"** → Call `SET_RTP_CAPABILITIES` before consuming
3. **"Transport not found"** → Create transports before producing/consuming
4. **"Producer not found"** → Check if producer exists in room state
5. **"Cannot consume"** → Verify RTP capabilities compatibility

The main issue is likely the event listener setup timing and the socket event constants mismatch. Fix these and your participants should be able to see each other's video and audio.
