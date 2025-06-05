import { prisma } from "@/config/database";
import { Student, Class } from "@prisma/client";
import {
  CreateStudentInput,
  StudentQueryInput,
  UpdateStudentInput,
} from "@/modules/student";
export default class StudentService {
  static async updateStudent(
    id: number,
    data: UpdateStudentInput
  ): Promise<Student | null> {
    const updateData: any = {};
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.classId !== undefined) {
      updateData.classId = data.classId;
    }
    if (data.studentCode !== undefined) {
      updateData.studentCode = data.studentCode;
    }
    return prisma.student.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  // static async deleteClass(id: number): Promise<Class> {
  //   return prisma.class.delete({
  //     where: {
  //       id: id,
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

  static async getStudentBy(data: any): Promise<Student | null> {
    return prisma.student.findFirst({
      where: {
        ...data,
      },
    });
  }
  static async getAllStudent(query: StudentQueryInput): Promise<{
    students: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, classId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (classId !== undefined) {
      whereClause.classId = classId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { fullfullName: { contains: keyword } },
        { studentCode: { contains: keyword } },
      ]);
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    const total = await prisma.student.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      students: students,
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
  static async createClass(data: CreateStudentInput): Promise<Student | null> {
    return prisma.student.create({
      data: {
        ...data,
      },
    });
  }
}
