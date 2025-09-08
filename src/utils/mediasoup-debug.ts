// ============================================================================
// MEDIASOUP PIPELINE DEBUG UTILITIES
// ============================================================================
// This file provides comprehensive debugging utilities for the MediaSoup pipeline

import { rooms, RoomState, Peer } from "../webRTC/roomState";
import { RtpCapabilities } from "../webRTC/types";

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export class MediaSoupDebugger {
  /**
   * Log comprehensive room state information
   */
  static logRoomState(roomCode: string): void {
    const room = rooms.get(roomCode);
    if (!room) {
      console.log(`❌ Room not found: ${roomCode}`);
      return;
    }

    console.log(`\n🏠 === ROOM STATE: ${roomCode} ===`);
    console.log(`📊 Basic Info:`, {
      title: room.title,
      description: room.description,
      status: room.status,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      hostName: room.hostName,
      hostEmail: room.hostEmail,
    });

    console.log(`🔧 Router Info:`, {
      hasRouter: !!room.router,
      rtpCapabilities: !!room.router?.rtpCapabilities,
      codecCount: room.router?.rtpCapabilities?.codecs?.length || 0,
      headerExtensionCount:
        room.router?.rtpCapabilities?.headerExtensions?.length || 0,
    });

    console.log(`👥 Participants (${room.peers.size}):`);
    room.peers.forEach((peer, userId) => {
      this.logPeerState(peer, userId);
    });
    console.log(`🏠 === END ROOM STATE ===\n`);
  }

  /**
   * Log detailed peer information
   */
  static logPeerState(peer: Peer, userId: string): void {
    console.log(`  👤 Peer: ${userId}`, {
      userName: peer.userName,
      userEmail: peer.userEmail,
      socketId: peer.socketId,
      isHost: peer.isHost,
      isMuted: peer.isMuted,
      isVideoEnabled: peer.isVideoEnabled,
      joinedAt: peer.joinedAt,
      hasRtpCapabilities: !!peer.rtpCapabilities,
      transportCount: peer.transports.size,
      producerCount: peer.producers.size,
      consumerCount: peer.consumers.size,
    });

    if (peer.rtpCapabilities) {
      console.log(`    🎯 RTP Capabilities:`, {
        codecCount: peer.rtpCapabilities.codecs?.length || 0,
        headerExtensionCount:
          peer.rtpCapabilities.headerExtensions?.length || 0,
        codecs:
          peer.rtpCapabilities.codecs?.map((c) => `${c.kind}/${c.mimeType}`) ||
          [],
      });
    }

    if (peer.transports.size > 0) {
      console.log(`    🚌 Transports (${peer.transports.size}):`);
      peer.transports.forEach((transport, transportId) => {
        console.log(`      - ${transportId}: ${transport.constructor.name}`);
      });
    }

    if (peer.producers.size > 0) {
      console.log(`    🎥 Producers (${peer.producers.size}):`);
      peer.producers.forEach((producer, producerId) => {
        console.log(
          `      - ${producerId}: ${producer.kind} (${producer.type})`
        );
      });
    }

    if (peer.consumers.size > 0) {
      console.log(`    🎧 Consumers (${peer.consumers.size}):`);
      peer.consumers.forEach((consumer, consumerId) => {
        console.log(
          `      - ${consumerId}: ${consumer.kind} (producer: ${consumer.producerId})`
        );
      });
    }
  }

  /**
   * Log all active rooms
   */
  static logAllRooms(): void {
    console.log(`\n🌍 === ALL ACTIVE ROOMS (${rooms.size}) ===`);
    rooms.forEach((room, roomCode) => {
      this.logRoomState(roomCode);
    });
    console.log(`🌍 === END ALL ROOMS ===\n`);
  }

  /**
   * Validate room integrity
   */
  static validateRoomIntegrity(roomCode: string): boolean {
    const room = rooms.get(roomCode);
    if (!room) {
      console.error(`❌ Room validation failed: Room ${roomCode} not found`);
      return false;
    }

    let isValid = true;

    // Check router
    if (!room.router) {
      console.error(
        `❌ Room validation failed: No router for room ${roomCode}`
      );
      isValid = false;
    }

    // Check each peer
    room.peers.forEach((peer, userId) => {
      if (!peer.rtpCapabilities) {
        console.warn(`⚠️ Peer ${userId} has no RTP capabilities`);
      }

      // Check for orphaned transports
      peer.transports.forEach((transport, transportId) => {
        if (!transport) {
          console.error(`❌ Orphaned transport reference: ${transportId}`);
          isValid = false;
        }
      });

      // Check for orphaned producers
      peer.producers.forEach((producer, producerId) => {
        if (!producer) {
          console.error(`❌ Orphaned producer reference: ${producerId}`);
          isValid = false;
        }
      });

      // Check for orphaned consumers
      peer.consumers.forEach((consumer, consumerId) => {
        if (!consumer) {
          console.error(`❌ Orphaned consumer reference: ${consumerId}`);
          isValid = false;
        }
      });
    });

    if (isValid) {
      console.log(`✅ Room ${roomCode} validation passed`);
    }

    return isValid;
  }

  /**
   * Log MediaSoup pipeline flow for debugging
   */
  static logPipelineFlow(
    roomCode: string,
    userId: string,
    action: string,
    details?: any
  ): void {
    const room = rooms.get(roomCode);
    const peer = room?.peers.get(userId);

    console.log(`\n🔄 === PIPELINE FLOW ===`);
    console.log(`📍 Action: ${action}`);
    console.log(`🏠 Room: ${roomCode}`);
    console.log(`👤 User: ${userId}`);
    console.log(`📊 Room State:`, {
      hasRoom: !!room,
      hasPeer: !!peer,
      peerCount: room?.peers.size || 0,
      hasRouter: !!room?.router,
    });

    if (peer) {
      console.log(`👤 Peer State:`, {
        hasRtpCapabilities: !!peer.rtpCapabilities,
        transportCount: peer.transports.size,
        producerCount: peer.producers.size,
        consumerCount: peer.consumers.size,
      });
    }

    if (details) {
      console.log(`📋 Details:`, details);
    }
    console.log(`🔄 === END PIPELINE FLOW ===\n`);
  }

  /**
   * Log RTP capabilities comparison
   */
  static logRtpCapabilitiesComparison(roomCode: string, userId: string): void {
    const room = rooms.get(roomCode);
    const peer = room?.peers.get(userId);

    if (!room || !peer) {
      console.error(
        `❌ Cannot compare RTP capabilities: Room or peer not found`
      );
      return;
    }

    console.log(`\n🎯 === RTP CAPABILITIES COMPARISON ===`);
    console.log(`🏠 Room: ${roomCode}`);
    console.log(`👤 User: ${userId}`);

    console.log(`🔧 Router RTP Capabilities:`, {
      hasCapabilities: !!room.router?.rtpCapabilities,
      codecCount: room.router?.rtpCapabilities?.codecs?.length || 0,
      headerExtensionCount:
        room.router?.rtpCapabilities?.headerExtensions?.length || 0,
      codecs:
        room.router?.rtpCapabilities?.codecs?.map(
          (c) => `${c.kind}/${c.mimeType}`
        ) || [],
    });

    console.log(`👤 Peer RTP Capabilities:`, {
      hasCapabilities: !!peer.rtpCapabilities,
      codecCount: peer.rtpCapabilities?.codecs?.length || 0,
      headerExtensionCount: peer.rtpCapabilities?.headerExtensions?.length || 0,
      codecs:
        peer.rtpCapabilities?.codecs?.map((c) => `${c.kind}/${c.mimeType}`) ||
        [],
    });

    console.log(`🎯 === END RTP CAPABILITIES COMPARISON ===\n`);
  }

  /**
   * Log transport connection status
   */
  static logTransportStatus(roomCode: string, userId: string): void {
    const room = rooms.get(roomCode);
    const peer = room?.peers.get(userId);

    if (!room || !peer) {
      console.error(`❌ Cannot log transport status: Room or peer not found`);
      return;
    }

    console.log(`\n🚌 === TRANSPORT STATUS ===`);
    console.log(`🏠 Room: ${roomCode}`);
    console.log(`👤 User: ${userId}`);

    if (peer.transports.size === 0) {
      console.log(`⚠️ No transports found for peer`);
    } else {
      peer.transports.forEach((transport, transportId) => {
        console.log(`🚌 Transport ${transportId}:`, {
          type: transport.constructor.name,
          connectionState: transport.connectionState,
          hasDtlsParameters: !!transport.dtlsParameters,
          hasIceParameters: !!transport.iceParameters,
          hasIceCandidates: !!transport.iceCandidates,
        });
      });
    }

    console.log(`🚌 === END TRANSPORT STATUS ===\n`);
  }

  /**
   * Log producer/consumer relationships
   */
  static logMediaFlow(roomCode: string): void {
    const room = rooms.get(roomCode);
    if (!room) {
      console.error(`❌ Cannot log media flow: Room ${roomCode} not found`);
      return;
    }

    console.log(`\n🎬 === MEDIA FLOW: ${roomCode} ===`);

    // Collect all producers
    const allProducers: Array<{
      producerId: string;
      kind: string;
      userId: string;
    }> = [];
    room.peers.forEach((peer, userId) => {
      peer.producers.forEach((producer, producerId) => {
        allProducers.push({ producerId, kind: producer.kind, userId });
      });
    });

    console.log(`🎥 Producers (${allProducers.length}):`);
    allProducers.forEach((p) => {
      console.log(`  - ${p.producerId}: ${p.kind} (from ${p.userId})`);
    });

    // Collect all consumers
    const allConsumers: Array<{
      consumerId: string;
      kind: string;
      userId: string;
      producerId: string;
    }> = [];
    room.peers.forEach((peer, userId) => {
      peer.consumers.forEach((consumer, consumerId) => {
        allConsumers.push({
          consumerId,
          kind: consumer.kind,
          userId,
          producerId: consumer.producerId,
        });
      });
    });

    console.log(`🎧 Consumers (${allConsumers.length}):`);
    allConsumers.forEach((c) => {
      console.log(
        `  - ${c.consumerId}: ${c.kind} (${c.userId} consuming ${c.producerId})`
      );
    });

    console.log(`🎬 === END MEDIA FLOW ===\n`);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const debugRoom = (roomCode: string) =>
  MediaSoupDebugger.logRoomState(roomCode);
export const debugAllRooms = () => MediaSoupDebugger.logAllRooms();
export const debugPeer = (roomCode: string, userId: string) => {
  const room = rooms.get(roomCode);
  const peer = room?.peers.get(userId);
  if (peer) {
    MediaSoupDebugger.logPeerState(peer, userId);
  }
};
export const debugPipeline = (
  roomCode: string,
  userId: string,
  action: string,
  details?: any
) => MediaSoupDebugger.logPipelineFlow(roomCode, userId, action, details);
export const debugRtpCapabilities = (roomCode: string, userId: string) =>
  MediaSoupDebugger.logRtpCapabilitiesComparison(roomCode, userId, userId);
export const debugTransports = (roomCode: string, userId: string) =>
  MediaSoupDebugger.logTransportStatus(roomCode, userId);
export const debugMediaFlow = (roomCode: string) =>
  MediaSoupDebugger.logMediaFlow(roomCode);
export const validateRoom = (roomCode: string) =>
  MediaSoupDebugger.validateRoomIntegrity(roomCode);
