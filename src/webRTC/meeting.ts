import { Server, Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { rooms, RoomState } from "./roomState";
import { createRouter } from "./media";

export default function registerMeeting(io: Server, socket: Socket) {
  // create meeting (router per meeting)
  socket.on("meeting:create", async ({ title }: { title: string }, cb) => {
    const meetingId = uuid();
    const router = await createRouter();

    const state: RoomState = {
      meetingId,
      router,
      peers: new Map(),
    };
    rooms.set(meetingId, state);
    cb({ meetingId, title, createdAt: Date.now() });
    io.emit("meeting:created", { meetingId, title });
  });

  // list active meetings
  socket.on("meeting:list", (cb) => {
    cb([...rooms.keys()].map((id) => ({ meetingId: id })));
  });

  // join meeting (peer registry only; transports handled in media.ts)
  socket.on(
    "meeting:join",
    ({ meetingId, peerId }: { meetingId: string; peerId: string }, cb) => {
      const room = rooms.get(meetingId);
      if (!room) return cb({ error: "Meeting not found" });
      if (!room.peers.has(peerId)) {
        room.peers.set(peerId, {
          peerId,
          socketId: socket.id,
          producers: new Map(),
          consumers: new Map(),
        });
      }
      socket.join(meetingId);
      // notify others
      socket.to(meetingId).emit("meeting:peer-joined", { peerId });
      cb({ ok: true, rtpCapabilities: room.router.rtpCapabilities });
    }
  );

  socket.on("disconnect", () => {
    // each media.ts cleans up on disconnect; nothing here
  });
}
