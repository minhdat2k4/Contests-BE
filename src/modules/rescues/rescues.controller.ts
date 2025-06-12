import { Request, Response } from "express";
import {
  RescuesQueryInput,
  RescueService,
  CreateRescueInput,
  UpdateRescueInput,
} from "@/modules/rescues";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { RescueStatus, RescueType } from "@prisma/client";
import prisma from "@/config/client";
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
          { rescues: data.rescues, pagination: data.pagination },
          "Lấy danh sách cứu trợ  thành công"
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
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      logger.info(`Lấy thông tin cứu trợ ${Rescue.name} thành công`);
      res.json(
        successResponse(
          Rescue,
          `Lấy thông tin cứu trợ ${Rescue.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateRescueInput = req.body;
      const match = await prisma.match.findFirst({
        where: { id: input.matchId },
      });
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const Rescue = await RescueService.create(input);
      if (!Rescue) {
        throw new Error(`Thêm cứu trợ ${input.name} thành công`);
      }
      logger.info(`Thêm cứu trợ ${input.name} thành công`);
      res.json(
        successResponse(Rescue, `Thêm cứu trợ ${input.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }

      const deleteRescue = await RescueService.delete(Rescue.id);
      if (!deleteRescue) {
        throw new Error(`Xóa cứu trợ ${Rescue.name} thất bại `);
      }
      logger.info(`Xóa cứu trợ ${Rescue.name} thành công`);
      res.json(successResponse(null, `Xóa cứu trợ ${Rescue.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateRescueInput = req.body;
      const match = await prisma.match.findFirst({
        where: { id: input.matchId },
      });
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      const updateRescue = await RescueService.updateRescue(Number(id), input);
      if (!updateRescue) {
        throw new Error("Cập nhật cứu trợ thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Rescue.name} thành công`);
      res.json(
        successResponse(
          updateRescue,
          `Cập nhật vòng thi ${Rescue.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deleteMany(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const Rescue = await RescueService.getRescueBy({ id: Number(id) });

        if (!Rescue) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy cứu trợ với ID = ${id}`,
          });
          continue;
        }

        const deleted = await RescueService.delete(Rescue.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa vòng đấu "${Rescue.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa vòng đấu "${Rescue.name}" thành công`,
        });
        logger.info(`Xóa vòng đấu "${Rescue.name}" thành công`);
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
