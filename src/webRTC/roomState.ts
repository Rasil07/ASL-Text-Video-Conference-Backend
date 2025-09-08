import {
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
} from "./types";

export type MeetingId = string;

export interface Peer {
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  joinedAt: Date;
  rtpCapabilities?: RtpCapabilities;
  transports: Map<string, WebRtcTransport>;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>; // kind-keyed or track-id keyed
  consumers: Map<string, Consumer>; // producerId -> consumer
}

export interface RoomState {
  code: MeetingId;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  router: Router;
  peers: Map<string, Peer>;
  status: "ongoing" | "ended" | "cancelled";
  hostName: string;
  hostEmail: string;
}

export const rooms = new Map<MeetingId, RoomState>();

export const getPeer = (roomId: string, userId: string): Peer | undefined => {
  const room = rooms.get(roomId);
  if (!room) {
    return undefined;
  }
  return room.peers.get(userId);
};
