import {
  LoginInput,
  ChangePasswordInput,
  RegisterSchema,
  ResetPasswordInput,
  CreateRefreshTokenInput,
} from "./auth.schema";
import { prisma } from "@/config/database";
import { RefreshToken, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateAccessToken } from "@/utils/jwt";
import { logger } from "@/utils/logger";
import { validateData } from "@/middlewares/validation";
import { generateRefreshToken } from "../../utils/jwt";
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

      // Check password
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

      logger.info("Đăng nhập thành công", {
        email: user.email,
        username: user.username,
      });
      const refreshToken = await AuthService.CreateRefreshToken(user);
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        accessToken,
        refreshToken,
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
  //  Long-create-refesh-Token
  static async CreateRefreshToken(data: CreateRefreshTokenInput) {
    try {
      const refreshToken = generateRefreshToken({
        userId: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
      });
      await prisma.refreshToken.create({
        data: {
          userId: data.id,
          refreshToken: refreshToken,
          expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
        },
      });
      logger.info(`Tạo refresh token thành công `);
      return refreshToken;
    } catch (error) {
      logger.error("Tạo refresh token thất bại", { error });
      throw error;
    }
  }
  static async getRefreshtokenByUseridToken(id: number, token: string) {
    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId: id,
        refreshToken: token,
      },
    });
    return refreshToken;
  }
  static async deleteRefreshToken(id: number) {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId: id },
      });
    } catch (error) {
      error;
    }
  }
}
