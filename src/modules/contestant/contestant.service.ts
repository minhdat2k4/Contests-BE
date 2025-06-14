import { prisma } from "@/config/database";
import {
  CreateContestantInput,
  UpdateContestantInput,
  ContestantQueryInput,
  ContestantType,
  ContestantById,
} from "@/modules/contestant";
import { Contestant } from "@prisma/client";

export default class ContestantService {
  static async getAll(
    query: ContestantQueryInput,
    contestId: number
  ): Promise<{
    contestantes: ContestantType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, roundId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (roundId !== undefined) {
      whereClause.roundId = roundId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { name: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
      ]);
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: {},
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        student: { select: { fullName: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
    const Contestantes = ContestantRaw.map(key => ({
      id: key.id,
      fullName: key.student.fullName,
      roundName: key.round.name,
      status: key.status,
    }));

    const total = await prisma.contestant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      contestantes: Contestantes,
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

  static async getContestantBy(data: any): Promise<ContestantById | null> {
    return prisma.contestant.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: { select: { fullName: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateContestantInput): Promise<Contestant | null> {
    return prisma.contestant.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateContestantInput
  ): Promise<Contestant | null> {
    const updateData: any = {};

    if (data.roundId !== undefined) {
      updateData.roundId = data.roundId;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return prisma.contestant.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async deleteContestant(id: number): Promise<Contestant> {
    return prisma.contestant.delete({
      where: {
        id: id,
      },
    });
  }
}
