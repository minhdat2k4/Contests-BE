import { Request, Response } from "express";
import { UserService, CreatUserInput } from "@/modules/user";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { validateData } from "@/middlewares/validation";
import bcrypt from "bcrypt";

export default class UserController {
  static async creatUser(req: Request, res: Response): Promise<void> {
    try {
      const input: CreatUserInput = req.body;
      const existingUserName = await UserService.existingUserName(
        input.username
      );
      if (existingUserName) {
        res.json(validateData("username", "Tên tài khoản đã tồn tại"));
        return;
      }
      const existingEmail = await UserService.existingEmail(input.email);
      if (existingEmail) {
        res.json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const hashPassword = await bcrypt.hash(input.password, 10);
      const user = await UserService.creatUser({
        ...input,
        password: hashPassword,
      });
      res.json(successResponse(user, "Tạo tài khoản thành công"));
      logger.info(`Tạo khoản thành công ${user}`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const user = await UserService.getUserById(Number(id));
      if (!user) {
        throw new Error("Không tìm thấy");
      }
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
