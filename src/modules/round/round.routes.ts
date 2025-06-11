import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RoundController } from "@/modules/round";
import { RoundQuerySchema } from "./round.schema";
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

// classRouter.get(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateParams(ClassIdShame),
//   ClassController.getClassById
// );

// classRouter.post(
//   "/",
//   authenticate,
//   role("Admin"),
//   validateBody(CreateClassShema),
//   ClassController.createClass
// );

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
