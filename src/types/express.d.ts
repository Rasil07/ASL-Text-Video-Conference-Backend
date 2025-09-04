import { UserJwtPayload } from "../models/user";

// Make this file a module
export {};

declare global {
  namespace Express {
    interface Request {
      token: string;
      decoded?: {
        user: UserJwtPayload;
      };
    }
  }
}
