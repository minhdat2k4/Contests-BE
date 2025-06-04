import { User } from "@prisma/client";
import { prisma } from "@/config/database";
import { UserInput, CreateUserInput, UserQueryInput } from "./user.schema";
export default class UserService {
  static async creatUser(user: CreateUserInput) {
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
  static async UpdateUser(id: number, data: UserInput): Promise<User | null> {
    const updateData: any = {};
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.token !== undefined) {
      updateData.token = data.token;
    }
    if (data.isAcitve !== undefined) {
      updateData.isActive = data.isAcitve;
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
  static async getAllUser(UserQueryInput: UserQueryInput): Promise<{
    users: Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      isActive: boolean;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, role } = UserQueryInput;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
      ]);
    }
    if (role) {
      whereClause.role = role;
    }
    const users = await prisma.user.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    return {
      users: users,
      pagination: {
        page: page,
        limit: limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
        hasNext: page < Math.ceil(users.length / limit),
        hasPrev: page > 1,
      },
    };
  }
  static async deleteUser(id: number): Promise<User | null> {
    return prisma.user.delete({
      where: { id: id },
    });
  }
  static async countGroupsByUserId(userId: number): Promise<number> {
    return prisma.group.count({
      where: {
        userId: userId,
      },
    });
  }
}
