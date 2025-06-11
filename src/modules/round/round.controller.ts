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
  // static async deleteRound(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Round = await RoundService.getRoundBy({ id: Number(id) });
  //     if (!Round) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     const [countRoundVieo, countStudent] = await Promise.all([
  //       RoundService.countRoundVieoByRoundId(Number(id)),
  //       RoundService.countRoundStudentRoundId(Number(id)),
  //     ]);

  //     if (countRoundVieo > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countRoundVieo} video lớp tham gia cuộc thi không thể xóa`
  //       );
  //     }
  //     if (countStudent > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countStudent} sinh viên không thể xóa `
  //       );
  //     }
  //     const deleteRound = await RoundService.deleteRound(Round.id);
  //     if (!deleteRound) {
  //       throw new Error(`Xóa lớp ${Round.name} thất bại `);
  //     }
  //     logger.info(`Xóa lớp ${Round.name} thành công`);
  //     res.json(successResponse(null, `Xóa lớp ${Round.name} thành công`));
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
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

  // static async deleteRoundes(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { ids } = req.body;

  //     if (!Array.isArray(ids)) {
  //       throw new Error("Danh sách không hợp lệ");
  //     }

  //     const messages: { status: "success" | "error"; msg: string }[] = [];

  //     for (const id of ids) {
  //       const RoundData = await RoundService.getRoundBy({ id: Number(id) });

  //       if (!RoundData) {
  //         messages.push({
  //           status: "error",
  //           msg: `Không tìm thấy lớp với ID = ${id}`,
  //         });
  //         continue;
  //       }

  //       const [countVideo, countStudent] = await Promise.all([
  //         RoundService.countRoundVieoByRoundId(RoundData.id),
  //         RoundService.countRoundStudentRoundId(RoundData.id),
  //       ]);

  //       if (countVideo > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Lớp "${RoundData.name}" có ${countVideo} video lớp tham gia cuộc thi, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       if (countStudent > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Lớp "${RoundData.name}" có ${countStudent} sinh viên, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       const deleted = await RoundService.deleteRound(RoundData.id);
  //       if (!deleted) {
  //         messages.push({
  //           status: "error",
  //           msg: `Xóa lớp "${RoundData.name}" thất bại`,
  //         });
  //         continue;
  //       }

  //       messages.push({
  //         status: "success",
  //         msg: `Xóa lớp "${RoundData.name}" thành công`,
  //       });
  //       logger.info(`Xóa lớp ${RoundData.name} thành công`);
  //     }

  //     res.json({
  //       success: true,
  //       messages,
  //     });
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
}
