import { Schema, model, Document, Types } from "mongoose";
import encrypt from "mongoose-encryption";

const roomSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// export const Room = model<RoomDocument>("Room", roomSchema);
