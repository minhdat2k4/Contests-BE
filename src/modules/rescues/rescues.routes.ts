import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RescuesController } from "@/modules/rescues";
import { RescuesQuerySchema } from "./rescues.schema";
import { authenticate, role } from "@/middlewares/auth";
const rescueRoute = Router();
// // prive

rescueRoute.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(RescuesQuerySchema),
  RescuesController.getAlls
);

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

export { rescueRoute };
