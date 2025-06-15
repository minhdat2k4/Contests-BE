import { PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  CreateResultData,
  UpdateResultData,
  GetResultsQuery,
  ResultResponse,
  ResultListResponse,
  BatchDeleteResult,
} from "./result.schema";

export class ResultService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get results with pagination and filtering
   */
  async getResults(query: GetResultsQuery): Promise<ResultListResponse> {
    try {
      const {
        page,
        limit,
        search,
        contestantId,
        matchId,
        isCorrect,
        questionOrder,
        sortBy,
        sortOrder,
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};

      // Apply filters
      if (search) {
        where.name = {
          contains: search,
          mode: "insensitive",
        };
      }

      if (contestantId) {
        where.contestantId = contestantId;
      }

      if (matchId) {
        where.matchId = matchId;
      }

      if (isCorrect !== undefined) {
        where.isCorrect = isCorrect;
      }

      if (questionOrder) {
        where.questionOrder = questionOrder;
      }

      // Get total count
      const total = await this.prisma.result.count({ where });

      // Get results
      const results = await this.prisma.result.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        results: results as ResultResponse[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error getting results:", error);
      throw new CustomError(
        "Lỗi khi lấy danh sách kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get result by ID
   */
  async getResultById(id: number): Promise<ResultResponse> {
    try {
      const result = await this.prisma.result.findUnique({
        where: { id },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!result) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      return result as ResultResponse;
    } catch (error) {
      logger.error("Error getting result by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi lấy thông tin kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create new result
   */
  async createResult(data: CreateResultData): Promise<ResultResponse> {
    try {
      // Validate contestant exists
      const contestant = await this.prisma.contestant.findUnique({
        where: { id: data.contestantId },
      });
      if (!contestant) {
        throw new CustomError(
          "Contestant không tồn tại",
          404,
          ERROR_CODES.CONTESTANT_NOT_FOUND
        );
      }

      // Validate match exists
      const match = await this.prisma.match.findUnique({
        where: { id: data.matchId },
      });
      if (!match) {
        throw new CustomError(
          "Match không tồn tại",
          404,
          ERROR_CODES.MATCH_NOT_FOUND
        );
      }

      // Check if result already exists for this contestant, match, and question order
      const existingResult = await this.prisma.result.findFirst({
        where: {
          contestantId: data.contestantId,
          matchId: data.matchId,
          questionOrder: data.questionOrder,
        },
      });

      if (existingResult) {
        throw new CustomError(
          "Kết quả đã tồn tại cho contestant, match và question order này",
          409,
          ERROR_CODES.RESULT_ALREADY_EXISTS
        );
      }

      // Create result
      const result = await this.prisma.result.create({
        data: {
          name: data.name,
          contestantId: data.contestantId,
          matchId: data.matchId,
          isCorrect: data.isCorrect,
          questionOrder: data.questionOrder,
        },
        include: {
          contestant: {
            select: {
              id: true,
              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Result created successfully with ID: ${result.id}`);
      return result as ResultResponse;
    } catch (error) {
      logger.error("Error creating result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update result (PATCH method)
   */
  async updateResult(
    id: number,
    data: UpdateResultData
  ): Promise<ResultResponse> {
    try {
      // Check if result exists
      const existingResult = await this.prisma.result.findUnique({
        where: { id },
      });
      if (!existingResult) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      // Validate contestant if provided
      if (data.contestantId) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId },
        });
        if (!contestant) {
          throw new CustomError(
            "Contestant không tồn tại",
            404,
            ERROR_CODES.CONTESTANT_NOT_FOUND
          );
        }
      }

      // Validate match if provided
      if (data.matchId) {
        const match = await this.prisma.match.findUnique({
          where: { id: data.matchId },
        });
        if (!match) {
          throw new CustomError(
            "Match không tồn tại",
            404,
            ERROR_CODES.MATCH_NOT_FOUND
          );
        }
      }

      // Check for duplicate if key fields are being updated
      if (data.contestantId || data.matchId || data.questionOrder) {
        const duplicateCheck = await this.prisma.result.findFirst({
          where: {
            contestantId: data.contestantId || existingResult.contestantId,
            matchId: data.matchId || existingResult.matchId,
            questionOrder: data.questionOrder || existingResult.questionOrder,
            id: { not: id }, // Exclude current result
          },
        });

        if (duplicateCheck) {
          throw new CustomError(
            "Kết quả đã tồn tại cho contestant, match và question order này",
            409,
            ERROR_CODES.RESULT_ALREADY_EXISTS
          );
        }
      }

      // Update result
      const result = await this.prisma.result.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.contestantId && { contestantId: data.contestantId }),
          ...(data.matchId && { matchId: data.matchId }),
          ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
          ...(data.questionOrder && { questionOrder: data.questionOrder }),
        },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Result updated successfully: ${result.id}`);
      return result as ResultResponse;
    } catch (error) {
      logger.error("Error updating result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi cập nhật kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Hard delete result
   */
  async deleteResult(id: number): Promise<void> {
    try {
      // Check if result exists
      const existingResult = await this.prisma.result.findUnique({
        where: { id },
      });
      if (!existingResult) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      // Hard delete result
      await this.prisma.result.delete({
        where: { id },
      });

      logger.info(`Result hard deleted: ${id}`);
    } catch (error) {
      logger.error("Error deleting result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi xóa kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch delete results
   */
  async batchDeleteResults(ids: number[]): Promise<BatchDeleteResult> {
    const successIds: number[] = [];
    const failedIds: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    try {
      for (const id of ids) {
        try {
          // Check if result exists
          const existingResult = await this.prisma.result.findUnique({
            where: { id },
          });

          if (!existingResult) {
            failedIds.push(id);
            errors.push({ id, error: "Result not found" });
            continue;
          }

          // Delete result
          await this.prisma.result.delete({
            where: { id },
          });

          successIds.push(id);
          logger.info(`Result ${id} deleted successfully in batch operation`);
        } catch (error) {
          failedIds.push(id);
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          logger.error(`Error deleting result ${id} in batch:`, error);
        }
      }

      return {
        successIds,
        failedIds,
        errors,
        summary: {
          total: ids.length,
          success: successIds.length,
          failed: failedIds.length,
        },
      };
    } catch (error) {
      logger.error("Error in batch delete results:", error);
      throw new CustomError(
        "Lỗi khi xóa hàng loạt kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get results by contestant ID
   */
  async getResultsByContestant(
    contestantId: number
  ): Promise<ResultResponse[]> {
    try {
      const results = await this.prisma.result.findMany({
        where: { contestantId },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
            },
          },
        },
        orderBy: { questionOrder: "asc" },
      });

      return results as ResultResponse[];
    } catch (error) {
      logger.error("Error getting results by contestant:", error);
      throw new CustomError(
        "Lỗi khi lấy kết quả theo contestant",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get results by match ID
   */
  async getResultsByMatch(matchId: number): Promise<ResultResponse[]> {
    try {
      const results = await this.prisma.result.findMany({
        where: { matchId },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
            },
          },
        },
        orderBy: [{ contestantId: "asc" }, { questionOrder: "asc" }],
      });

      return results as ResultResponse[];
    } catch (error) {
      logger.error("Error getting results by match:", error);
      throw new CustomError(
        "Lỗi khi lấy kết quả theo match",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get statistics for a contestant
   */
  async getContestantStatistics(contestantId: number): Promise<{
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
  }> {
    try {
      const results = await this.prisma.result.findMany({
        where: { contestantId },
      });

      const totalQuestions = results.length;
      const correctAnswers = results.filter(r => r.isCorrect).length;
      const incorrectAnswers = totalQuestions - correctAnswers;
      const accuracy =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      return {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      logger.error("Error getting contestant statistics:", error);
      throw new CustomError(
        "Lỗi khi lấy thống kê contestant",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}
