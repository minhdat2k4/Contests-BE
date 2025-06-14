import { PrismaClient, Award, AwardType } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  CreateAwardData,
  UpdateAwardData,
  GetAwardsQuery,
  AwardResponse,
  AwardListResponse,
  BatchDeleteResult
} from "./award.schema";

export default class AwardService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new award
   */
  async createAward(data: CreateAwardData): Promise<AwardResponse> {
    try {
      // Check if contest exists
      const contest = await this.prisma.contest.findUnique({
        where: { id: data.contestId }
      });
      if (!contest) {
        throw new CustomError("Contest không tồn tại", 404, ERROR_CODES.CONTEST_NOT_FOUND);
      }

      // Check if contestant exists (if provided)
      if (data.contestantId) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId }
        });
        if (!contestant) {
          throw new CustomError("Contestant không tồn tại", 404, ERROR_CODES.CONTESTANT_NOT_FOUND);
        }
      }

      // Check if award type already exists for this contest
      const existingAward = await this.prisma.award.findFirst({
        where: {
          contestId: data.contestId,
          type: data.type
        }
      });
      if (existingAward) {
        throw new CustomError("Loại giải thưởng này đã tồn tại cho cuộc thi", 409, ERROR_CODES.AWARD_TYPE_EXISTS);
      }

      const award = await this.prisma.award.create({
        data: {
          name: data.name,
          contestId: data.contestId,
          contestantId: data.contestantId || null,
          type: data.type
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contestant: {
            select: {
              id: true,
              name: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true
                }
              }
            }
          }
        }
      });

      logger.info(`Award created successfully with ID: ${award.id}`);
      return award;
    } catch (error) {
      logger.error("Error creating award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi tạo giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get award by ID
   */
  async getAwardById(id: number): Promise<AwardResponse> {
    try {
      const award = await this.prisma.award.findUnique({
        where: { id },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contestant: {
            select: {
              id: true,
              name: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true
                }
              }
            }
          }
        }
      });

      if (!award) {
        throw new CustomError("Giải thưởng không tồn tại", 404, ERROR_CODES.AWARD_NOT_FOUND);
      }

      return award;
    } catch (error) {
      logger.error("Error getting award by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi lấy thông tin giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get awards with pagination and filtering
   */
  async getAwards(query: GetAwardsQuery): Promise<AwardListResponse> {
    try {
      const { page = 1, limit = 10, contestId, type, search, hasContestant } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (contestId) {
        where.contestId = contestId;
      }
      
      if (type) {
        where.type = type;
      }
      
      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive'
        };
      }
      
      if (hasContestant !== undefined) {
        if (hasContestant) {
          where.contestantId = { not: null };
        } else {
          where.contestantId = null;
        }
      }

      // Get total count
      const total = await this.prisma.award.count({ where });

      // Get awards
      const awards = await this.prisma.award.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contestant: {
            select: {
              id: true,
              name: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true
                }
              }
            }
          }
        }
      });

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        awards,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      };
    } catch (error) {
      logger.error("Error getting awards:", error);
      throw new CustomError("Lỗi khi lấy danh sách giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update award
   */
  async updateAward(id: number, data: UpdateAwardData): Promise<AwardResponse> {
    try {
      // Check if award exists
      const existingAward = await this.prisma.award.findUnique({
        where: { id }
      });
      if (!existingAward) {
        throw new CustomError("Giải thưởng không tồn tại", 404, ERROR_CODES.AWARD_NOT_FOUND);
      }      // Check if contest exists (if contestId is being updated)
      const targetContestId = data.contestId || existingAward.contestId;
      if (data.contestId && data.contestId !== existingAward.contestId) {
        const contest = await this.prisma.contest.findUnique({
          where: { id: data.contestId }
        });
        if (!contest) {
          throw new CustomError("Contest không tồn tại", 404, ERROR_CODES.CONTEST_NOT_FOUND);
        }
      }

      // Check if contestant exists (if provided)
      if (data.contestantId) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId }
        });
        if (!contestant) {
          throw new CustomError("Contestant không tồn tại", 404, ERROR_CODES.CONTESTANT_NOT_FOUND);
        }
      }

      // Check if award type already exists for this contest (if type is being updated or contestId is changing)
      if (data.type && data.type !== existingAward.type) {
        const existingAwardWithType = await this.prisma.award.findFirst({
          where: {
            contestId: targetContestId,
            type: data.type,
            id: { not: id }
          }
        });
        if (existingAwardWithType) {
          throw new CustomError("Loại giải thưởng này đã tồn tại cho cuộc thi", 409, ERROR_CODES.AWARD_TYPE_EXISTS);
        }
      }

      // Check if changing contestId would create duplicate award type
      if (data.contestId && data.contestId !== existingAward.contestId) {
        const existingAwardWithType = await this.prisma.award.findFirst({
          where: {
            contestId: data.contestId,
            type: existingAward.type,
            id: { not: id }
          }
        });
        if (existingAwardWithType) {
          throw new CustomError("Loại giải thưởng này đã tồn tại cho cuộc thi đích", 409, ERROR_CODES.AWARD_TYPE_EXISTS);
        }
      }      const updatedAward = await this.prisma.award.update({
        where: { id },
        data: {
          // Update name if provided
          ...(data.name !== undefined && { name: data.name }),
          // Update contestId if provided
          ...(data.contestId !== undefined && { contestId: data.contestId }),
          // Update contestantId if provided (including null to unassign)
          ...(data.contestantId !== undefined && { contestantId: data.contestantId }),
          // Update type if provided
          ...(data.type !== undefined && { type: data.type })
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contestant: {
            select: {
              id: true,
              name: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true
                }
              }
            }
          }
        }
      });

      logger.info(`Award updated successfully with ID: ${id}`);
      return updatedAward;
    } catch (error) {
      logger.error("Error updating award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi cập nhật giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete award
   */
  async deleteAward(id: number): Promise<void> {
    try {
      const existingAward = await this.prisma.award.findUnique({
        where: { id }
      });
      if (!existingAward) {
        throw new CustomError("Giải thưởng không tồn tại", 404, ERROR_CODES.AWARD_NOT_FOUND);
      }

      await this.prisma.award.delete({
        where: { id }
      });

      logger.info(`Award deleted successfully with ID: ${id}`);
    } catch (error) {
      logger.error("Error deleting award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi xóa giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Batch delete awards
   */
  async batchDeleteAwards(ids: number[]): Promise<BatchDeleteResult> {
    try {
      const successIds: number[] = [];
      const failedIds: number[] = [];
      const errors: Array<{ id: number; error: string }> = [];

      // Process each ID individually to handle partial failures
      for (const id of ids) {
        try {
          // Check if award exists
          const existingAward = await this.prisma.award.findUnique({
            where: { id }
          });

          if (!existingAward) {
            failedIds.push(id);
            errors.push({
              id,
              error: `Giải thưởng với ID ${id} không tồn tại`
            });
            continue;
          }

          // Delete the award
          await this.prisma.award.delete({
            where: { id }
          });

          successIds.push(id);
          logger.info(`Award deleted successfully with ID: ${id}`);

        } catch (error) {
          failedIds.push(id);
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Lỗi không xác định"
          });
          logger.error(`Error deleting award with ID ${id}:`, error);
        }
      }

      const result: BatchDeleteResult = {
        successIds,
        failedIds,
        errors
      };

      logger.info(`Batch delete completed. Success: ${successIds.length}, Failed: ${failedIds.length}`);
      return result;

    } catch (error) {
      logger.error("Error in batch delete awards:", error);
      throw new CustomError("Lỗi khi xóa nhiều giải thưởng", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}
