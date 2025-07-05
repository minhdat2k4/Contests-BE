import { Request, Response } from "express";
import { successResponse, errorResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import AwardService from "./award.service";
import {
  CreateAwardData,
  CreateAwardByContestData,
  GetContestSlugParams,
  UpdateAwardData,
  GetAwardsQuery,
  BatchDeleteAwardsData,
} from "./award.schema";
import { prisma } from "@/config/database";
import { query } from "winston";

export default class AwardController {
  private awardService: AwardService;

  constructor() {
    this.awardService = new AwardService();
  }

  /**
   * Create a new award
   */
  async createAward(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateAwardData = req.body;
      const award = await this.awardService.createAward(data);

      logger.info(`Award created successfully: ${award.id}`);
      res
        .status(201)
        .json(successResponse(award, "Tạo giải thưởng thành công"));
    } catch (error) {
      logger.error("Error in createAward controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Get award by ID
   */
  async getAwardById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const award = await this.awardService.getAwardById(Number(id));

      logger.info(`Retrieved award: ${award.id}`);
      res.json(successResponse(award, "Lấy thông tin giải thưởng thành công"));
    } catch (error) {
      logger.error("Error in getAwardById controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Get awards with pagination and filtering
   */
  /**
   * Update award (PATCH method for partial updates)
   */
  async updateAward(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateAwardData = req.body;

      // Check if at least one field is provided
      if (Object.keys(data).length === 0) {
        res
          .status(400)
          .json(
            errorResponse(
              "Ít nhất một trường cần được cập nhật",
              "VALIDATION_ERROR"
            )
          );
        return;
      }

      const award = await this.awardService.updateAward(Number(id), data);

      logger.info(`Award updated successfully: ${award.id}`);
      res.json(successResponse(award, "Cập nhật giải thưởng thành công"));
    } catch (error) {
      logger.error("Error in updateAward controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Delete award
   */
  async deleteAward(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.awardService.deleteAward(Number(id));

      logger.info(`Award deleted successfully: ${id}`);
      res.json(successResponse(null, "Xóa giải thưởng thành công"));
    } catch (error) {
      logger.error("Error in deleteAward controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Batch delete awards
   */
  async batchDeleteAwards(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteAwardsData = req.body;
      const result = await this.awardService.batchDeleteAwards(data.ids);

      const { successIds, failedIds, errors } = result;

      if (failedIds.length === 0) {
        // All deletions successful
        logger.info(
          `Batch delete successful: ${successIds.length} awards deleted`
        );
        res.json(
          successResponse(
            result,
            `Xóa thành công ${successIds.length} giải thưởng`
          )
        );
      } else if (successIds.length === 0) {
        // All deletions failed
        logger.warn(
          `Batch delete failed: All ${failedIds.length} deletions failed`
        );
        res.status(400).json(
          errorResponse("Không thể xóa bất kỳ giải thưởng nào", {
            result,
            errors,
          })
        );
      } else {
        // Partial success
        logger.warn(
          `Batch delete partial: ${successIds.length} success, ${failedIds.length} failed`
        );
        res
          .status(207)
          .json(
            successResponse(
              result,
              `Xóa thành công ${successIds.length}/${data.ids.length} giải thưởng`
            )
          );
      }
    } catch (error) {
      logger.error("Error in batchDeleteAwards controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Create award by contest slug
   */
  async createAwardByContestSlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const data: CreateAwardByContestData = req.body;
      const award = await this.awardService.createAwardByContestSlug(
        slug,
        data
      );

      logger.info(`Award created by contest slug successfully: ${award.id}`);
      res
        .status(201)
        .json(successResponse(award, "Tạo giải thưởng thành công"));
    } catch (error) {
      logger.error("Error in createAwardByContestSlug controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }

  /**
   * Get awards by contest slug
   */
  async getAwardsByContestSlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const contest = await prisma.contest.findFirst({
        where: { slug: slug },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi với slug này");
      }

      const query: GetAwardsQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string | undefined,
      };

      const awards = await this.awardService.getAll(query, contest.id);

      res.json(
        successResponse(
          {
            awards: awards.awards,
            pagination: awards.pagination,
          },
          "Lấy danh sách giải thưởng thành công"
        )
      );
    } catch (error) {
      logger.error("Error in getAwardsByContestSlug controller:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR)
          );
      }
    }
  }
}
