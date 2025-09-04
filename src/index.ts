import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { healthRouter } from "./routes/health";
import { apiRouter } from "./routes/api";
import connectDB from "./database/connectDB";
import { APP_CONFIG } from "./config";

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
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("combined")); // Logging
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation available at http://localhost:${PORT}/api`);
});

export default app;
