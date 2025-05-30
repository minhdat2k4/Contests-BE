import AuthService from "./auth.service";
import { LoginInput } from "./auth.schema";
import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import request from "supertest";
export default class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const data: LoginInput = req.body;
      const result = await AuthService.login(data);
      if (result) {
        logger.info(`Đăng nhập thành công`);
        res.cookie("accessToken", result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 1000 * 60 * 60,
        });
        res.json({
          success: true,
          message: `Đăng nhập thành công`,
          data: result,
        });
      }
    } catch (error) {
      res.status(400).json(error);
    }
  }
  static async logout(req: Request, res: Response) {
    try {
      const userId: number = req.user.id;
      await AuthService.logout(userId);
      res.clearCookie("accessToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.json({
        success: true,
        message: "Đăng xuất thành công",
      });
    } catch (error) {
      res.status(400).json(error);
    }
  }
}
