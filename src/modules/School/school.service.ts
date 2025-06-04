import { prisma } from "@/config/database";
import { School } from "@prisma/client";
import { CreateSchoolInput, UpdateShoolInput } from "@/modules/School";
export default class SchoolService {
  static async existingEmail(email: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: {
        email: email,
      },
    });
    return !!school;
  }
  static async existingPhone(phone: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: {
        phone: phone,
      },
    });
    return !!school;
  }
  static async createSchool(data: CreateSchoolInput): Promise<School | null> {
    return prisma.school.create({
      data: {
        ...data,
      },
    });
  }
  static async getSchoolBy(data: any): Promise<School | null> {
    return prisma.school.findFirst({
      where: {
        ...data,
      },
    });
  }
  static async updateSchool(
    id: number,
    data: UpdateShoolInput
  ): Promise<School | null> {
    const updateData: any = {};
    if (data.phone !== undefined) {
      updateData.name = data.name;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    return prisma.school.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
}
