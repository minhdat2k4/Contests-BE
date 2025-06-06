import { Router } from "express";
import { validateBody, validateParams, validateQuery } from "@/utils/validation";
import { authenticate } from "@/middlewares/auth";
import QuestionTopicController from "./questionTopic.controller";
import {
  CreateQuestionTopicSchema,
  UpdateQuestionTopicSchema,
  QuestionTopicIdSchema,
  QuestionTopicQuerySchema,
} from "./questionTopic.schema";

const router = Router();

// Apply authentication middleware to all routes
// router.use(authenticate);

/**
 * @route POST /api/question-topics
 * @description Create a new question topic
 * @access Private (Admin/Judge)
 */
router.post(
  "/",
  validateBody(CreateQuestionTopicSchema),
  QuestionTopicController.createQuestionTopic
);

/**
 * @route GET /api/question-topics
 * @description Get all question topics with pagination and filtering
 * @access Private (Admin/Judge)
 */
router.get(
  "/",
  validateQuery(QuestionTopicQuerySchema),
  QuestionTopicController.getAllQuestionTopics
);

/**
 * @route GET /api/question-topics/active
 * @description Get all active question topics (for dropdown)
 * @access Private (Admin/Judge)
 */
router.get(
  "/active",
  QuestionTopicController.getActiveQuestionTopics
);

/**
 * @route GET /api/question-topics/:id
 * @description Get question topic by ID
 * @access Private (Admin/Judge)
 */
router.get(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  QuestionTopicController.getQuestionTopicById
);

/**
 * @route PUT /api/question-topics/:id
 * @description Update question topic
 * @access Private (Admin/Judge)
 */
router.put(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  validateBody(UpdateQuestionTopicSchema),
  QuestionTopicController.updateQuestionTopic
);

/**
 * @route DELETE /api/question-topics/:id
 * @description Soft delete question topic
 * @access Private (Admin/Judge)
 */
router.delete(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  QuestionTopicController.deleteQuestionTopic
);

export default router;