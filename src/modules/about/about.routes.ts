import { Router } from "express";
import AboutController from "./about.controller";
import { validateBody, validateQuery, validateParams } from "@/utils/validation";
import { 
  CreateAboutSchema, 
  UpdateAboutSchema, 
  AboutQuerySchema, 
  AboutIdSchema 
} from "./about.schema";
import { authenticate } from "@/middlewares/auth";

const aboutRouter = Router();

// Create new about information
aboutRouter.post(
  "/",
  authenticate,
  validateBody(CreateAboutSchema),
  AboutController.createAbout
);

// Get all about information with pagination
aboutRouter.get(
  "/",
  validateQuery(AboutQuerySchema),
  AboutController.getAllAbout
);

// Get about information by ID
aboutRouter.get(
  "/:id",
  validateParams(AboutIdSchema),
  AboutController.getAboutById
);

// Update about information
aboutRouter.put(
  "/:id",
  authenticate,
  validateParams(AboutIdSchema),
  validateBody(UpdateAboutSchema),
  AboutController.updateAbout
);

// Delete about information (soft delete)
aboutRouter.delete(
  "/:id",
  authenticate,
  validateParams(AboutIdSchema),
  AboutController.deleteAbout
);

// Restore deleted about information
aboutRouter.patch(
  "/:id/restore",
  authenticate,
  validateParams(AboutIdSchema),
  AboutController.restoreAbout
);

// Permanently delete about information
aboutRouter.delete(
  "/:id/permanent",
  authenticate,
  validateParams(AboutIdSchema),
  AboutController.permanentDeleteAbout
);

export { aboutRouter };