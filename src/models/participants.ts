import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RoomRole = "host" | "participant" | "guest";

export interface IParticipant extends Document {
  room: Types.ObjectId; // Room
  user?: Types.ObjectId; // User (optional for guests)
  guestName?: string;

  role: RoomRole;
  peerId: string; // mediasoup/web client peer id
  socketId?: string; // current socket instance id

  joinedAt: Date;
  leftAt?: Date;

  device?: {
    platform?: string;
    browser?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    guestName: { type: String },

    role: {
      type: String,
      enum: ["host", "participant", "guest"],
      default: "participant",
    },

    peerId: { type: String, required: true, index: true },
    socketId: { type: String },

    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },

    device: {
      platform: { type: String },
      browser: { type: String },
    },
  },
  { timestamps: true }
);

// // one participant record per meeting+user (or meeting+peer for guests)
// ParticipantSchema.index(
//   { meeting: 1, user: 1 },
//   { unique: true, partialFilterExpression: { user: { $exists: true } } }
// );
// ParticipantSchema.index({ meeting: 1, peerId: 1 }, { unique: true });

export const Participant: Model<IParticipant> =
  mongoose.models.Participant ||
  mongoose.model<IParticipant>("Participant", ParticipantSchema);
