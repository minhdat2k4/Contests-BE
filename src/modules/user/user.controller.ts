import { Request, Response } from "express";
import { UserService, CreateUserInput, UpdateUserInput } from "@/modules/user";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { validateData } from "@/middlewares/validation";
import bcrypt from "bcrypt";
import { role } from "@/middlewares/auth";

export default class UserController {
  static async creatUser(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateUserInput = req.body;
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
      const data: any = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      };
      res.json(successResponse(data, "Tạo tài khoản thành công"));
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
        throw new Error("Không tìm thấy người dùng");
      }
      const data: any = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      };
      logger.info(`Lấy thông tin người thành công ${user}`);
      res.json(successResponse(data, "Lấy thông tin người dùng thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async UpdateUser(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateUserInput = req.body;
      const user = await UserService.getUserById(Number(id));
      if (input.email) {
        const existingEmail = await UserService.existingEmailForUpdate(
          input.email,
          Number(id)
        );
        if (existingEmail) {
          res.json(validateData("email", "Email này đã tồn tại"));
        }
      }
      if (!user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const userUpdate = await UserService.UpdateUser(user.id, input);
      if (!userUpdate) {
        throw new Error("Cập nhật thất bại ");
      }
      const data: any = {
        id: userUpdate.id,
        username: userUpdate.username,
        email: userUpdate.email,
        role: userUpdate.role,
        isActive: userUpdate.isActive,
      };
      res.json(successResponse(data, "Cập nhật tài khoản thành công"));
      logger.info(`Cập nhật ${user.username} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const user = await UserService.getUserById(Number(id));
      if (!user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const updated = await UserService.UpdateUser(user.id, {
        isAcitve: !user.isActive,
      });
      if (!updated) {
        throw new Error("Cập nhật trạng thái thất bại");
      }
      const data = {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
      };
      res.json(
        successResponse(data, "Cập nhật trạng thái hoạt động thành công")
      );
      logger.info(`Cập nhật trạng thái hoạt động ${user.username} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
