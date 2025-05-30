import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { validationErrorResponse } from "@/utils/response";

export interface ValidationOptions {
  skipUnknown?: boolean;
  allowUnknown?: boolean;
}

/**
 * Validate request body
 */
export const validateData = (field: string, message: string) => {
  return {
    success: false,
    message: "Validation failed",
    error: {
      type: "VALIDATION_ERROR",
      details: [
        {
          field: field,
          message: message,
        },
      ],
    },
    timestamp: new Date().toISOString(),
  };
};

export const validateBody = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.safeParse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request query parameters
 */
export const validateQuery = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request parameters
 */
export const validateParams = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request headers
 */
export const validateHeaders = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.headers = schema.parse(req.headers);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};
