import { Router, WebRtcTransport, Producer, Consumer } from "./types";

export type PeerId = string;
export type MeetingId = string;

export interface Peer {
  peerId: PeerId;
  socketId: string;
  sendTransport?: WebRtcTransport;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>; // kind-keyed or track-id keyed
  consumers: Map<string, Consumer>; // producerId -> consumer
}

export interface RoomState {
  meetingId: MeetingId;
  router: Router;
  peers: Map<PeerId, Peer>;
}

export const rooms = new Map<MeetingId, RoomState>();
