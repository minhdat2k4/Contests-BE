import { Request, Response } from "express";
import { ContestQueryInput, Contestervice } from "@/modules/contest";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { ContestStatus } from "@prisma/client";
export default class ContestController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: ContestQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        status: req.query.status as ContestStatus | undefined,
      };
      const data = await Contestervice.getAll(query);
      if (!data) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      logger.info(`Lấy danh sách cuộc thi thành công`);
      res.json(
        successResponse(
          { Contest: data.Contest, pagination: data.pagination },
          "Lấy danh sách cuộc thi  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Contest = await Contestervice.getBy({ id: Number(id) });
      if (!Contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      logger.info(`Lấy thông tin cuộc thi ${Contest.name} thành công`);
      res.json(
        successResponse(
          Contest,
          `Lấy thông tin cuộc thi ${Contest.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // static async delete(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Rescue = await Contestervice.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy cuộc thi ");
  //     }

  //     const deleteRescue = await Contestervice.delete(Rescue.id);
  //     if (!deleteRescue) {
  //       throw new Error(`Xóa cuộc thi ${Rescue.name} thất bại `);
  //     }
  //     logger.info(`Xóa cuộc thi ${Rescue.name} thành công`);
  //     res.json(successResponse(null, `Xóa cuộc thi ${Rescue.name} thành công`));
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async update(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const input: UpdateRescueInput = req.body;
  //     const match = await prisma.match.findFirst({
  //       where: { id: input.matchId },
  //     });
  //     if (!match) {
  //       throw new Error("Không tìm thấy trận đấu");
  //     }
  //     const Rescue = await Contestervice.getRescueBy({ id: Number(id) });
  //     if (!Rescue) {
  //       throw new Error("Không tìm thấy cuộc thi ");
  //     }
  //     const updateRescue = await Contestervice.updateRescue(Number(id), input);
  //     if (!updateRescue) {
  //       throw new Error("Cập nhật cuộc thi thất bại");
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

  // static async create(req: Request, res: Response): Promise<void> {
  //   try {
  //     const input: CreateContestInput = req.body;
  //     const match = await prisma.match.findFirst({
  //       where: { id: input.matchId },
  //     });
  //     if (!match) {
  //       throw new Error("Không tìm thấy trận đấu");
  //     }
  //     const Contest = await Contestervice.create(input);
  //     if (!Contest) {
  //       throw new Error(`Thêm cuộc thi ${input.name} thành công`);
  //     }
  //     logger.info(`Thêm cuộc thi ${input.name} thành công`);
  //     res.json(
  //       successResponse(Contest, `Thêm cuộc thi ${input.name} thành công`)
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }

  // static async deleteMany(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { ids } = req.body;

  //     if (!Array.isArray(ids)) {
  //       throw new Error("Danh sách không hợp lệ");
  //     }

  //     const messages: { status: "success" | "error"; msg: string }[] = [];

  //     for (const id of ids) {
  //       const Contest = await Contestervice.getContestBy({ id: Number(id) });

  //       if (!Contest) {
  //         messages.push({
  //           status: "error",
  //           msg: `Không tìm thấy cuộc thi với ID = ${id}`,
  //         });
  //         continue;
  //       }

  //       const deleted = await Contestervice.delete(Contest.id);

  //       if (!deleted) {
  //         messages.push({
  //           status: "error",
  //           msg: `Xóa vòng đấu "${Contest.name}" thất bại`,
  //         });
  //         continue;
  //       }

  //       messages.push({
  //         status: "success",
  //         msg: `Xóa vòng đấu "${Contest.name}" thành công`,
  //       });
  //       logger.info(`Xóa vòng đấu "${Contest.name}" thành công`);
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
  // static async enmuResceType(req: Request, res: Response): Promise<void> {
  //   const ContestTypes = Object.values(ContestType); // Lấy các giá trị enum
  //   res.json({
  //     success: true,
  //     data: ContestTypes,
  //   });
  // }

  // static async enmuContesttatus(req: Request, res: Response): Promise<void> {
  //   const ContestTypes = Object.values(Contesttatus); // Lấy các giá trị enum
  //   res.json({
  //     success: true,
  //     data: ContestTypes,
  //   });
  // }
}
