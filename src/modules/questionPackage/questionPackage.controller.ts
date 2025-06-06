import { Request, Response } from "express";
import { successResponse, errorResponse, paginatedResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import QuestionPackageService from "./questionPackage.service";
import {
  CreateQuestionPackageInput,
  UpdateQuestionPackageInput,
  QuestionPackageQueryInput,
  QuestionPackageIdInput,
} from "./questionPackage.schema";

export default class QuestionPackageController {
  /**
   * Create a new question package
   */
  static async createQuestionPackage(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateQuestionPackageInput = req.body;

      // Check if name already exists
      const nameExists = await QuestionPackageService.nameExists(data.name);
      if (nameExists) {
        throw new CustomError(
          "Tên gói câu hỏi đã tồn tại",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      const questionPackage = await QuestionPackageService.createQuestionPackage(data);

      logger.info(`Question package created successfully: ${questionPackage.id}`, {
        questionPackageId: questionPackage.id,
        name: questionPackage.name,
      });

      res.status(201).json(
        successResponse(questionPackage, "Tạo gói câu hỏi thành công")
      );
    } catch (error) {
      logger.error("Error creating question package:", error);
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(
          errorResponse(error.message, error.code)
        );
      } else {
        res.status(500).json(
          errorResponse(
            "Lỗi server khi tạo gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
      }
    }
  }

  /**
   * Get question package by ID
   */
  static async getQuestionPackageById(req: Request, res: Response): Promise<void> {
    try {
      // Parse ID manually for consistent validation
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);
      
      if (isNaN(id) || id <= 0) {
        throw new CustomError(
          "ID phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      logger.info(`Getting question package by ID: ${id} (type: ${typeof id})`);
      const questionPackage = await QuestionPackageService.getQuestionPackageById(id);

      if (!questionPackage) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      res.status(200).json(
        successResponse(questionPackage, "Lấy thông tin gói câu hỏi thành công")
      );
    } catch (error) {
      logger.error("Error getting question package by ID:", error);
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(
          errorResponse(error.message, error.code)
        );
      } else {
        res.status(500).json(
          errorResponse(
            "Lỗi server khi lấy thông tin gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
      }
    }
  }

  /**
   * Update question package
   */
  static async updateQuestionPackage(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);
      
      if (isNaN(id) || id <= 0) {
        throw new CustomError("ID phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const data: UpdateQuestionPackageInput = req.body;

      // Check if question package exists
      const exists = await QuestionPackageService.questionPackageExists(id);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if name already exists (excluding current record)
      if (data.name) {
        const nameExists = await QuestionPackageService.nameExists(data.name, id);
        if (nameExists) {
          throw new CustomError(
            "Tên gói câu hỏi đã tồn tại",
            409,
            ERROR_CODES.DUPLICATE_ENTRY
          );
        }
      }

      const updatedQuestionPackage = await QuestionPackageService.updateQuestionPackage(id, data);

      logger.info(`Question package updated successfully: ${id}`, {
        questionPackageId: id,
        updates: data,
      });

      res.status(200).json(
        successResponse(updatedQuestionPackage, "Cập nhật gói câu hỏi thành công")
      );
    } catch (error) {
      logger.error("Error updating question package:", error);
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(
          errorResponse(error.message, error.code)
        );
      } else {
        res.status(500).json(
          errorResponse(
            "Lỗi server khi cập nhật gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
      }
    }
  }

  /**
   * Soft delete question package
   */
  static async deleteQuestionPackage(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);
      
      if (isNaN(id) || id <= 0) {
        throw new CustomError("ID phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question package exists
      const exists = await QuestionPackageService.questionPackageExists(id);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      await QuestionPackageService.deleteQuestionPackage(id);

      logger.info(`Question package deleted successfully: ${id}`, {
        questionPackageId: id,
      });

      res.status(200).json(
        successResponse(null, "Xóa gói câu hỏi thành công")
      );
    } catch (error) {
      logger.error("Error deleting question package:", error);
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(
          errorResponse(error.message, error.code)
        );
      } else {
        res.status(500).json(
          errorResponse(
            "Lỗi server khi xóa gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
      }
    }
  }

  /**
   * Get all question packages with pagination and filtering
   */
  static async getAllQuestionPackages(req: Request, res: Response): Promise<void> {
    try {
      // Ensure proper validation and defaults
      const queryInput: QuestionPackageQueryInput = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search as string | undefined,
        isActive: req.query.isActive ? req.query.isActive === "true" : undefined,
        sortBy: (req.query.sortBy as "name" | "createdAt" | "updatedAt") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc"
      };

      const result = await QuestionPackageService.getAllQuestionPackages(queryInput);

      res.status(200).json(
        paginatedResponse(
          result.questionPackages,
          result.pagination,
          "Lấy danh sách gói câu hỏi thành công"
        )
      );
    } catch (error) {
      logger.error("Error getting all question packages:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy danh sách gói câu hỏi",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }

  /**
   * Get active question packages for dropdown
   */
  static async getActiveQuestionPackages(req: Request, res: Response): Promise<void> {
    try {
      const questionPackages = await QuestionPackageService.getActiveQuestionPackages();

      res.status(200).json(
        successResponse(questionPackages, "Lấy danh sách gói câu hỏi hoạt động thành công")
      );
    } catch (error) {
      logger.error("Error getting active question packages:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy danh sách gói câu hỏi hoạt động",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
}
