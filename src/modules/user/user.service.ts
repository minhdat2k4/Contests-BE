import { User, Role } from "@prisma/client";
import { prisma } from "@/config/database";
import { UpdateUserInput } from "./user.shema";
export default class UserService {
  static async getUserById(id: number) {
    const user: Omit<User, "password" | "otpExpiredAt" | "otpCode"> | null =
      await prisma.user.findFirst({
        where: { id: id },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          role: true,
          token: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    return user;
  }
  static async UpdateUser(id: number, data: UpdateUserInput) {
    const updateData: any = {};
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.token !== undefined) {
      updateData.token = data.token;
    }
    if (data.isAcitve !== undefined) {
      updateData.isAcitve = data.isAcitve;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.otpCode !== undefined) {
      updateData.otpCode = data.otpCode;
    }
    if (data.otpExpiredAt !== undefined) {
      updateData.otpExpiredAt = data.otpExpiredAt;
    }
    const user: Omit<User, "password" | "updatedAt"> = await prisma.user.update(
      {
        where: {
          id: id,
        },
        data: {
          ...updateData,
        },
      }
    );
    return user;
  }
  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }
}
