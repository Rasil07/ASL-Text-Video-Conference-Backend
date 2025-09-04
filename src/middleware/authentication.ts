import { NextFunction, Request, Response } from "express";
import JWT from "../helpers/jwt";

export const verifyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const decoded = new JWT().verifyToken(token);
  req.decoded = decoded;
  next();
};
