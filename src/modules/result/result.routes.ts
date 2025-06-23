import { Router } from "express";
import { ResultController } from "./result.controller";
import { authenticate, role } from "@/middlewares/auth";
import { validateBody, validateParams, validateQuery } from "@/utils/validation";
import {
  createResultSchema,
  updateResultSchema,
  getResultByIdSchema,
  getResultsByContestantSchema,
  getResultsByMatchSchema,
  deleteResultSchema,
  getResultsQuerySchema,
  batchDeleteResultsSchema,
  getResultsByContestSlugSchema,
  getResultsByContestSlugQuerySchema
} from "./result.schema";

const router = Router();
const resultController = new ResultController();

/**
 * @route GET /api/results
 * @desc Get results with pagination and filtering
 * @access Private (Admin/Judge)
 */
router.get(
  "/",
  authenticate,
  role("Admin", "Judge"),
  validateQuery(getResultsQuerySchema),
  resultController.getResults.bind(resultController)
);

/**
 * @route POST /api/results
 * @desc Create new result
 * @access Private (Admin/Judge)
 */
router.post(
  "/",
  authenticate,
  role("Admin", "Judge"),
  validateBody(createResultSchema),
  resultController.createResult.bind(resultController)
);

/**
 * @route DELETE /api/results/batch
 * @desc Batch delete results (hard delete)
 * @access Private (Admin only)
 */
router.delete(
  "/batch",
  authenticate,
  role("Admin"),
  validateBody(batchDeleteResultsSchema),
  resultController.batchDeleteResults.bind(resultController)
);

/**
 * @route GET /api/results/contestant/:contestantId/statistics
 * @desc Get statistics for a contestant
 * @access Private (Admin/Judge)
 */
router.get(
  "/contestant/:contestantId/statistics",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultsByContestantSchema),
  resultController.getContestantStatistics.bind(resultController)
);

/**
 * @route GET /api/results/contestant/:contestantId
 * @desc Get results by contestant ID
 * @access Private (Admin/Judge)
 */
router.get(
  "/contestant/:contestantId",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultsByContestantSchema),
  resultController.getResultsByContestant.bind(resultController)
);

/**
 * @route GET /api/results/match/:matchId
 * @desc Get results by match ID
 * @access Private (Admin/Judge)
 */
router.get(
  "/match/:matchId",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultsByMatchSchema),
  resultController.getResultsByMatch.bind(resultController)
);

/**
 * @route GET /api/results/:id
 * @desc Get result by ID
 * @access Private (Admin/Judge)
 */
router.get(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultByIdSchema),
  resultController.getResultById.bind(resultController)
);

/**
 * @route PATCH /api/results/:id
 * @desc Update result (partial update)
 * @access Private (Admin/Judge)
 */
router.patch(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultByIdSchema),
  validateBody(updateResultSchema),
  resultController.updateResult.bind(resultController)
);

/**
 * @route DELETE /api/results/:id
 * @desc Hard delete result
 * @access Private (Admin only)
 */
router.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(deleteResultSchema),
  resultController.deleteResult.bind(resultController)
);

/**
 * @route GET /api/results/contest/:slug
 * @desc Get results by contest slug with pagination and filtering
 * @access Private (Admin/Judge)
 */
router.get(
  "/contest/:slug",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getResultsByContestSlugSchema),
  validateQuery(getResultsByContestSlugQuerySchema),
  resultController.getResultsByContestSlug.bind(resultController)
);

export { router as resultRouter };
