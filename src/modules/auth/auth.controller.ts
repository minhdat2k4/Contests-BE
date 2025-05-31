import AuthService from "./auth.service";

import { LoginInput, ResetPasswordInput, OtpInput } from "./auth.schema";
import { json, Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { verifyToken, generateAccessToken } from "@/utils/jwt";
import UserService from "../user/user.service";
import { validateData } from "@/middlewares/validation";
import { sendOtp } from "@/utils/email";
export default class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginInput = req.body;
      const result = await AuthService.login(data);
      if (!result) {
        res.json(errorResponse("Đăng nhập không thành công"));
      }
      const updateAccessToken: any = {};
      updateAccessToken.token = result.accessToken;
      await UserService.UpdateUser(result.id, updateAccessToken);
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60,
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 60 * 100 * 24, //30 ngày
      });
      res.json(successResponse({ result }, "Đăng nhập thành công"));
      logger.info(`Đăng nhập thành công`);
    } catch (error) {
      res.status(400).json(error);
    }
  }
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng ");
      }
      const userId: number = req.user.userId!;
      await AuthService.logout(userId);
      await AuthService.deleteRefreshToken(userId);
      res.clearCookie("accessToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      res.json({
        success: true,
        message: "Đăng xuất thành công",
      });
    } catch (error) {
      res.json(errorResponse((error as Error).message));
    }
  }
  static async refreshAccToken(req: Request, res: Response): Promise<void> {
    try {
      const token: string = req.cookies.refreshToken;
      if (!token) {
        throw new Error("Không tìm thấy refreshtoken");
      }
      const payload = verifyToken(token);
      if (payload.type != "refresh") {
        throw new Error("Sai loại token");
      }
      const refreshtoken = await AuthService.getRefreshtokenByUseridToken(
        payload.userId,
        token
      );
      if (!refreshtoken || new Date(refreshtoken.expiredAt) < new Date()) {
        throw new Error("Token hết hạn");
      }
      const { userId, email, role, username } = payload;
      const newPayLoad = { userId, email, role, username };
      const newAccessToken = generateAccessToken(newPayLoad);
      const data: any = {};
      data.token = newAccessToken;
      await UserService.UpdateUser(userId, data);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 1000 * 60,
        secure: process.env.NODE_ENV === "production",
      });
      res.json({
        success: true,
        message: "Lấy token mới thành công",
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: (error as Error).message || "Có lỗi xảy ra",
      });
    }
  }
  static async forgotpassword(req: Request, res: Response) {
    try {
      const input: ResetPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        res.json(validateData("email", "Không tìm thấy tài khoản"));
        return;
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000);
      const data: any = {
        otpCode: otp,
        otpExpiredAt: expiredAt,
      };
      await UserService.UpdateUser(user.id, data);
      await sendOtp({
        to: user.email,
        subject: "Mã OTP đặt lại mật khẩu",
        html: `
          <p>Xin chào ${user.username},</p>
          <p>Mã xác thực của bạn là:</p>
          <h2>${otp}</h2>
          <p>Mã có hiệu lực trong 5 phút.</p>
        `,
      });

      res.json({
        success: true,
        message: "Gửi mã xác thực thành công",
      });
    } catch (error) {
      res.status(400).json({
        susscess: false,
        message: error,
      });
    }
  }
  static async verifyOtp(req: Request, res: Response) {
    try {
      const otp: OtpInput = req.body;
      const user = await UserService.getUserByEmail(otp.email);
      if (!user) {
        res.json(validateData("email", "Không tìm thấy tài khoản"));
        return;
      }
      if (!user.otpExpiredAt || new Date() > user.otpExpiredAt) {
        throw new Error("Mã OTP đã hết hạn");
      }

      if (!user.otpCode || String(otp.otp) !== user.otpCode) {
        throw new Error("Mã OTP không chính xác");
      }
      res.json(successResponse(null, "Xác nhận OTP thành công"));
    } catch (error) {
      res.json(errorResponse((error as Error).message));
    }
  }
}
