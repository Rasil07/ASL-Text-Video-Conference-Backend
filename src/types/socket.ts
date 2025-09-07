import { Socket } from "socket.io";
import { UserJwtPayload } from "../models/user";

// Extend Socket interface to include user data
declare module "socket.io" {
  interface Socket {
    decoded?: {
      user: UserJwtPayload;
    };
  }
}

export {};
