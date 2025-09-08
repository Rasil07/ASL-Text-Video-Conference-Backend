import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

import { apiRouter } from "./routes/api";
import connectDB from "./database/connectDB";
import { APP_CONFIG } from "./config";
import http from "http";
import { Server } from "socket.io";

import registerRoomHandlers from "./webRTC/roomHandler";
import { registerMediaHandlers } from "./webRTC/media";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB(APP_CONFIG.dbUrl)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err);
  });

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      process.env.CORS_ORIGIN || "http://localhost:3000",
      "https://truly-huge-viper.ngrok-free.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-ngrok-skip-browser-warning",
    ],
  })
);
app.use(morgan("combined")); // Logging

// Handle ngrok browser warning
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes

app.use("/api", apiRouter);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "ASL Text Video Conference Backend API",
    version: "1.0.0",
    status: "running",
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Create socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  path: "/ws",
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      process.env.CORS_ORIGIN || "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

app.set("io", io);

import jwt from "jsonwebtoken";

io.use((socket, next) => {
  // Expect JWT in query param or in auth header
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1] ||
    socket.handshake.query?.token;

  console.log("token", token);

  if (!token) {
    // No token present, set user as null and continue

    socket.decoded = null;
    return next();
  }

  try {
    // Replace 'your_jwt_secret' with your actual secret or use env variable
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    console.log("decoded", decoded);
    // Attach user info to socket for later use

    socket.decoded = decoded;
    next();
  } catch (err) {
    // Invalid token, set user as null and continue
    socket.decoded = null;
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.decoded?.user?.id || "anonymous"}`);
  // registerMeeting(io, socket);
  registerRoomHandlers(io, socket);
  registerMediaHandlers(io, socket);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation available at http://localhost:${PORT}/api`);
});

export default app;
