import { Request, Response } from "express";
import {
  ContestQueryInput,
  Contestervice,
  CreateContestInput,
} from "@/modules/contest";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { ContestStatus } from "@prisma/client";
import { prisma } from "@/config/database";
import { htmlToPlainText } from "@/utils/html";

export default class ContestController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateContestInput = req.body;
      const slug = await Contestervice.generateUniqueSlug(input.name);
      const textplan = await htmlToPlainText(input.rule);
      const data = {
        name: input.name,
        slug: slug,
        rule: input.rule,
        plainText: textplan,
        location: input.location,
        startTime: input.startTime,
        endTime: input.endTime,
        slogan: input.slogan,
        status: input.status,
        isActive: input.isActive,
      };

      const contest = await Contestervice.create(data);

      logger.info(`Thêm cuộc thi thành công`);
      res.json(successResponse(contest, "Thêm cuộc thi thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
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

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const contest = await Contestervice.getBy({ id: Number(id) });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi ");
      }

      const countRound = await prisma.round.count({
        where: { contestId: contest.id },
      });
      if (countRound > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countRound} vòng đấu không thể xóa`
        );
      }

      const countMatch = await prisma.match.count({
        where: { contestId: contest.id },
      });
      if (countMatch > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countMatch} trận đấu không thể xóa`
        );
      }

      const countContestants = await prisma.contestant.count({
        where: { contestId: contest.id },
      });
      if (countContestants > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countContestants} thí sinh không thể xóa`
        );
      }

      const countSpo = await prisma.sponsor.count({
        where: { contestId: contest.id },
      });
      if (countSpo > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countSpo} nhà tài trợ không thể xóa`
        );
      }

      const countClassVieo = await prisma.classVideo.count({
        where: { contestId: contest.id },
      });
      if (countClassVieo > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countClassVieo} video tham gia không thể xóa`
        );
      }

      const countAwrad = await prisma.award.count({
        where: { contestId: contest.id },
      });
      if (countAwrad > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countAwrad} giải thưởng không thể xóa`
        );
      }
      const deletecontest = await Contestervice.delete(contest.id);
      if (!deletecontest) {
        throw new Error(`Xóa cuộc thi ${contest.name} thất bại `);
      }
      logger.info(`Xóa cuộc thi ${contest.name} thành công`);
      res.json(
        successResponse(null, `Xóa cuộc thi ${contest.name} thành công`)
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
        const contest = await Contestervice.getBy({ id: Number(id) });

        if (!contest) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy cuộc thi với ID = ${id}`,
          });
          continue;
        }

        // Kiểm tra liên kết
        const relatedChecks = [
          {
            count: await prisma.round.count({
              where: { contestId: contest.id },
            }),
            type: "vòng đấu",
          },
          {
            count: await prisma.match.count({
              where: { contestId: contest.id },
            }),
            type: "trận đấu",
          },
          {
            count: await prisma.contestant.count({
              where: { contestId: contest.id },
            }),
            type: "thí sinh",
          },
          {
            count: await prisma.sponsor.count({
              where: { contestId: contest.id },
            }),
            type: "nhà tài trợ",
          },
          {
            count: await prisma.classVideo.count({
              where: { contestId: contest.id },
            }),
            type: "video tham gia",
          },
          {
            count: await prisma.award.count({
              where: { contestId: contest.id },
            }),
            type: "giải thưởng",
          },
        ];

        let hasError = false;
        for (const check of relatedChecks) {
          if (check.count > 0) {
            messages.push({
              status: "error",
              msg: `Cuộc thi này đang có ${check.count} ${check.type} không thể xóa`,
            });
            hasError = true;
          }
        }

        if (hasError) continue;

        // Tiến hành xóa
        const deleted = await Contestervice.delete(contest.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa cuộc thi "${contest.name}" thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa cuộc thi "${contest.name}" thành công`,
        });
        logger.info(`Xóa cuộc thi "${contest.name}" thành công`);
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

  // static async update(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const input: UpdatecontestInput = req.body;
  //     const match = await prisma.match.findFirst({
  //       where: { id: input.matchId },
  //     });
  //     if (!match) {
  //       throw new Error("Không tìm thấy trận đấu");
  //     }
  //     const contest = await Contestervice.getcontestBy({ id: Number(id) });
  //     if (!contest) {
  //       throw new Error("Không tìm thấy cuộc thi ");
  //     }
  //     const updatecontest = await Contestervice.updatecontest(Number(id), input);
  //     if (!updatecontest) {
  //       throw new Error("Cập nhật cuộc thi thất bại");
  //     }
  //     logger.info(`Cập nhật vòng thi  ${contest.name} thành công`);
  //     res.json(
  //       successResponse(
  //         updatecontest,
  //         `Cập nhật vòng thi ${contest.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
}
