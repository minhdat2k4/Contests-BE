import { prisma } from "@/config/database";
import { ContestQueryInput, CreateContestInput } from "./contest.schema";
import { Contest } from "@prisma/client";
import slugify from "slugify";
export default class ContestService {
  static async getAll(query: ContestQueryInput): Promise<{
    Contest: Contest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { plainText: { contains: keyword } },
        { rule: { contains: keyword } },
        { location: { contains: keyword } },
        { slogan: { contains: keyword } },
      ]);
    }

    const Contest = await prisma.contest.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    const total = await prisma.contest.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      Contest: Contest,
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

  static async getBy(data: any): Promise<Contest | null> {
    return prisma.contest.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: any): Promise<Contest | null> {
    return prisma.contest.create({
      data: {
        ...data,
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
      const exists = await prisma.contest.findFirst({
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

  // static async updateRescue(
  //   id: number,
  //   data: UpdateRescueInput
  // ): Promise<Rescue | null> {
  //   const updateData: any = {};

  //   if (data.name !== undefined) {
  //     updateData.name = data.name;
  //   }

  //   if (data.matchId !== undefined) {
  //     updateData.matchId = data.matchId;
  //   }

  //   if (data.index !== undefined) {
  //     updateData.index = data.index;
  //   }

  //   if (data.maxStudent !== undefined) {
  //     updateData.maxStudent = data.maxStudent;
  //   }

  //   if (data.questionFrom !== undefined) {
  //     updateData.questionFrom = data.questionFrom;
  //   }

  //   if (data.questionTo !== undefined) {
  //     updateData.questionTo = data.questionTo;
  //   }

  //   if (data.remainingContestants !== undefined) {
  //     updateData.remainingContestants = data.remainingContestants;
  //   }

  //   if (data.rescueType !== undefined) {
  //     updateData.rescueType = data.rescueType;
  //   }

  //   if (data.status !== undefined) {
  //     updateData.status = data.status;
  //   }

  //   if (data.studentIds !== undefined) {
  //     updateData.studentIds = data.studentIds;
  //   }

  //   if (data.supportAnswers !== undefined) {
  //     updateData.supportAnswers = data.supportAnswers;
  //   }

  //   return prisma.rescue.update({
  //     where: { id: id },
  //     data: {
  //       ...updateData,
  //     },
  //   });
  // }

  static async delete(id: number): Promise<Contest> {
    return prisma.contest.delete({
      where: {
        id: id,
      },
    });
  }
}
