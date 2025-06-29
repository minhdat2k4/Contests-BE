import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import {
  ClassVideoIdSchema,
  deleteClassVideosSchema,
  CreateClassVideoSchema,
} from "./classVideo.schema";
import { ClassVideoController } from "@/modules/classVideo";
import { authenticate, role } from "@/middlewares/auth";
import { createMulter } from "@/utils/multer";
const classVideoRouter = Router();
const uploads = createMulter("ClassVideo");

// private

classVideoRouter.get(
  "/contest/list-video/:slug",
  authenticate,
  role("Admin"),
  ClassVideoController.ClassVideosByContestSlug
);

classVideoRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  // validateBody(CreateClassVideoSchema),
  uploads.single("videos"),
  ClassVideoController.create
);

classVideoRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  ClassVideoController.getAlls
);

classVideoRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassVideoIdSchema),
  ClassVideoController.getById
);

classVideoRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassVideoIdSchema),
  uploads.single("videos"),
  ClassVideoController.update
);

classVideoRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassVideoIdSchema),
  ClassVideoController.delete
);

classVideoRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteClassVideosSchema),
  ClassVideoController.deletes
);

export { classVideoRouter };
