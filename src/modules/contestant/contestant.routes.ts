import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ContestantController } from "@/modules/contestant";
import {
  ContestantIdShame,
  deleteContestantesSchema,
  CreateContestantSchema,
  UpdateContestantSchema,
  CreatesContestShema,
  ContestantMatchParamsSchema,
  ContestantDetailParamsSchema,
  GetContestantsInMatchQuerySchema,
} from "./contestant.schema";
import { authenticate, role } from "@/middlewares/auth";
const contestantRouter = Router();
// prive

contestantRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  ContestantController.getAlls
);

// lấy tất cả thí sinh trong cuộc thi với nhóm
contestantRouter.get(
  "/contest/:slug/with-groups",
  authenticate,
  role("Admin"),
  ContestantController.getAllWithGroups
);

contestantRouter.get(
  "/not-contest/:slug",
  authenticate,
  role("Admin"),
  ContestantController.getAllNotConstest
);

contestantRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestantIdShame),
  ContestantController.getById
);

// lấy thí sinh trong trận đấu
contestantRouter.get(
  "/:id/match/:matchId",
  authenticate,
  role("Admin"),
  validateParams(ContestantMatchParamsSchema),
  ContestantController.getByIdAndMatch
);

contestantRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  validateBody(CreateContestantSchema),
  ContestantController.create
);

contestantRouter.post(
  "/bulk/contest/:slug",
  authenticate,
  role("Admin"),
  validateBody(CreatesContestShema),
  ContestantController.creates
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

// lấy thông tin thí sinh với nhóm trong trận đấu hiện tại
contestantRouter.get(
  "/:id/contest/:slug/match/:matchId/with-groups",
  authenticate,
  role("Admin"),
  validateParams(ContestantDetailParamsSchema),
  ContestantController.getDetailWithGroups
);

// lấy danh sách thí sinh trong trận đấu theo slug cuộc thi và id trận đấu
contestantRouter.get(
  "/contest/:slug/match/:matchId/contestants",
  authenticate,
  role("Admin"),
  validateQuery(GetContestantsInMatchQuerySchema),
  ContestantController.getContestantsInMatch
);

export { contestantRouter };
