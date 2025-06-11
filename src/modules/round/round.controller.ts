import { Request, Response } from "express";
import {
  RoundQueryInput,
  RoundService,
  CreateRoundInput,
} from "@/modules/round";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
export default class ClassController {
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

  // static async toggleActive(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const round = await ClassService.getClassBy({ id: Number(id) });
  //     if (!Class) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     const updateClass = await ClassService.updateClass(Number(id), {
  //       isActive: !Class.isActive,
  //     });
  //     if (!updateClass) {
  //       throw new Error("Cập nhật trạng thái lớp thất bại ");
  //     }
  //     logger.info(`Cập nhật trạng thái lớp  ${Class.name} thành công`);
  //     res.json(
  //       successResponse(
  //         updateClass,
  //         `Cập nhật trạng thái lớp ${Class.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async deleteClass(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Class = await ClassService.getClassBy({ id: Number(id) });
  //     if (!Class) {
  //       throw new Error("Không tìm thấy vòng đấu ");
  //     }
  //     const [countClassVieo, countStudent] = await Promise.all([
  //       ClassService.countClassVieoByClassId(Number(id)),
  //       ClassService.countClassStudentClassId(Number(id)),
  //     ]);

  //     if (countClassVieo > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countClassVieo} video lớp tham gia cuộc thi không thể xóa`
  //       );
  //     }
  //     if (countStudent > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countStudent} sinh viên không thể xóa `
  //       );
  //     }
  //     const deleteClass = await ClassService.deleteClass(Class.id);
  //     if (!deleteClass) {
  //       throw new Error(`Xóa lớp ${Class.name} thất bại `);
  //     }
  //     logger.info(`Xóa lớp ${Class.name} thành công`);
  //     res.json(successResponse(null, `Xóa lớp ${Class.name} thành công`));
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async updateClass(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const input: UpdateClassInput = req.body;
  //     if (input.schoolId) {
  //       const school = await SchoolService.getSchoolBy({ id: input.schoolId });
  //       if (!school) {
  //         throw new Error("Không tìm thấy trường");
  //       }
  //     }
  //     const Class = await ClassService.getClassBy({ id: Number(id) });
  //     if (!Class) {
  //       throw new Error("Không tìm thấy lớp");
  //     }
  //     console.log("đ", Class);
  //     const updateClass = await ClassService.updateClass(Number(id), input);
  //     if (!updateClass) {
  //       throw new Error("Cập nhật lớp thất bại");
  //     }
  //     logger.info(`Cập nhật lớp  ${Class.name} thành công`);
  //     res.json(
  //       successResponse(updateClass, `Cập nhật lớp ${Class.name} thành công`)
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }

  // static async deleteClasses(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { ids } = req.body;

  //     if (!Array.isArray(ids)) {
  //       throw new Error("Danh sách không hợp lệ");
  //     }

  //     const messages: { status: "success" | "error"; msg: string }[] = [];

  //     for (const id of ids) {
  //       const classData = await ClassService.getClassBy({ id: Number(id) });

  //       if (!classData) {
  //         messages.push({
  //           status: "error",
  //           msg: `Không tìm thấy lớp với ID = ${id}`,
  //         });
  //         continue;
  //       }

  //       const [countVideo, countStudent] = await Promise.all([
  //         ClassService.countClassVieoByClassId(classData.id),
  //         ClassService.countClassStudentClassId(classData.id),
  //       ]);

  //       if (countVideo > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Lớp "${classData.name}" có ${countVideo} video lớp tham gia cuộc thi, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       if (countStudent > 0) {
  //         messages.push({
  //           status: "error",
  //           msg: `Lớp "${classData.name}" có ${countStudent} sinh viên, không thể xóa`,
  //         });
  //         continue;
  //       }

  //       const deleted = await ClassService.deleteClass(classData.id);
  //       if (!deleted) {
  //         messages.push({
  //           status: "error",
  //           msg: `Xóa lớp "${classData.name}" thất bại`,
  //         });
  //         continue;
  //       }

  //       messages.push({
  //         status: "success",
  //         msg: `Xóa lớp "${classData.name}" thành công`,
  //       });
  //       logger.info(`Xóa lớp ${classData.name} thành công`);
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
