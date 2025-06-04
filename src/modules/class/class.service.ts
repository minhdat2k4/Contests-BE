import { prisma } from "@/config/database";
import { Class } from "@prisma/client";
import {
  ClassQueryInput,
  CreateClassInput,
  UpdateClassInput,
} from "@/modules/class";
export default class ClassService {
  static async updateClass(
    id: number,
    data: UpdateClassInput
  ): Promise<Class | null> {
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.schoolId !== undefined) {
      updateData.schoolId = data.schoolId;
    }
    return prisma.class.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  // static async deleteSchool(id: number): Promise<School> {
  //   return prisma.school.delete({
  //     where: {
  //       id: id,
  //     },
  //   });
  // }
  static async getClassBy(data: any): Promise<Class | null> {
    return prisma.class.findFirst({
      where: {
        ...data,
      },
    });
  }
  static async createClass(data: CreateClassInput): Promise<Class | null> {
    return prisma.class.create({
      data: {
        ...data,
      },
    });
  }
  static async getAllClass(query: ClassQueryInput): Promise<{
    classes: Class[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, schoolId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (schoolId !== undefined) {
      whereClause.schoolId = schoolId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
      ]);
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    const total = classes.length;
    const totalPages = Math.ceil(total / limit);

    return {
      classes: classes,
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
}
