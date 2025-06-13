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
import { uploadAboutImages } from "@/middlewares/multer/aboutMulter";
import { handleUploadError } from "@/middlewares/multer/uploadErrorHandler";

const aboutRouter = Router();

// Apply authentication middleware to all routes
aboutRouter.use(authenticate);

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
  // authenticate,
  validateParams(AboutIdSchema),
  (req, res, next) => {
    uploadAboutImages(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  },
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