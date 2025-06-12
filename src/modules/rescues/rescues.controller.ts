import { Request, Response } from "express";
import { RescuesQueryInput, RescueService } from "@/modules/rescues";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { RescueStatus, RescueType } from "@prisma/client";
export default class RescueController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: RescuesQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        matchId: parseInt(req.query.contestId as string) || undefined,
        status: req.query.status as RescueStatus | undefined,
        rescueType: req.query.rescueType as RescueType | undefined,
      };
      const data = await RescueService.getAll(query);
      if (!data) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      logger.info(`Lấy danh sách cứu trợ thành công`);
      res.json(
        successResponse(
          { reqescues: data.rescues, pagination: data.pagination },
          "Lấy danh sách cứu trợ  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // static async getRescueById(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Rescue = await RescueService.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     logger.info(`Lấy thông tin vòng đấu ${Rescue.name} thành công`);
  //     res.json(
  //       successResponse(
  //         Rescue,
  //         `Lấy thông tin vòng đấu ${Rescue.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }

  // static async createRescue(req: Request, res: Response): Promise<void> {
  //   try {
  //     const input: CreateRescueInput = req.body;
  //     const contest = await prisma.contest.findFirst({
  //       where: { id: input.contestId },
  //     });
  //     if (!contest) {
  //       throw new Error("Không tìm thấy cuộc thi");
  //     }
  //     const Rescue = await RescueService.createRescue(input);
  //     if (!Rescue) {
  //       throw new Error(`Thêm vòng đấu ${input.name} thành công`);
  //     }
  //     logger.info(`Thêm vòng đấu ${input.name} thành công`);
  //     res.json(
  //       successResponse(Rescue, `Thêm vòng đấu ${input.name} thành công`)
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }

  // static async toggleActive(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Rescue = await RescueService.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     const updateRescue = await RescueService.updateRescue(Number(id), {
  //       isActive: !Rescue.isActive,
  //     });
  //     if (!updateRescue) {
  //       throw new Error("Cập nhật trạng thái vòng đấu thất bại ");
  //     }
  //     logger.info(`Cập nhật trạng thái vòng đấu  ${Rescue.name} thành công`);
  //     res.json(
  //       successResponse(
  //         updateRescue,
  //         `Cập nhật trạng thái vòng đấu ${Rescue.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async deleteRescue(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Rescue = await RescueService.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     const [countContestants, countMatch] = await Promise.all([
  //       RescueService.countContestantsByRescueId(Number(id)),
  //       RescueService.countMatchesByRescueId(Number(id)),
  //     ]);

  //     if (countMatch > 0) {
  //       throw new Error(
  //         `Vòng này hiện có ${countMatch} trận đấu không thể xóa`
  //       );
  //     }
  //     if (countContestants > 0) {
  //       throw new Error(
  //         `Vòng này hiện có ${countContestants} thí sinh không thể xóa `
  //       );
  //     }
  //     const deleteRescue = await RescueService.deleteRescue(Rescue.id);
  //     if (!deleteRescue) {
  //       throw new Error(`Xóa vòng đấu ${Rescue.name} thất bại `);
  //     }
  //     logger.info(`Xóa vòng đấu ${Rescue.name} thành công`);
  //     res.json(successResponse(null, `Xóa vòng đấu ${Rescue.name} thành công`));
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async updateRescue(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const input: UpdateRescueInput = req.body;
  //     const contest = await prisma.contest.findFirst({
  //       where: { id: input.contestId },
  //     });
  //     if (!contest) {
  //       throw new Error("Không tìm thấy cuộc thi");
  //     }
  //     const Rescue = await RescueService.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy vòng thi");
  //     }
  //     const updateRescue = await RescueService.updateRescue(Number(id), input);
  //     if (!updateRescue) {
  //       throw new Error("Cập nhật vòng thi thất bại");
  //     }
  //     logger.info(`Cập nhật vòng thi  ${Rescue.name} thành công`);
  //     res.json(
  //       successResponse(
  //         updateRescue,
  //         `Cập nhật vòng thi ${Rescue.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }

  // static async deleteRescues(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { ids } = req.body;

  //     if (!Array.isArray(ids)) {
  //       throw new Error("Danh sách không hợp lệ");
  //     }

  //     const messages: { status: "success" | "error"; msg: string }[] = [];

  //     for (const id of ids) {
  //       const Rescue = await RescueService.getRescueBy({ id: Number(id) });

  //       if (!Rescue) {
  //         messages.push({
  //           status: "error",
  //           msg: `Không tìm thấy vòng đấu với ID = ${id}`,
  //         });
  //         continue;
  //       }

  //       const [countContestants, countMatch] = await Promise.all([
  //         RescueService.countContestantsByRescueId(Rescue.id),
  //         RescueService.countMatchesByRescueId(Rescue.id),
  //       ]);

  //       if (countMatch > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Vòng "${Rescue.name}" hiện có ${countMatch} trận đấu, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       if (countContestants > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Vòng "${Rescue.name}" hiện có ${countContestants} thí sinh, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       const deleted = await RescueService.deleteRescue(Rescue.id);

  //       if (!deleted) {
  //         messages.push({
  //           status: "error",
  //           msg: `Xóa vòng đấu "${Rescue.name}" thất bại`,
  //         });
  //         continue;
  //       }

  //       messages.push({
  //         status: "success",
  //         msg: `Xóa vòng đấu "${Rescue.name}" thành công`,
  //       });
  //       logger.info(`Xóa vòng đấu "${Rescue.name}" thành công`);
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
