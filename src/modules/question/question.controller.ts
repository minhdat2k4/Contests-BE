import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import { successResponse, errorResponse } from "@/utils/response";
import { QuestionService } from "./question.service";
import {
  CreateQuestionData,
  UpdateQuestionData,
  GetQuestionsQuery,
  BatchDeleteQuestionsData,
  UploadMediaData
} from "./question.schema";

export class QuestionController {
  private questionService: QuestionService;

  constructor() {
    this.questionService = new QuestionService();
  }
  /**
   * Get questions with pagination and filtering
   */
  async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters with defaults
      const query: GetQuestionsQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        questionTopicId: req.query.questionTopicId ? parseInt(req.query.questionTopicId as string) : undefined,
        questionType: req.query.questionType as "multiple_choice" | "essay" || undefined,
        difficulty: req.query.difficulty as "Alpha" | "Beta" | "Rc" | "Gold" || undefined,
        hasMedia: req.query.hasMedia === "true" ? true : req.query.hasMedia === "false" ? false : undefined,
        isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
        sortBy: (req.query.sortBy as "createdAt" | "updatedAt" | "defaultTime" | "score") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc"
      };

      const result = await this.questionService.getQuestions(query);

      logger.info(`Retrieved ${result.questions.length} questions`);
      res.json(successResponse(result, "Lấy danh sách câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in getQuestions controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const question = await this.questionService.getQuestionById(Number(id));

      logger.info(`Retrieved question: ${question.id}`);
      res.json(successResponse(question, "Lấy thông tin câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in getQuestionById controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Create new question
   */
  async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateQuestionData = req.body;
      
      // Handle uploaded files
      const uploadedFiles: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] } = {};
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Handle array of files (single field)
          uploadedFiles.questionMedia = req.files;
        } else {
          // Handle named fields
          if (req.files.questionMedia) {
            uploadedFiles.questionMedia = Array.isArray(req.files.questionMedia) 
              ? req.files.questionMedia 
              : [req.files.questionMedia];
          }
          if (req.files.mediaAnswer) {
            uploadedFiles.mediaAnswer = Array.isArray(req.files.mediaAnswer) 
              ? req.files.mediaAnswer 
              : [req.files.mediaAnswer];
          }
        }
      }

      const question = await this.questionService.createQuestion(data, uploadedFiles);

      logger.info(`Question created successfully: ${question.id}`);
      res.status(201).json(successResponse(question, "Tạo câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in createQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Update question (PATCH method)
   */
  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateQuestionData = req.body;
      
      // Check if at least one field is provided
      if (Object.keys(data).length === 0 && !req.files) {
        res.status(400).json(errorResponse("Ít nhất một trường cần được cập nhật", "VALIDATION_ERROR"));
        return;
      }
      
      // Handle uploaded files
      const uploadedFiles: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] } = {};
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Handle array of files (single field)
          uploadedFiles.questionMedia = req.files;
        } else {
          // Handle named fields
          if (req.files.questionMedia) {
            uploadedFiles.questionMedia = Array.isArray(req.files.questionMedia) 
              ? req.files.questionMedia 
              : [req.files.questionMedia];
          }
          if (req.files.mediaAnswer) {
            uploadedFiles.mediaAnswer = Array.isArray(req.files.mediaAnswer) 
              ? req.files.mediaAnswer 
              : [req.files.mediaAnswer];
          }
        }
      }

      const question = await this.questionService.updateQuestion(Number(id), data, uploadedFiles);

      logger.info(`Question updated successfully: ${question.id}`);
      res.json(successResponse(question, "Cập nhật câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in updateQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Soft delete question
   */
  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.questionService.deleteQuestion(Number(id));

      logger.info(`Question soft deleted: ${id}`);
      res.json(successResponse(null, "Chuyển đổi trạng thái câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in deleteQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Hard delete question
   */
  async hardDeleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.questionService.hardDeleteQuestion(Number(id));

      logger.info(`Question hard deleted: ${id}`);
      res.json(successResponse(null, "Xóa vĩnh viễn câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in hardDeleteQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Batch delete questions
   */
  async batchDeleteQuestions(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteQuestionsData = req.body;
      const result = await this.questionService.batchDeleteQuestions(data.ids, data.hardDelete);

      const { successIds, failedIds, errors } = result;

      if (failedIds.length === 0) {
        // All deletions successful
        const deleteType = data.hardDelete ? "xóa vĩnh viễn" : "xóa";
        logger.info(`Batch delete successful: ${successIds.length} questions deleted (hard: ${data.hardDelete})`);
        res.json(successResponse(result, `${deleteType} thành công ${successIds.length} câu hỏi`));
      } else if (successIds.length === 0) {
        // All deletions failed
        logger.warn(`Batch delete failed: All ${failedIds.length} deletions failed`);
        res.status(400).json(errorResponse("Không thể xóa bất kỳ câu hỏi nào", { result, errors }));
      } else {
        // Partial success
        const deleteType = data.hardDelete ? "xóa vĩnh viễn" : "xóa";
        logger.warn(`Batch delete partial: ${successIds.length} success, ${failedIds.length} failed (hard: ${data.hardDelete})`);
        res.status(207).json(successResponse(result, `${deleteType} thành công ${successIds.length}/${data.ids.length} câu hỏi`));
      }
    } catch (error) {
      logger.error("Error in batchDeleteQuestions controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
  /**
   * Upload media for existing question
   */
  async uploadMediaForQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Default to questionMedia if not specified
      const mediaType = req.body.mediaType || 'questionMedia';
      
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        res.status(400).json(errorResponse("Không có file nào được upload", "VALIDATION_ERROR"));
        return;
      }

      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      
      const result = await this.questionService.uploadMediaForQuestion(
        Number(id), 
        mediaType as 'questionMedia' | 'mediaAnswer', 
        files as Express.Multer.File[]
      );

      logger.info(`Media uploaded for question ${id}, type: ${mediaType}`);
      res.json(successResponse(result, "Upload media thành công"));
    } catch (error) {
      logger.error("Error in uploadMediaForQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
}
