import { User } from "@prisma/client";
import { prisma } from "@/config/database";
import { UserInput, CreatUserInput } from "./user.schema";
export default class UserService {
  static async creatUser(user: CreatUserInput) {
    return prisma.user.create({
      data: user,
    });
  }
  static async getUserById(
    id: number
  ): Promise<Omit<User, "otpExpiredAt" | "otpCode"> | null> {
    return prisma.user.findFirst({
      where: { id: id },
    });
  }
  static async UpdateUser(
    id: number,
    data: UserInput
  ): Promise<Omit<User, "password" | "updatedAt">> {
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
    if (data.password !== undefined) {
      updateData.password = data.password;
    }
    return prisma.user.update({
      where: {
        id: id,
      },
      data: {
        ...updateData,
      },
    });
  }
  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email },
    });
  }
  static async existingEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });
    //  !! chuyên nó thành boolean
    return !!user;
  }
  static async existingUserName(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username: username },
    });
    //  !! chuyên nó thành boolean
    return !!user;
  }
  static async existingEmailForUpdate(
    email: string,
    userId: number
  ): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        NOT: { id: userId },
      },
    });
    return !!user;
  }
}
