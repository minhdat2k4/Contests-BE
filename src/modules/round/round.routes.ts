import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RoundController } from "@/modules/round";
import {
  RoundQuerySchema,
  RoundIdShame,
  CreateRoundShema,
} from "./round.schema";
import { authenticate, role } from "@/middlewares/auth";
const roundRouter = Router();
// prive

roundRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(RoundQuerySchema),
  RoundController.getAlls
);

roundRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RoundIdShame),
  RoundController.getRoundById
);

roundRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateRoundShema),
  RoundController.createRound
);

// classRouter.patch(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateBody(UpdeateClasshema),
//   validateParams(ClassIdShame),
//   ClassController.updateClass
// );

// classRouter.patch(
//   "/:id/toggle-active",
//   authenticate,
//   role("Admin"),
//   ClassController.toggleActive
// );
// classRouter.delete(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateParams(ClassIdShame),
//   ClassController.deleteClass
// );

// classRouter.post(
//   "/delete-many",
//   authenticate,
//   role("Admin"),
//   validateBody(deleteClassesSchema),
//   ClassController.deleteClasses
// );

export { roundRouter };
