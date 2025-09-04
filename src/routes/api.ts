import { Router, Request, Response } from "express";
import authRouter from "./auth";
import { healthRouter } from "./health";
const router = Router();

// API Info endpoint
router.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "ASL Text Video Conference API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      rooms: "/api/rooms",
      users: "/api/users",
      sessions: "/api/sessions",
    },
  });
});

// Rooms endpoint
router.get("/rooms", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Rooms endpoint - Coming soon",
    data: [],
  });
});

// Users endpoint
router.get("/users", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Users endpoint - Coming soon",
    data: [],
  });
});

// Sessions endpoint
router.get("/sessions", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Sessions endpoint - Coming soon",
    data: [],
  });
});

router.get("/list-users", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "List users endpoint - Coming soon",
    data: [
      {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });
});

router.use("/auth", authRouter);
router.use("/health", healthRouter);

export { router as apiRouter };
