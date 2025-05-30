import {
  LoginInput,
  ChangePasswordInput,
  RegisterSchema,
  ResetPasswordInput,
} from "./auth.schema";
import { prisma } from "@/config/database";
import bcrypt from "bcrypt";
import { generateAccessToken } from "@/utils/jwt";
import { logger } from "@/utils/logger";
import { validateData } from "@/middlewares/validation";
export default class AuthService {
  static async login(data: LoginInput) {
    const { identifier, password } = data;
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          password: true,
        },
      });
      if (!user) {
        logger.error("Đăng nhập thất bại", {
          email: identifier,
          reason: "Tài khoản không tồn tại",
        });
        throw validateData("identifier", "Tài khoản không tồn tại");
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        logger.error("Đăng nhập thất bại", {
          email: identifier,
          reason: "Mật khẩu không đúng",
        });
        throw validateData("password", "Mật khẩu không đúng ");
      }
      const accessToken = generateAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { token: accessToken },
      });
      logger.info("Đăng nhập thành công", {
        email: user.email,
        username: user.username,
      });
      return {
        email: user.email,
        username: user.username,
        role: user.role,
        accessToken,
      };
    } catch (error) {
      throw error;
    }
  }
  static async logout(userId: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        logger.error("Đăng xuất thất bại - Người dùng không tồn tại", {
          userId,
        });
        throw new Error("Người dùng không tồn tại");
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { token: null },
        });
      }
    } catch (error) {
      throw error;
    }
  }
}
