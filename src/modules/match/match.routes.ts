import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { MatchController } from "@/modules/match";
import {
  MatchIdShame,
  CreateMatchSchema,
  UpdateMatchInput,
  deleteMatchesSchema,
  MatchQuerySchema,
  UpdateMatchSchema,
} from "./match.schema";
import { authenticate, role } from "@/middlewares/auth";
const matchRouter = Router();
// prive

matchRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  MatchController.getListMatch
);

matchRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(MatchQuerySchema),
  MatchController.getAlls
);

matchRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MatchIdShame),
  MatchController.getById
);

matchRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateMatchSchema),
  MatchController.create
);

matchRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateMatchSchema),
  validateParams(MatchIdShame),
  MatchController.update
);

matchRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  MatchController.toggleActive
);
matchRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MatchIdShame),
  MatchController.delete
);

matchRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteMatchesSchema),
  MatchController.deletes
);

export { matchRouter };
