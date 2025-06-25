import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { logger } from "./utils/logger";
import { authRouter } from "./modules/auth/auth.routes";
import { aboutRouter } from "./modules/about/about.routes";
import { userRouter } from "@/modules/user";
import { schoolRouter } from "@/modules/school";
import { studentRouter } from "@/modules/student";
import { roundRouter } from "@/modules/round"; // Temporarily commented out
import { classRouter } from "@/modules/class";
import { questionTopicRoutes } from "@/modules/questionTopic";
import { questionPackageRouter } from "@/modules/questionPackage";
import { questionDetailRouter } from "@/modules/questionDetail";
import questionRoutes from "@/modules/question/question.routes";
import { rescueRoute } from "@/modules/rescues";
import { contestRoute } from "@/modules/contest";
import { matchRouter } from "@/modules/match";
import { screenRouter } from "@/modules/screen";

import { enumRouter } from "@/modules/enum";
import { awardRoutes } from "@/modules/award";
import { groupRouter } from "@/modules/group";
import { contestantRouter } from "@/modules/contestant";
import { groupDivisionRoutes } from "@/modules/groupDivision";

import { mediaRouter } from "@/modules/media";
import { resultRouter } from "@/modules/result";
import { sponsorRouter } from "@/modules/sponsor";
import { classVideoRouter } from "@/modules/classVideo";

import path from "path";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cookieParser());

// CORS configuration - must be before static files
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Static file serving với explicit CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for static files
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
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

// Static files serving for uploads
app.use("/uploads", express.static("uploads"));

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
app.use("/api/about", aboutRouter);
app.use("/api/user", userRouter);
app.use("/api/school", schoolRouter);
app.use("/api/class", classRouter);
app.use("/api/round", roundRouter);
app.use("/api/student", studentRouter);
app.use("/api/question-topics", questionTopicRoutes);
app.use("/api/question-packages", questionPackageRouter);
app.use("/api/question-details", questionDetailRouter);
app.use("/api/contest", contestRoute);
app.use("/api/rescue", rescueRoute);
app.use("/api/enums", enumRouter);
app.use("/api/awards", awardRoutes);
app.use("/api/match", matchRouter);
app.use("/api/media", mediaRouter);
app.use("/api/group", groupRouter);
app.use("/api/screen", screenRouter);
app.use("/api/class-video", classVideoRouter);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRouter);
app.use("/api/sponsors", sponsorRouter);
app.use("/api/contestant", contestantRouter);
app.use("/api/group-divisions", groupDivisionRoutes);
app.use("/api/group-division", groupDivisionRoutes);

// API documentation endpoint
app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Contest Backend API v1",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      about: "/api/about",
      users: "/api/users",
      "question-topics": "/api/question-topics",
      "question-packages": "/api/question-packages",
      "question-details": "/api/question-details",
      enums: "/api/enums",
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
