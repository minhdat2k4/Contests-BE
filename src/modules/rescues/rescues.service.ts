import { prisma } from "@/config/database";
import {
  RescuesQueryInput,
  Rescues,
  RescuesById,
  CreateRescueInput,
  UpdateRescueInput,
} from "@/modules/rescues";
import { Rescue } from "@prisma/client";
export default class RescueService {
  static async getAll(
    query: RescuesQueryInput,
    contestId: number
  ): Promise<{
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
      where: {
        ...whereClause,
        match: {
          contestId: contestId,
        },
      },
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
        questionOrder: true,
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
      rescueType: (key.rescueType === "resurrected"
        ? "Hồi sinh"
        : "Phao cứu sinh") as "Hồi sinh" | "Phao cứu sinh",

      questionFrom: key.questionFrom,
      questionTo: key.questionTo,
      studentIds: key.studentIds,
      supportAnswers: key.supportAnswers,
      remainingContestants: key.remainingContestants,
      questionOrder: key.questionOrder,
      index: key.index,
      status:
        key.status === "notUsed"
          ? "Chưa sử dụng"
          : key.status === "used"
          ? "Đã sử dụng"
          : ("Đã qua" as "Chưa sử dụng" | "Đã sử dụng" | "Đã qua"),
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

  static async getRescueBy(data: any): Promise<RescuesById | null> {
    return prisma.rescue.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        rescueType: true,
        questionFrom: true,
        questionTo: true,
        studentIds: true,
        supportAnswers: true,
        remainingContestants: true,
        questionOrder: true,
        index: true,
        status: true,
        matchId: true,
        match: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateRescueInput): Promise<Rescue | null> {
    return prisma.rescue.create({
      data: {
        ...data,
      },
    });
  }

  static async updateRescue(
    id: number,
    data: UpdateRescueInput
  ): Promise<Rescue | null> {
    const updateData: any = {};

    console.log(data);

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.matchId !== undefined) {
      updateData.matchId = data.matchId;
    }

    if (data.index !== undefined) {
      updateData.index = data.index;
    }

    if (data.questionOrder !== undefined) {
      updateData.questionOrder = data.questionOrder;
    }

    if (data.questionFrom !== undefined) {
      updateData.questionFrom = data.questionFrom;
    }

    if (data.questionTo !== undefined) {
      updateData.questionTo = data.questionTo;
    }

    if (data.remainingContestants !== undefined) {
      updateData.remainingContestants = data.remainingContestants;
    }

    if (data.rescueType !== undefined) {
      updateData.rescueType = data.rescueType;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.studentIds !== undefined) {
      updateData.studentIds = data.studentIds;
    }

    if (data.supportAnswers !== undefined) {
      updateData.supportAnswers = data.supportAnswers;
    }

    return prisma.rescue.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async delete(id: number): Promise<Rescue> {
    return prisma.rescue.delete({
      where: {
        id: id,
      },
    });
  }

  // API: Lấy danh sách rescue theo matchId và rescueType
  static async getRescuesByMatchIdAndType(
    matchId: number,
    rescueType: string = "resurrected"
  ): Promise<
    Array<{
      id: number;
      name: string;
      rescueType: string;
      status: string;
      questionOrder: number | null;
      index: number | null;
      studentIds: any;
    }>
  > {
    const rescues = await prisma.rescue.findMany({
      where: {
        matchId: matchId,
        rescueType: rescueType as any,
      },
      select: {
        id: true,
        name: true,
        rescueType: true,
        status: true,
        questionOrder: true,
        index: true,
        studentIds: true,
      },
      orderBy: [
        { index: "asc" },
        { createdAt: "desc" },
      ],
    });

    return rescues.map(rescue => ({
      id: rescue.id,
      name: rescue.name,
      rescueType: rescue.rescueType,
      status: rescue.status,
      questionOrder: rescue.questionOrder,
      index: rescue.index,
      studentIds: rescue.studentIds,
    }));
  }
}
