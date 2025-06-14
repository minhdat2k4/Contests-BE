import { Request, Response } from "express";
import {
  ContestantService,
  ContestantQueryInput,
  CreateContestantInput,
  UpdateContestantInput,
  deleteContestantesSchema,
} from "@/modules/contestant";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";

export default class ContestantController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");
      const query: ContestantQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        studentId: parseInt(req.query.studentId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
      };
      const data = await ContestantService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy danh sách thí sinh thành công`);
      res.json(
        successResponse(
          { Contestantes: data.contestantes, pagination: data.pagination },
          "Lấy danh sách thí sinh  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateContestantInput = req.body;
      const contest = await prisma.contest.findFirst({
        where: { slug: req.params.slug },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const extingcontestants = await prisma.contestant.findFirst({
        where: { studentId: input.studentId },
      });
      if (extingcontestants) {
        throw new Error("Sinh viên đã tham gia cuộc thi");
      }

      const conflictContestant = await prisma.contestant.findFirst({
        where: {
          studentId: input.studentId,
          contest: {
            NOT: { id: contest.id },
            AND: [
              {
                startTime: { lte: contest.startTime },
                endTime: { gte: contest.endTime },
              },
            ],
          },
        },
        include: {
          contest: true,
        },
      });

      if (conflictContestant)
        throw new Error(
          `Sinh viên này đã tham gia cuộc thi ${conflictContestant.contest.name} có cùng thời gian `
        );

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");

      const Contestant = await ContestantService.create({
        ...input,
        contestId: contest.id,
      });

      if (!Contestant) {
        throw new Error(`Thêm thí sinh thất bại`);
      }
      logger.info(`Thêm thí sinh thành công`);
      res.json(successResponse(Contestant, `Thêm thí sinh thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });
      if (!contestant) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(
        `Lấy thông tin thí sinh ${contestant.student.fullName} thành công`
      );
      res.json(
        successResponse(
          contestant,
          `Lấy thông tin thí sinh ${contestant.student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });
      if (!Contestant) {
        throw new Error("Không tìm thấy thí sinh ");
      }

      const award = await prisma.award.count({
        where: { contestantId: Contestant.id },
      });

      if (award > 0)
        throw new Error(
          `Thí sinh  "${Contestant.student.fullName}" hiện có ${award} giải thưởng không thể xóa`
        );

      const contestantMatch = await prisma.contestantMatch.count({
        where: { contestantId: Contestant.id },
      });

      if (contestantMatch > 0)
        throw new Error(
          `Thí sinh  "${Contestant.student.fullName}" hiện tham gia ${contestantMatch} trận đấu  không  thể xóa`
        );

      const result = await prisma.result.count({
        where: { contestantId: Contestant.id },
      });

      if (result > 0) {
        throw new Error(
          `thí sinh  "${Contestant.student.fullName}" hiện có ${result} kết quả không thể xóa`
        );
      }

      const deleteContestant = await ContestantService.deleteContestant(
        Contestant.id
      );
      if (!deleteContestant) {
        throw new Error(`Xóa trận đấu${Contestant.student.fullName} thất bại `);
      }
      logger.info(`Xóa trận đấu${Contestant.student.fullName} thành công`);
      res.json(
        successResponse(
          null,
          `Xóa trận đấu${Contestant.student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateContestantInput = req.body;

      const contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });

      if (!contestant) throw new Error("Không tìm thấy thí sinh");

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");
      const updateContestant = await ContestantService.update(
        Number(id),
        input
      );
      if (!updateContestant) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(
        `Cập nhật vòng thi  ${contestant.student.fullName} thành công`
      );
      res.json(
        successResponse(
          updateContestant,
          `Cập nhật vòng thi ${contestant.student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deletes(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        throw new Error("Danh sách ID không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const Contestant = await ContestantService.getContestantBy({
          id: Number(id),
          include: { student: true }, // đảm bảo có student.fullName
        });

        if (!Contestant) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy thí sinh với ID = ${id}`,
          });
          continue;
        }

        const { fullName } = Contestant.student;

        const awardCount = await prisma.award.count({
          where: { contestantId: Contestant.id },
        });

        if (awardCount > 0) {
          messages.push({
            status: "error",
            msg: `Thí sinh "${fullName}" hiện có ${awardCount} giải thưởng, không thể xóa`,
          });
          continue;
        }

        const matchCount = await prisma.contestantMatch.count({
          where: { contestantId: Contestant.id },
        });

        if (matchCount > 0) {
          messages.push({
            status: "error",
            msg: `Thí sinh "${fullName}" hiện tham gia ${matchCount} trận đấu, không thể xóa`,
          });
          continue;
        }

        const resultCount = await prisma.result.count({
          where: { contestantId: Contestant.id },
        });

        if (resultCount > 0) {
          messages.push({
            status: "error",
            msg: `Thí sinh "${fullName}" hiện có ${resultCount} kết quả, không thể xóa`,
          });
          continue;
        }

        const deleted = await ContestantService.deleteContestant(Contestant.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa thí sinh "${fullName}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa thí sinh "${fullName}" thành công`,
        });
        logger.info(`Xóa thí sinh "${fullName}" thành công`);
      }

      res.json({ success: true, messages });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
