import { Router, WebRtcTransport, Producer, Consumer } from "./types";

export type PeerId = string;
export type MeetingId = string;

export interface Peer {
  peerId: PeerId;
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  joinedAt: Date;
  sendTransport?: WebRtcTransport;
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
  peers: Map<PeerId, Peer>;
  status: "ongoing" | "ended" | "cancelled";
  hostName: string;
  hostEmail: string;
}

export const rooms = new Map<MeetingId, RoomState>();
