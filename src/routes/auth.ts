import { Router, Request, Response } from "express";
import { verifyRequest } from "../middleware/authentication";
import AuthController from "../controller/auth.controller";

const router = Router();

router.post("/verify-token", verifyRequest, (req: Request, res: Response) => {
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.json({
    success: true,
    message: "Token verified",
  });
});

router.post("/login", (req: Request, res: Response) =>
  AuthController.login(req, res)
);

router.post("/register", (req: Request, res: Response) =>
  AuthController.register(req, res)
);

export default router;
