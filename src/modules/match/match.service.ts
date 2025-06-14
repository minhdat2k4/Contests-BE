import { prisma } from "@/config/database";
import {
  MatchById,
  CreateMatchInput,
  UpdateMatchInput,
  MatchQuerySchema,
  MatchType,
  MatchQueryInput,
} from "@/modules/match";
import { Match } from "@prisma/client";
import slugify from "slugify";

export default class MatchService {
  static async getAll(query: MatchQueryInput): Promise<{
    matches: MatchType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, contestId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { contest: { is: { name: { contains: keyword } } } },
      ]);
    }

    const matchRaw = await prisma.match.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        remainingTime: true,
        name: true,
        contestId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        status: true,
        currentQuestion: true,
        questionPackageId: true,
        studentId: true,
        student: { select: { fullName: true } },
        questionPackage: { select: { name: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
    const matches = matchRaw.map(key => ({
      contestId: key.contestId,
      name: key.name,
      startTime: key.startTime,
      endTime: key.endTime,
      currentQuestion: key.currentQuestion,
      questionPackageId: key.questionPackageId,
      studentFullName: key.student?.fullName ?? "",
      contestName: key.contest?.name ?? "",
      isActive: key.isActive,
      status: key.status ?? "",
      slug: key.slug ?? "",
      remainingTime: key.remainingTime ?? 0,
      studentId: key.studentId ?? undefined,
      roundName: key.round.name ?? "",
    }));

    const total = await prisma.match.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      matches: matches,
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

  static async getMatchBy(data: any): Promise<MatchById | null> {
    return prisma.match.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        slug: true,
        remainingTime: true,
        name: true,
        contestId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        status: true,
        currentQuestion: true,
        questionPackageId: true,
        studentId: true,
        student: { select: { fullName: true } },
        questionPackage: { select: { name: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateMatchInput): Promise<Match | null> {
    return prisma.match.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateMatchInput
  ): Promise<Match | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      const slug = await MatchService.generateUniqueSlug(data.name);
      updateData.slug = slug;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.contestId !== undefined) {
      updateData.contestId = data.contestId;
    }

    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime;
    }

    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime;
    }

    if (data.remainingTime !== undefined) {
      updateData.remainingTime = data.remainingTime;
    }

    if (data.roundId !== undefined) {
      updateData.roundId = data.roundId;
    }

    if (data.studentId !== undefined) {
      updateData.studentId = data.studentId;
    }

    if (data.currentQuestion !== undefined) {
      updateData.currentQuestion = data.currentQuestion;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.questionPackageId !== undefined) {
      updateData.questionPackageId = data.questionPackageId;
    }

    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }

    return prisma.match.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async deleteMatch(id: number): Promise<Match> {
    return prisma.match.delete({
      where: {
        id: id,
      },
    });
  }

  static async getListMatch(slug: string) {
    return prisma.match.findMany({
      where: {
        isActive: true,
        contest: {
          slug: slug,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  static async generateUniqueSlug(
    name: string,
    excludeId?: number
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, locale: "vi", strict: true });
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const exists = await prisma.match.findFirst({
        where: {
          slug,
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      });

      if (!exists) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }
}
