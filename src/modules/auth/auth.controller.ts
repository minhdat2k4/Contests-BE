import AuthService from "./auth.service";
import {
  LoginInput,
  forgotPasswordInput,
  OtpInput,
  ResetPasswordInput,
  RegisterInput,
  ChangePassWordInput,
  ChangeInfoInput,
} from "./auth.schema";
import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { verifyToken, generateAccessToken } from "@/utils/jwt";
import UserService from "../user/user.service";
import { validateData } from "@/middlewares/validation";
import { sendOtp } from "@/utils/email";
import bcrypt from "bcrypt";
import { role } from "@/middlewares/auth";
import { prisma } from "@/config/database";

export default class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const extingUserName = await UserService.existingUserName(input.username);
      if (extingUserName) {
        logger.error(`Tên tài khoản  ${input.username} đã tồn tại`);
        res
          .status(400)
          .json(validateData("username", "Tên tài khoản đã tồn tại"));
        return;
      }
      const extingEmail = await UserService.existingEmail(input.email);
      if (extingEmail) {
        logger.error(`Email ${input.email} đã tồn tại`);
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const { confirmPassword, ...userInput } = input;
      const hashedPassword = await bcrypt.hash(userInput.password, 10);
      const user = await UserService.creatUser({
        ...userInput,
        password: hashedPassword,
      });
      res.json(successResponse(user, "Đăng kí tài khoản thành công"));
      logger.info(`Đăng kí tài khoản thành công ${user}`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const user = await AuthService.findUserByIdentifier(input.identifier);
      if (!user) {
        logger.error(`Tài khoản ${input.identifier} không tồn tại`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không tồn tại"));
        return;
      }
      const isPassword = await AuthService.isPassword(
        input.password,
        user.password
      );
      if (!isPassword) {
        logger.error(`Tài khoản ${input.identifier} nhập sai mật khẩu`);
        res.status(400).json(validateData("password", "Sai mật khẩu "));
        return;
      }
      const tokenData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      const accessToken = await AuthService.accessToken(tokenData);
      const refreshToken = await AuthService.refreshToken(tokenData);
      const updateAccessToken: any = {};
      updateAccessToken.token = accessToken;
      await UserService.UpdateUser(user.id, updateAccessToken);
      const refreshTokenInput = {
        userId: user.id,
        refreshToken: refreshToken,
      };
      const deleterefreshToken = await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      });
      if (!deleterefreshToken) throw new Error("Đăng nhập thất bại");
      await UserService.UpdateUser(user.id, { token: accessToken });
      await AuthService.CreateRefreshToken(refreshTokenInput);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 60 * 1000 * 24, // 30 ngày
      });
      res.json(
        successResponse(
          { role: user.role, accessToken },
          "Đăng nhập thành công"
        )
      );
      logger.info(`${input.identifier} đăng nhập thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng ");
      }
      const userId: number = req.user.userId!;
      await UserService.UpdateUser(userId, { token: "" });
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
      logger.info(`${req.user.username} đăng xuất thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
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
      logger.info(`${payload.username} lấy token mới thành công`);
      res.json({
        success: true,
        message: "Lấy token mới thành công",
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(401).json(errorResponse((error as Error).message));
    }
  }
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: forgotPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
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
      logger.info(` Gửi mã otp cho email ${input.email} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const input: OtpInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
      }
      const isOtpExpired = await AuthService.isOtpExpired(
        user.otpExpiredAt ?? undefined
      );
      if (isOtpExpired) {
        throw new Error("Mã OTP đã hết hạn");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        throw new Error("Mã OTP không chính xác");
      }
      res.json(successResponse(null, "Xác nhận OTP thành công"));
      logger.info(`${user.username} xác nhận otp thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: ResetPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Đổi mật khẩu thất bại");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        throw new Error("Đổi mật khẩu thất bại");
      }
      const data: any = {
        email: input.email,
        otp: input.otp,
        password: input.newPassword,
        otpCode: null,
        otpExpiredAt: null,
      };
      await UserService.UpdateUser(user.id, data);
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`${user.username} đổi mật khẩu thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async profile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const user = req.user;
      logger.info(`Truy cập hồ sơ ${req.user.username} thành công`);
      res.json(
        successResponse({
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
        })
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changePassWord(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangePassWordInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const isPassWord = await AuthService.isPassword(
        input.currentPassword,
        req.user.password
      );
      if (!isPassWord) {
        logger.error(
          `Người dùng ${req.user.username} nhập sai mật khẩu hiện tại`
        );
        res.status(400).json(validateData("currentPassword", "Sai mật khẩu"));
        return;
      }
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await UserService.UpdateUser(req.user.userId, {
        password: hashedPassword,
      });
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`Người dùng ${req.user.username} đổi mật thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changeInfo(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangeInfoInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const extisingEmail = await UserService.existingEmailForUpdate(
        input.email,
        req.user.userId
      );
      if (extisingEmail) {
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      await UserService.UpdateUser(req.user.userId, {
        email: input.email,
      });
      logger.info(`Tài khoản ${req.user.username} thay đổi email thành công`);
      res.json(successResponse(null, "Cập nhật email thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
