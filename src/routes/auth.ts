import { Router, Request, Response } from "express";
import { verifyRequest } from "../middleware/authentication";
import AuthController from "../controller/auth.controller";

const router = Router();

router.get("/", verifyRequest, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Auth endpoint - Coming soon",
  });
});

router.post("/login", (req: Request, res: Response) =>
  AuthController.login(req, res)
);

router.post("/register", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Register endpoint - Coming soon",
  });
});

export default router;
