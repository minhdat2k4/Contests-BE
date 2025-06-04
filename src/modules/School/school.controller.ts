import { Request, Response } from "express";
import {
  SchoolService,
  CreateSchoolInput,
  UpdateShoolInput,
} from "@/modules/School";
import { log } from "console";
import { validateData } from "@/middlewares/validation";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
export default class SchoolController {
  static async createSchool(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateSchoolInput = req.body;
      const existingEmail = await SchoolService.existingEmail(input.email);
      if (existingEmail) {
        res.json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const existingPhone = await SchoolService.existingPhone(input.phone);
      if (existingPhone) {
        res.json(validateData("phone", "Số điện thoại đã tồn tại"));
        return;
      }
      const school = await SchoolService.createSchool(input);
      if (!school) {
        throw new Error("Thêm trường thất bại");
      }
      logger.info(`Thêm trường ${input.name} thành công`);
      res.json(successResponse(school, "Thêm trường thành công"));
    } catch (error) {
      log((error as Error).message);
      res.status(400).json({ error: (error as Error).message });
    }
  }
  static async getSchoolById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }
      logger.info(`Lấy thông tin trường ${school.name} thành công`);
      res.json(
        successResponse(
          school,
          `Lấy thông tin trường ${school.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateShool(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateShoolInput = req.body;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }
      if (input.email) {
        const existingEmail = await SchoolService.existingEmail(input.email);
        if (existingEmail) {
          res.json(validateData("email", "Email đã tồn tại"));
          return;
        }
      }
      if (input.phone) {
        const existingPhone = await SchoolService.existingPhone(input.phone);
        if (existingPhone) {
          res.json(validateData("phone", "Số điện thoại đã tồn tại"));
          return;
        }
      }
      const schoolUpdate = await SchoolService.updateSchool(Number(id), input);
      if (!schoolUpdate) {
        throw new Error("Cập nhật trường thất bại ");
      }
      res.json(
        successResponse(
          schoolUpdate,
          `Cập nhật thông tin trường  ${school.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
