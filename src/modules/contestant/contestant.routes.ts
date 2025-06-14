import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ContestantController } from "@/modules/contestant";
import {
  ContestantIdShame,
  ContestantQuerySchema,
  deleteContestantesSchema,
  CreateContestantSchema,
  UpdateContestantSchema,
} from "./contestant.schema";
import { authenticate, role } from "@/middlewares/auth";
const contestantRouter = Router();
// prive

contestantRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  validateQuery(ContestantQuerySchema),
  ContestantController.getAlls
);

contestantRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestantIdShame),
  ContestantController.getById
);

contestantRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  validateBody(CreateContestantSchema),
  ContestantController.create
);

contestantRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateContestantSchema),
  validateParams(ContestantIdShame),
  ContestantController.update
);

contestantRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestantIdShame),
  ContestantController.delete
);

contestantRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteContestantesSchema),
  ContestantController.deletes
);

export { contestantRouter };
