import { Schema, model, Document, Types } from "mongoose";
import encrypt from "mongoose-encryption";
import { APP_CONFIG } from "../config";

const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const encKey = APP_CONFIG.db_32_string as string;
const sigKey = APP_CONFIG.db_64_string as string;

schema.plugin(encrypt, {
  encryptionKey: encKey,
  signingKey: sigKey,
  encryptedFields: ["password"],
  decryptPostSave: false,
  collection: "users",
});

export interface UserEntity {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export type UserJwtPayload = {
  id: string;
  email: string;
  name: string;
};

export interface UserDocument extends Document, UserEntity {
  _id: Types.ObjectId;
}

export const User = model<UserDocument>("User", schema);
