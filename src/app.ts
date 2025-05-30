import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler";
import { logger } from "@/utils/logger";
import { authRouter } from "@/modules/auth/auth.routes";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRouter);

// API documentation endpoint
app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Contest Backend API v1",
    version: "1.0.0",
    documentation: "/api/v1/docs", // TODO: Add API documentation
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      health: "/health",
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Contest Backend API",
    version: "1.0.0",
    api: "/api/v1",
    health: "/health",
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handling middleware - must be last
app.use(errorHandler);

export default app;
