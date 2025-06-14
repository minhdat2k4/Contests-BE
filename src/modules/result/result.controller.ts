import { Request, Response } from "express";
import { ResultService } from "./result.service";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import { successResponse, errorResponse } from "@/utils/response";
import {
  CreateResultData,
  UpdateResultData,
  GetResultsQuery,
  BatchDeleteResultsData
} from "./result.schema";

export class ResultController {
  private resultService: ResultService;

  constructor() {
    this.resultService = new ResultService();
  }

  /**
   * Get results with pagination and filtering
   */
  async getResults(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters with defaults
      const query: GetResultsQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        contestantId: req.query.contestantId ? parseInt(req.query.contestantId as string) : undefined,
        matchId: req.query.matchId ? parseInt(req.query.matchId as string) : undefined,
        isCorrect: req.query.isCorrect === "true" ? true : req.query.isCorrect === "false" ? false : undefined,
        questionOrder: req.query.questionOrder ? parseInt(req.query.questionOrder as string) : undefined,
        sortBy: (req.query.sortBy as "createdAt" | "updatedAt" | "name" | "questionOrder") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc"
      };

      const result = await this.resultService.getResults(query);

      logger.info(`Retrieved ${result.results.length} results`);
      res.json(successResponse(result, "Lấy danh sách kết quả thành công"));
    } catch (error) {
      logger.error("Error in getResults controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get result by ID
   */
  async getResultById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.resultService.getResultById(Number(id));

      logger.info(`Retrieved result: ${result.id}`);
      res.json(successResponse(result, "Lấy thông tin kết quả thành công"));
    } catch (error) {
      logger.error("Error in getResultById controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Create new result
   */
  async createResult(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateResultData = req.body;
      const result = await this.resultService.createResult(data);

      logger.info(`Result created successfully: ${result.id}`);
      res.status(201).json(successResponse(result, "Tạo kết quả thành công"));
    } catch (error) {
      logger.error("Error in createResult controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Update result (PATCH method)
   */
  async updateResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateResultData = req.body;
      
      // Check if at least one field is provided
      if (Object.keys(data).length === 0) {
        res.status(400).json(errorResponse("Ít nhất một trường cần được cập nhật", ERROR_CODES.VALIDATION_ERROR));
        return;
      }

      const result = await this.resultService.updateResult(Number(id), data);

      logger.info(`Result updated successfully: ${result.id}`);
      res.json(successResponse(result, "Cập nhật kết quả thành công"));
    } catch (error) {
      logger.error("Error in updateResult controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Hard delete result
   */
  async deleteResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.resultService.deleteResult(Number(id));

      logger.info(`Result deleted: ${id}`);
      res.json(successResponse(null, "Xóa kết quả thành công"));
    } catch (error) {
      logger.error("Error in deleteResult controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Batch delete results
   */
  async batchDeleteResults(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteResultsData = req.body;
      const result = await this.resultService.batchDeleteResults(data.ids);

      const { successIds, failedIds, errors } = result;

      if (failedIds.length === 0) {
        logger.info(`Batch delete successful: ${successIds.length} results deleted`);
        res.json(successResponse(result, `Xóa thành công ${successIds.length} kết quả`));
      } else if (successIds.length === 0) {
        logger.warn(`Batch delete failed: All ${failedIds.length} results failed to delete`);
        res.status(400).json(errorResponse(`Không thể xóa bất kỳ kết quả nào`, ERROR_CODES.VALIDATION_ERROR));
      } else {
        logger.info(`Batch delete partial success: ${successIds.length} success, ${failedIds.length} failed`);
        res.status(207).json(successResponse(result, `Batch delete hoàn thành: ${successIds.length}/${data.ids.length} thành công, ${failedIds.length} thất bại`));
      }
    } catch (error) {
      logger.error("Error in batchDeleteResults controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get results by contestant ID
   */
  async getResultsByContestant(req: Request, res: Response): Promise<void> {
    try {
      const { contestantId } = req.params;
      const results = await this.resultService.getResultsByContestant(Number(contestantId));

      logger.info(`Retrieved ${results.length} results for contestant ${contestantId}`);
      res.json(successResponse(results, "Lấy kết quả theo contestant thành công"));
    } catch (error) {
      logger.error("Error in getResultsByContestant controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get results by match ID
   */
  async getResultsByMatch(req: Request, res: Response): Promise<void> {
    try {
      const { matchId } = req.params;
      const results = await this.resultService.getResultsByMatch(Number(matchId));

      logger.info(`Retrieved ${results.length} results for match ${matchId}`);
      res.json(successResponse(results, "Lấy kết quả theo match thành công"));
    } catch (error) {
      logger.error("Error in getResultsByMatch controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get statistics for a contestant
   */
  async getContestantStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { contestantId } = req.params;
      const statistics = await this.resultService.getContestantStatistics(Number(contestantId));

      logger.info(`Retrieved statistics for contestant ${contestantId}`);
      res.json(successResponse(statistics, "Lấy thống kê contestant thành công"));
    } catch (error) {
      logger.error("Error in getContestantStatistics controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
}
