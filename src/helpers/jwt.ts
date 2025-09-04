import jwt from "jsonwebtoken";
import { APP_CONFIG } from "../config";
import { TokenPayload } from "../types/types";

class JWT {
  generateToken(payload: TokenPayload) {
    return jwt.sign(payload, APP_CONFIG.jwtSecret, {
      expiresIn: APP_CONFIG.jwtExpiresIn,
    });
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, APP_CONFIG.jwtSecret);
  }
}

export default JWT;
