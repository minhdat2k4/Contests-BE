import { Request, Response } from "express";
import { CreateGroupInput, GroupQueryInput } from "./group.schema";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import GroupService from "./group.service";
export default class GroupController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");
      const query: GroupQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        matchId: parseInt(req.query.matchId as string) || undefined,
        userId: parseInt(req.query.userId as string) || undefined,
      };
      const data = await GroupService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy nhóm ");
      }
      logger.info(`Lấy danh sách nhóm thành công`);
      res.json(
        successResponse(
          { Groups: data.groups, pagination: data.pagination },
          "Lấy danh sách nhóm thành công"
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
      const Group = await GroupService.getBy({ id: Number(id) });
      if (!Group) {
        throw new Error("Không tìm thấy nhóm ");
      }
      logger.info(`Lấy thông tin nhóm ${Group.name} thành công`);
      res.json(
        successResponse(Group, `Lấy thông tin nhóm ${Group.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateGroupInput = req.body;
      const user = await prisma.user.findFirst({ where: { id: input.userId } });
      if (!user) throw "Không tìm thấy trọng tài";
      const match = await prisma.match.findFirst({
        where: { id: input.matchId },
      });
      if (!match) throw "Không tìm thấy trận đấu";
      const existedGroup = await prisma.group.findFirst({
        where: {
          userId: input.userId,
          matchId: input.matchId,
        },
      });

      if (existedGroup) {
        throw new Error(
          `Trọng tài ${user.username} đã được phân vào nhóm ${existedGroup.name} trong trận đấu này`
        );
      }
      const conflictGroup = await prisma.group.findFirst({
        where: {
          userId: input.userId,
          NOT: {
            matchId: input.matchId,
          },
          match: {
            AND: [
              {
                startTime: {
                  lt: match.endTime,
                },
              },
              {
                endTime: {
                  gt: match.startTime,
                },
              },
            ],
          },
        },
        include: {
          match: true,
        },
      });

      if (conflictGroup)
        throw new Error(
          ` Trọng tài này ${user.username} đang có nhóm ${conflictGroup.name} trùng thời gian `
        );
      const Group = await GroupService.create(input);
      if (!Group) {
        throw new Error(`Thêm nhóm ${input.name} thành công`);
      }
      logger.info(`Thêm nhóm ${input.name} thành công`);
      res.json(successResponse(Group, `Thêm nhóm ${input.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateGroupInput = req.body;
      const id = Number(req.params.id);

      const group = await GroupService.getBy({ id: id });
      if (!group) throw new Error(`Không tìm thấy nhóm`);

      const newUserId = input.userId ?? group.userId;
      const newMatchId = input.matchId ?? group.matchId;

      const newUser = await prisma.user.findFirst({
        where: { id: newUserId },
      });
      if (!newUser) throw new Error("Không tìm thấy trọng tài");

      const newMatch = await prisma.match.findFirst({
        where: { id: newMatchId },
      });
      if (!newMatch) throw new Error("Không tìm thấy trận đấu");

      // Kiểm tra trùng trọng tài trong cùng trận
      const existedGroup = await prisma.group.findFirst({
        where: {
          userId: newUserId,
          matchId: newMatchId,
          id: { not: id }, // tránh chính nó
        },
      });

      if (existedGroup) {
        throw new Error(
          `Trọng tài này đã có nhóm trong trận này: ${existedGroup.name}`
        );
      }

      // Kiểm tra trùng thời gian trận khác
      const conflictGroup = await prisma.group.findFirst({
        where: {
          userId: newUserId,
          NOT: {
            matchId: newMatchId, // ❗ sửa từ input.matchId thành newMatchId
          },
          match: {
            AND: [
              {
                startTime: { lt: newMatch.endTime },
              },
              {
                endTime: { gt: newMatch.startTime },
              },
            ],
          },
        },
        include: {
          match: true,
        },
      });

      if (conflictGroup) {
        throw new Error(
          `Trọng tài ${newUser.username} đang có nhóm khác ở trận '${conflictGroup.match.name}' trùng thời gian`
        );
      }

      const updatedGroup = await GroupService.update(id, input);

      logger.info(`Cập nhật nhóm ${input.name} thành công`);
      res.json(
        successResponse(updatedGroup, `Cập nhật nhóm ${input.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const group = await GroupService.getBy({ id: Number(id) });
      if (!group) {
        throw new Error("Không tìm thấy nhóm ");
      }

      const countContestant = await prisma.contestantMatch.count({
        where: { groupId: group.id },
      });

      if (countContestant > 0)
        throw new Error(
          ` Nhóm này ${countContestant} thí sinh nên không thể xóa`
        );

      const deleteGroup = await GroupService.delete(group.id);
      if (!deleteGroup) {
        throw new Error(`Xóa nhóm ${group.name} thất bại `);
      }
      logger.info(`Xóa nhóm ${group.name} thành công`);
      res.json(successResponse(null, `Xóa nhóm ${group.name} thành công`));
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
        const group = await GroupService.getBy({ id: Number(id) });
        if (!group) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy nhóm với ID = ${id}`,
          });
          continue;
        }

        const countContestant = await prisma.contestantMatch.count({
          where: { groupId: group.id },
        });

        if (countContestant > 0) {
          messages.push({
            status: "error",
            msg: ` Nhóm này ${countContestant} thí sinh nên không thể xóa`,
          });
          continue;
        }

        const deleted = await GroupService.delete(group.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa nhóm "${group.name}" thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa nhóm "${group.name}" thành công`,
        });
        logger.info(`Xóa nhóm "${group.name}" thành công`);
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

  static async getByMatchSlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;

      const match = await prisma.match.findFirst({
        where: { slug: slug },
      });
      if (!match) throw new Error("Không tìm thấy trận đấu");

      const groups = await GroupService.getBy({
        matchId: match.id,
        userId: req.user?.userId,
      });
      if (!groups) {
        throw new Error("Không tìm thấy nhóm trong trận đấu này");
      }
      res.json(successResponse(groups));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
