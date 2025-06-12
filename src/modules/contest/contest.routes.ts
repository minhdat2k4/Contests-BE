import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ContestController } from "@/modules/contest";
import {
  ContestsQuerySchema,
  ContestsIdShame,
  deleteContestsesSchema,
} from "./contest.schema";
import { authenticate, role } from "@/middlewares/auth";
const contestRoute = Router();
// // // prive

contestRoute.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(ContestsQuerySchema),
  ContestController.getAlls
);

contestRoute.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestsIdShame),
  ContestController.getById
);

// contestRoute.post(
//   "/",
//   authenticate,
//   role("Admin"),
//   validateBody(CreateContestShema),
//   ContestController.create
// );

// contestRoute.patch(
//   "/:id",
//   authenticate,
//   role("Admin"),
//   validateBody(UpdateContestShema),
//   validateParams(ContestIdShame),
//   ContestController.update
// );

contestRoute.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestsIdShame),
  ContestController.delete
);

contestRoute.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteContestsesSchema),
  ContestController.deleteMany
);

export { contestRoute };
