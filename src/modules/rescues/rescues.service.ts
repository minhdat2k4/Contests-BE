import { prisma } from "@/config/database";
import { RescuesQueryInput, Rescues } from "@/modules/rescues";
import { Rescue } from "@prisma/client";
import { match } from "assert";

export default class RescueService {
  static async getAll(query: RescuesQueryInput): Promise<{
    rescues: Rescues[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, matchId, status, rescueType } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (matchId !== undefined) {
      whereClause.matchId = matchId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (rescueType !== undefined) {
      whereClause.rescueType = rescueType;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { match: { is: { name: { contains: keyword } } } },
      ]);
    }

    const RescueRaw = await prisma.rescue.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        rescueType: true,
        questionFrom: true,
        questionTo: true,
        studentIds: true,
        supportAnswers: true,
        remainingContestants: true,
        maxStudent: true,
        index: true,
        status: true,
        match: {
          select: {
            name: true,
          },
        },
      },
    });

    const rescues = RescueRaw.map(key => ({
      id: key.id,
      name: key.name,
      rescueType: key.rescueType,
      questionFrom: key.questionFrom,
      questionTo: key.questionTo,
      studentIds: key.studentIds,
      supportAnswers: key.supportAnswers,
      remainingContestants: key.remainingContestants,
      maxStudent: key.maxStudent,
      index: key.index,
      status: key.status,
      matchName: key.match?.name,
    }));
    const total = await prisma.rescue.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      rescues: rescues,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // static async getRescueBy(data: any): Promise<RescueById | null> {
  //   return prisma.Rescue.findFirst({
  //     where: {
  //       ...data,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       contestId: true,
  //       isActive: true,
  //       index: true,
  //       endTime: true,
  //       startTime: true,
  //       contest: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // static async createRescue(data: CreateRescueInput): Promise<Rescue | null> {
  //   return prisma.Rescue.create({
  //     data: {
  //       ...data,
  //     },
  //   });
  // }

  // static async updateRescue(
  //   id: number,
  //   data: UpdateRescueInput
  // ): Promise<Rescue | null> {
  //   const updateData: any = {};

  //   if (data.name !== undefined) {
  //     updateData.name = data.name;
  //   }

  //   if (data.isActive !== undefined) {
  //     updateData.isActive = data.isActive;
  //   }

  //   if (data.contestId !== undefined) {
  //     updateData.contestId = data.contestId;
  //   }

  //   if (data.index !== undefined) {
  //     updateData.index = data.index;
  //   }

  //   if (data.endTime !== undefined) {
  //     updateData.endTime = data.endTime;
  //   }

  //   if (data.startTime !== undefined) {
  //     updateData.startTime = data.startTime;
  //   }

  //   return prisma.Rescue.update({
  //     where: { id: id },
  //     data: {
  //       ...updateData,
  //     },
  //   });
  // }
  // static async deleteRescue(id: number): Promise<Rescue> {
  //   return prisma.Rescue.delete({
  //     where: {
  //       id: id,
  //     },
  //   });
  // }

  // static async countMatchesByRescueId(id: number) {
  //   return prisma.match.count({
  //     where: {
  //       RescueId: id,
  //     },
  //   });
  // }
  // static async countContestantsByRescueId(id: number) {
  //   return prisma.contestant.count({
  //     where: {
  //       RescueId: id,
  //     },
  //   });
  // }
}
