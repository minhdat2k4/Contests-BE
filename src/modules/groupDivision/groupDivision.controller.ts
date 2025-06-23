import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import GroupDivisionService from "./groupDivision.service";
import {
  divideGroupsSchema,
  getAvailableContestantsSchema,
  getAvailableJudgesSchema
} from "./groupDivision.schema";

export default class GroupDivisionController {
  /**
   * Lấy danh sách thí sinh có thể tham gia trận đấu
   */
  static async getAvailableContestants(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const query = getAvailableContestantsSchema.parse({
        roundId: req.query.roundId ? parseInt(req.query.roundId as string) : undefined,
        status: req.query.status as any,
        schoolId: req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined,
        classId: req.query.classId ? parseInt(req.query.classId as string) : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      });

      const data = await GroupDivisionService.getAvailableContestants(matchId, query);

      logger.info(`Lấy danh sách thí sinh cho trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          data,
          "Lấy danh sách thí sinh thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách trọng tài có thể chấm thi
   */
  static async getAvailableJudges(req: Request, res: Response): Promise<void> {
    try {
      const query = getAvailableJudgesSchema.parse({
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50
      });

      const data = await GroupDivisionService.getAvailableJudges(query);

      logger.info("Lấy danh sách trọng tài thành công");
      res.json(
        successResponse(
          data,
          "Lấy danh sách trọng tài thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu
   */
  static async getCurrentGroups(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const groups = await GroupDivisionService.getCurrentGroups(matchId);

      logger.info(`Lấy danh sách nhóm cho trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          { groups },
          "Lấy danh sách nhóm thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Chia nhóm thí sinh cho trận đấu
   */
  static async divideGroups(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const input = divideGroupsSchema.parse(req.body);

      const result = await GroupDivisionService.divideGroups(matchId, input);

      logger.info(`Chia nhóm cho trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          { groups: result },
          "Chia nhóm thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách trường học để lọc
   */
  static async getSchools(req: Request, res: Response): Promise<void> {
    try {
      const schools = await GroupDivisionService.getSchools();

      logger.info("Lấy danh sách trường học thành công");
      res.json(
        successResponse(
          { schools },
          "Lấy danh sách trường học thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách lớp học theo trường
   */
  static async getClassesBySchool(req: Request, res: Response): Promise<void> {
    try {
      const schoolId = parseInt(req.params.schoolId);
      if (!schoolId) {
        throw new Error("School ID không hợp lệ");
      }

      const classes = await GroupDivisionService.getClassesBySchool(schoolId);

      logger.info(`Lấy danh sách lớp học cho trường ${schoolId} thành công`);
      res.json(
        successResponse(
          { classes },
          "Lấy danh sách lớp học thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
