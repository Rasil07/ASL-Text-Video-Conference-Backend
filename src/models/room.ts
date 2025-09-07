import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RoomStatus = "scheduled" | "ongoing" | "ended" | "cancelled";

export interface IRoom extends Document {
  title: string;
  description?: string;
  host: Types.ObjectId; // User
  code: string; // human-friendly join code/slug
  status: RoomStatus;
  startedAt?: Date;
  endedAt?: Date;

  options: {
    allowGuests: boolean;
    maxParticipants: number;
    recordingEnabled: boolean;
    asl: {
      captionsEnabled: boolean;
      ttsEnabled: boolean;
      captionLanguage: string;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: { type: String, required: true, unique: true, index: true }, // e.g., 6-8 char slug
    status: {
      type: String,
      enum: ["ongoing", "ended", "cancelled"],
      default: "ongoing",
      index: true,
    },

    startedAt: { type: Date },
    endedAt: { type: Date },

    options: {
      //   allowGuests: { type: Boolean, default: true },
      maxParticipants: { type: Number, default: 20, min: 1 },
      //   recordingEnabled: { type: Boolean, default: false },
      //   asl: {
      //     captionsEnabled: { type: Boolean, default: true },
      //     ttsEnabled: { type: Boolean, default: false },
      //     captionLanguage: { type: String, default: "en" },
      //   },
    },
  },
  { timestamps: true }
);

RoomSchema.index({ host: 1, status: 1, createdAt: -1 });

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);
