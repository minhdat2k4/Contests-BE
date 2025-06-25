import { prisma } from "@/config/database";
import {
  CreateContestantInput,
  UpdateContestantInput,
  ContestantQueryInput,
  ContestantType,
  ContestantById,
} from "@/modules/contestant";
import { Contestant } from "@prisma/client";
import { group } from "console";

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
    const { page, limit, search, roundId, status } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (roundId !== undefined) {
      whereClause.roundId = roundId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { fullName: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
      ]);
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: whereClause,
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

  static async getAllNotConstest(
    query: ContestantQueryInput,
    idContest: number
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
    const { page = 1, limit = 10, search, roundId, status, contestId } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (roundId) whereClause.roundId = roundId;
    if (status) whereClause.status = status;

    // Tìm kiếm theo tên cuộc thi, thí sinh, vòng thi
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        {
          contest: {
            name: {
              contains: keyword,
            },
          },
        },
        {
          student: {
            fullName: {
              contains: keyword,
            },
          },
        },
        {
          round: {
            name: {
              contains: keyword,
            },
          },
        },
      ]);
    }

    const students = await prisma.contestant.findMany({
      where: { contestId: idContest },
      select: { studentId: true },
    });

    const arrIds = students.map(item => item.studentId);

    const contestantsRaw = await prisma.contestant.findMany({
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
      skip,
      distinct: ["studentId"],
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
        round: {
          select: {
            name: true,
          },
        },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });

    const contestants = contestantsRaw.map(item => ({
      id: item.id,
      fullName: item.student.fullName,
      roundName: item.round.name,
      status: item.status,
      studentId: item.student.id,
    }));

    // Đếm tổng số bản ghi
    const uniqueStudents = await prisma.contestant.groupBy({
      by: ["studentId"],
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
    });

    const total = uniqueStudents.length;
    const totalPages = Math.ceil(total / limit);

    return {
      contestantes: contestants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
