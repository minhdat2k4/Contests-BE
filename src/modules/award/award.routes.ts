import express from "express";
import AwardController from "./award.controller";
import { validateBody, validateParams, validateQuery } from "@/utils/validation";
import { authenticate, role } from "@/middlewares/auth";
import {
  createAwardSchema,
  updateAwardSchema,
  getAwardByIdSchema,
  deleteAwardSchema,
  getAwardsQuerySchema,
  batchDeleteAwardsSchema
} from "./award.schema";

const router = express.Router();
const awardController = new AwardController();

// Public routes (no authentication required)

/**
 * @route GET /api/awards
 * @desc Get awards with pagination and filtering
 * @access Public
 */
router.get(
  "/",
  validateQuery(getAwardsQuerySchema),
  awardController.getAwards.bind(awardController)
);

/**
 * @route GET /api/awards/:id
 * @desc Get award by ID
 * @access Public
 */
router.get(
  "/:id",
  validateParams(getAwardByIdSchema),
  awardController.getAwardById.bind(awardController)
);

// Protected routes (authentication required)

/**
 * @route POST /api/awards
 * @desc Create a new award
 * @access Private (Admin only)
 */
router.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(createAwardSchema),
  awardController.createAward.bind(awardController)
);

/**
 * @route PATCH /api/awards/:id
 * @desc Update award (partial update)
 * @access Private (Admin only)
 */
router.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(getAwardByIdSchema),
  validateBody(updateAwardSchema),
  awardController.updateAward.bind(awardController)
);

/**
 * @route DELETE /api/awards/batch
 * @desc Batch delete awards
 * @access Private (Admin only)
 */
router.delete(
  "/batch",
  authenticate,
  role("Admin"),
  validateBody(batchDeleteAwardsSchema),
  awardController.batchDeleteAwards.bind(awardController)
);

/**
 * @route DELETE /api/awards/:id
 * @desc Delete award by ID
 * @access Private (Admin only)
 */
router.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(deleteAwardSchema),
  awardController.deleteAward.bind(awardController)
);

export default router;
