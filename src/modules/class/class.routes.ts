import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ClassController } from "@/modules/class";
import { ClassQuerySchema, ClassIdParams, ClassIdShame } from "./class.schema";
import { authenticate, role } from "@/middlewares/auth";
const classRouter = Router();
// prive

classRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(ClassQuerySchema),
  ClassController.getAlls
);

classRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassIdShame),
  ClassController.getClassById
);

// classRouter.post(
//   "/",
//   authenticate,
//   role("Admin"),
//   validateBody(CreateclassSchema),
//   classController.createclass
// );

// classRouter.patch(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateBody(UpdeateclassShema),
//   classController.updateShool
// );
// classRouter.patch(
//   "/:id/toggle-active",
//   authenticate,
//   role("Admin"),
//   classController.toggleActive
// );
// classRouter.delete(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   classController.deleteclass
// );
export { classRouter };
