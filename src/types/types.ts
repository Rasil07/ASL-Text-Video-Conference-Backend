import { UserJwtPayload } from "../models/user";

export type TokenPayload = {
  user: UserJwtPayload;
};
