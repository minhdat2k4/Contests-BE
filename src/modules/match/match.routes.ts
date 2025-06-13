import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { MatchController } from "@/modules/match";

import { authenticate, role } from "@/middlewares/auth";
const matchRouter = Router();
// prive

matchRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  MatchController.getListMatch
);

// roundRouter.get(
//   "/",
//   authenticate,
//   role("Admin"),
//   validateQuery(RoundQuerySchema),
//   RoundController.getAlls
// );

// roundRouter.get(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateParams(RoundIdShame),
//   RoundController.getRoundById
// );

// roundRouter.post(
//   "/",
//   authenticate,
//   role("Admin"),
//   validateBody(CreateRoundShema),
//   RoundController.createRound
// );

// roundRouter.patch(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateBody(UpdeateRoundhema),
//   validateParams(RoundIdShame),
//   RoundController.updateRound
// );

// roundRouter.patch(
//   "/:id/toggle-active",
//   authenticate,
//   role("Admin"),
//   RoundController.toggleActive
// );
// roundRouter.delete(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateParams(RoundIdShame),
//   RoundController.deleteRound
// );

// roundRouter.post(
//   "/delete-many",
//   authenticate,
//   role("Admin"),
//   validateBody(deleteRoundesSchema),
//   RoundController.deleteRounds
// );

export { matchRouter };
