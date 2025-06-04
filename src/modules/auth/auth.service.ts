import { CreateRefreshTokenInput } from "./auth.schema";
import { prisma } from "@/config/database";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";
import {
  generateAccessToken,
  generateRefreshToken,
  JwtPayload,
} from "@/utils/jwt";
export default class AuthService {
  static async findUserByIdentifier(identifier: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }
  static async isPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  static async accessToken(user: Omit<JwtPayload, "type">) {
    return generateAccessToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }
  static async refreshToken(user: Omit<JwtPayload, "type">) {
    return generateRefreshToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }

  static async CreateRefreshToken(data: CreateRefreshTokenInput) {
    return await prisma.refreshToken.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      },
    });
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
    return await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });
  }
  static async isOtpExpired(OtpExpired?: Date): Promise<Boolean> {
    if (!OtpExpired) return true;
    return new Date() > OtpExpired;
  }
  static async isOtpCode(otp: string, otpCode: string): Promise<Boolean> {
    if (!otpCode) return true;
    return otp !== otpCode;
  }
}
