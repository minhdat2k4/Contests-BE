import { Request, Response } from "express";
import {
  MatchService,
  MatchQueryInput,
  CreateMatchInput,
  UpdateMatchInput,
  deleteMatchesSchema,
} from "@/modules/match";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";

export default class MatchController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: MatchQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        contestId: parseInt(req.query.contestId as string) || undefined,
        questionPackageId:
          parseInt(req.query.questionPackageId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await MatchService.getAll(query);
      if (!data) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy danh sách trận đấut hành công`);
      res.json(
        successResponse(
          { matches: data.matches, pagination: data.pagination },
          "Lấy danh sách trận đấu thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateMatchInput = req.body;
      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const QuestionPackage = await prisma.questionPackage.findFirst({
        where: { id: input.questionPackageId },
      });
      if (!QuestionPackage) throw Error("Không tìm thấy gói câu hỏi");

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");
      const slug = await MatchService.generateUniqueSlug(input.name);
      input.slug = slug;
      const Match = await MatchService.create(input);
      if (!Match) {
        throw new Error(`Thêm trận đấu${input.name} thành công`);
      }
      logger.info(`Thêm trận đấu${input.name} thành công`);
      res.json(successResponse(Match, `Thêm trận đấu${input.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const updateMatch = await MatchService.update(Number(id), {
        isActive: !Match.isActive,
      });
      if (!updateMatch) {
        throw new Error("Cập nhật trạng thái trận đấu thất bại ");
      }
      logger.info(`Cập nhật trạng thái trận đấu ${Match.name} thành công`);
      res.json(
        successResponse(
          updateMatch,
          `Cập nhật trạng thái trận đấu${Match.name} thành công`
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
      const round = await MatchService.getMatchBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy thông tin trận đấu${round.name} thành công`);
      res.json(
        successResponse(round, `Lấy thông tin trận đấu${round.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      const group = await prisma.group.count({
        where: { matchId: Match.id },
      });

      if (group > 0)
        throw new Error(
          `Trận đấu "${Match.name}" hiện có ${group} nhóm không thể xóa`
        );

      const rescue = await prisma.rescue.count({
        where: { matchId: Match.id },
      });

      if (rescue > 0)
        throw new Error(
          `Trận đấu "${Match.name}" hiện có ${rescue} cứu trợ không thể xóa`
        );

      const screenControls = await prisma.screenControl.count({
        where: { matchId: Match.id },
      });

      if (screenControls > 0) {
        throw new Error(
          `Trận đấu "${Match.name}" hiện có ${screenControls} màn hình chiếu không thể xóa`
        );
      }

      const results = await prisma.result.count({
        where: { matchId: Match.id },
      });

      if (results > 0)
        throw new Error(
          `Trận đấu "${Match.name}" hiện có ${results} màn hình chiếu không thể xóa`
        );

      const contestMatch = await prisma.contestantMatch.count({
        where: { matchId: Match.id },
      });

      if (contestMatch > 0)
        throw new Error(
          `Trận đấu "${Match.name}" hiện có ${contestMatch} thí sinh không thể xóa`
        );

      const deleteMatch = await MatchService.deleteMatch(Match.id);
      if (!deleteMatch) {
        throw new Error(`Xóa trận đấu${Match.name} thất bại `);
      }
      logger.info(`Xóa trận đấu${Match.name} thành công`);
      res.json(successResponse(null, `Xóa trận đấu${Match.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateMatchInput = req.body;

      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });

      if (!contest) throw new Error("Không tìm thấy cuộc thi");

      const QuestionPackage = await prisma.questionPackage.findFirst({
        where: { id: input.questionPackageId },
      });
      if (!QuestionPackage) throw Error("Không tìm thấy gói câu hỏi");

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");

      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy vòng thi");
      }
      const updateMatch = await MatchService.update(Number(id), input);
      if (!updateMatch) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Match.name} thành công`);
      res.json(
        successResponse(
          updateMatch,
          `Cập nhật vòng thi ${Match.name} thành công`
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
        throw new Error("Danh sách không hợp lệ");
      }
      const messages: { status: "success" | "error"; msg: string }[] = [];
      for (const id of ids) {
        const Match = await MatchService.getMatchBy({ id: Number(id) });
        if (!Match) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy trận đấuvới ID = ${id}`,
          });
          continue;
        }

        const group = await prisma.group.count({
          where: { matchId: Match.id },
        });

        if (group > 0) {
          messages.push({
            status: "error",
            msg: `Trận đấu "${Match.name}" hiện có ${group} nhóm không thể xóa`,
          });
          continue;
        }

        const rescue = await prisma.rescue.count({
          where: { matchId: Match.id },
        });

        if (rescue > 0) {
          messages.push({
            status: "error",
            msg: `Trận đấu "${Match.name}" hiện có ${rescue} cứu trợ không thể xóa`,
          });
          continue;
        }

        const screenControls = await prisma.screenControl.count({
          where: { matchId: Match.id },
        });

        if (screenControls > 0) {
          messages.push({
            status: "error",
            msg: `Trận đấu "${Match.name}" hiện có ${screenControls} màn hình chiếu không thể xóa`,
          });
          continue;
        }

        const results = await prisma.result.count({
          where: { matchId: Match.id },
        });

        if (results > 0) {
          messages.push({
            status: "error",
            msg: `Trận đấu "${Match.name}" hiện có ${results} màn hình chiếu không thể xóa`,
          });
          continue;
        }

        const contestMatch = await prisma.contestantMatch.count({
          where: { matchId: Match.id },
        });

        if (contestMatch > 0) {
          messages.push({
            status: "error",
            msg: `Trận đấu "${Match.name}" hiện có ${contestMatch} thí sinh không thể xóa`,
          });
          continue;
        }

        const deleted = await MatchService.deleteMatch(Match.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa trận đấu"${Match.name}" thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa trận đấu"${Match.name}" thành công`,
        });
        logger.info(`Xóa trận đấu"${Match.name}" thành công`);
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
  static async getListMatch(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      const match = await MatchService.getListMatch(slug);
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy thông tin trận đấu thành công`);
      res.json(successResponse(match, `Lấy thông tin trận đấu thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
