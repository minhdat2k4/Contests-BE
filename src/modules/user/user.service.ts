import { User } from "@prisma/client";
import { prisma } from "@/config/database";

export default class UserService {
  static async getUserById(id: number) {
    const user: Omit<User, "password"> | null = await prisma.user.findFirst({
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
}
