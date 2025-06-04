import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/utils/logger";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log chi tiết lỗi Zod
        logger.warn({
          error: "Validation error",
          details: error.errors,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          service: "contest-be",
          timestamp: new Date().toISOString(),
        });
        // Trả về lỗi chi tiết cho FE
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};
