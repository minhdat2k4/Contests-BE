import { Request, Response } from "express";
import {
  RoundQueryInput,
  RoundService,
  CreateRoundInput,
  UpdateRoundInput,
} from "@/modules/round";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
export default class RoundController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: RoundQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        contestId: parseInt(req.query.contestId as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await RoundService.getAll(query);
      if (!data) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      logger.info(`Lấy danh sách vòng đấu thành công`);
      res.json(
        successResponse(
          { rounds: data.rounds, pagination: data.pagination },
          "Lấy danh sách vòng đấu thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getRoundById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const round = await RoundService.getRoundBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      logger.info(`Lấy thông tin vòng đấu ${round.name} thành công`);
      res.json(
        successResponse(
          round,
          `Lấy thông tin vòng đấu ${round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async createRound(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateRoundInput = req.body;
      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      const round = await RoundService.createRound(input);
      if (!round) {
        throw new Error(`Thêm vòng đấu ${input.name} thành công`);
      }
      logger.info(`Thêm vòng đấu ${input.name} thành công`);
      res.json(
        successResponse(round, `Thêm vòng đấu ${input.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const round = await RoundService.getRoundBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      const updateRound = await RoundService.updateRound(Number(id), {
        isActive: !round.isActive,
      });
      if (!updateRound) {
        throw new Error("Cập nhật trạng thái vòng đấu thất bại ");
      }
      logger.info(`Cập nhật trạng thái vòng đấu  ${round.name} thành công`);
      res.json(
        successResponse(
          updateRound,
          `Cập nhật trạng thái vòng đấu ${round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteRound(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Round = await RoundService.getRoundBy({ id: Number(id) });
      if (!Round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      const [countContestants, countMatch] = await Promise.all([
        RoundService.countContestantsByRoundId(Number(id)),
        RoundService.countMatchesByRoundId(Number(id)),
      ]);

      if (countMatch > 0) {
        throw new Error(
          `Vòng này hiện có ${countMatch} trận đấu không thể xóa`
        );
      }
      if (countContestants > 0) {
        throw new Error(
          `Vòng này hiện có ${countContestants} thí sinh không thể xóa `
        );
      }
      const deleteRound = await RoundService.deleteRound(Round.id);
      if (!deleteRound) {
        throw new Error(`Xóa vòng đấu ${Round.name} thất bại `);
      }
      logger.info(`Xóa vòng đấu ${Round.name} thành công`);
      res.json(successResponse(null, `Xóa vòng đấu ${Round.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateRound(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateRoundInput = req.body;
      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      const Round = await RoundService.getRoundBy({ id: Number(id) });
      if (!Round) {
        throw new Error("Không tìm thấy vòng thi");
      }
      const updateRound = await RoundService.updateRound(Number(id), input);
      if (!updateRound) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Round.name} thành công`);
      res.json(
        successResponse(
          updateRound,
          `Cập nhật vòng thi ${Round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deleteRounds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const round = await RoundService.getRoundBy({ id: Number(id) });

        if (!round) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy vòng đấu với ID = ${id}`,
          });
          continue;
        }

        const [countContestants, countMatch] = await Promise.all([
          RoundService.countContestantsByRoundId(round.id),
          RoundService.countMatchesByRoundId(round.id),
        ]);

        if (countMatch > 0) {
          messages.push({
            status: "error",
            msg: `Vòng "${round.name}" hiện có ${countMatch} trận đấu, không thể xóa`,
          });
          continue;
        }

        if (countContestants > 0) {
          messages.push({
            status: "error",
            msg: `Vòng "${round.name}" hiện có ${countContestants} thí sinh, không thể xóa`,
          });
          continue;
        }

        const deleted = await RoundService.deleteRound(round.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa vòng đấu "${round.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa vòng đấu "${round.name}" thành công`,
        });
        logger.info(`Xóa vòng đấu "${round.name}" thành công`);
      }

      res.json({
        success: true,
        messages,
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
