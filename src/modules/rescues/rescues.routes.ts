import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RescuesController } from "@/modules/rescues";
import {
  RescuesQuerySchema,
  RescuesIdShame,
  CreateRescuesShema,
  UpdateRescuesShema,
  deleteRescuesesSchema,
} from "./rescues.schema";
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

rescueRoute.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RescuesIdShame),
  RescuesController.getById
);

rescueRoute.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateRescuesShema),
  RescuesController.create
);

rescueRoute.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateRescuesShema),
  validateParams(RescuesIdShame),
  RescuesController.update
);

rescueRoute.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RescuesIdShame),
  RescuesController.delete
);

rescueRoute.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteRescuesesSchema),
  RescuesController.deleteMany
);

export { rescueRoute };
