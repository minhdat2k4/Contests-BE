import { prisma } from "@/config/database";
import { Class } from "@prisma/client";
import { ClassQueryInput } from "@/modules/class";
export default class ClassService {
  // static async createSchool(data: CreateSchoolInput): Promise<School | null> {
  //   return prisma.school.create({
  //     data: {
  //       ...data,
  //     },
  //   });
  // }

  // static async updateSchool(
  //   id: number,
  //   data: UpdateShoolInput
  // ): Promise<School | null> {
  //   const updateData: any = {};
  //   if (data.phone !== undefined) {
  //     updateData.name = data.name;
  //   }
  //   if (data.email !== undefined) {
  //     updateData.email = data.email;
  //   }
  //   if (data.phone !== undefined) {
  //     updateData.phone = data.phone;
  //   }
  //   if (data.address !== undefined) {
  //     updateData.address = data.address;
  //   }
  //   if (data.isActive !== undefined) {
  //     updateData.isActive = data.isActive;
  //   }
  //   return prisma.school.update({
  //     where: { id: id },
  //     data: {
  //       ...updateData,
  //     },
  //   });
  // }
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
