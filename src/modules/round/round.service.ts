import { prisma } from "@/config/database";
import { Rounds, RoundQueryInput } from "@/modules/round";

export default class RoundService {
  static async getAllClass(query: RoundQueryInput): Promise<{
    rounds: Rounds[];
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

    const roundRaw = await prisma.round.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
    const rounds = roundRaw.map(key => ({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      contestName: key.contest?.name ?? null,
    }));
    const total = await prisma.round.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      rounds: rounds,
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

  // static async updateClass(
  //   id: number,
  //   data: UpdateClassInput
  // ): Promise<Class | null> {
  //   const updateData: any = {};
  //   if (data.name !== undefined) {
  //     updateData.name = data.name;
  //   }
  //   if (data.isActive !== undefined) {
  //     updateData.isActive = data.isActive;
  //   }
  //   if (data.schoolId !== undefined) {
  //     updateData.schoolId = data.schoolId;
  //   }
  //   return prisma.class.update({
  //     where: { id: id },
  //     data: {
  //       ...updateData,
  //     },
  //   });
  // }
  // static async deleteClass(id: number): Promise<Class> {
  //   return prisma.class.delete({
  //     where: {
  //       id: id,
  //     },
  //   });
  // }
  // static async getClassBy(data: any): Promise<ClassById | null> {
  //   return prisma.class.findFirst({
  //     where: {
  //       ...data,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       schoolId: true,
  //       isActive: true,
  //       school: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }
  // static async createClass(data: CreateClassInput): Promise<Class | null> {
  //   return prisma.class.create({
  //     data: {
  //       ...data,
  //     },
  //   });
  // }

  // static async countClassVieoByClassId(id: number) {
  //   return prisma.classVideo.count({
  //     where: {
  //       classId: id,
  //     },
  //   });
  // }
  // static async countClassStudentClassId(id: number) {
  //   return prisma.student.count({
  //     where: {
  //       classId: id,
  //     },
  //   });
  // }
}
