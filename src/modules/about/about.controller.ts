import AboutService from "./about.service";
import { CreateAboutInput, UpdateAboutInput, AboutQueryInput, AboutIdInput } from "./about.schema";
import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { successResponse, paginatedResponse } from "@/utils/response";

export default class AboutController {

  /**
   * Create new about information
   */
  static async createAbout(req: Request, res: Response) {
    try {
      const data: CreateAboutInput = req.body;
      const result = await AboutService.createAbout(data);

      logger.info("About information created successfully via API", { aboutId: result.id });

      res.status(201).json(successResponse(
        result,
        "Tạo thông tin giới thiệu thành công"
      ));
    } catch (error) {
      logger.error("Failed to create about information via API", { error, body: req.body });
      res.status(400).json(error);
    }
  }

  /**
   * Get all about information with pagination
   */  static async getAllAbout(req: Request, res: Response) {
    try {
      // Validate and transform query parameters
      const validatedQuery: AboutQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined
      };

      const { aboutList, pagination } = await AboutService.getAllAbout(validatedQuery);

      logger.info("About information list retrieved successfully via API", {
        count: aboutList.length,
        page: pagination.page
      });

      res.status(200).json(paginatedResponse(
        aboutList,
        pagination,
        "Lấy danh sách thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      logger.error("Failed to get about information list via API", { error, query: req.query });

      if (error.success === false) {
        res.status(400).json(error);
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi hệ thống khi lấy danh sách thông tin giới thiệu",
          error: error.message
        });
      }
    }
  }

  /**
   * Get about information by ID
   */  static async getAboutById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          error: "Invalid ID format"
        });
      }

      const result = await AboutService.getAboutById(id);

      logger.info("About information retrieved successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Lấy thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      logger.error("Failed to get about information via API", { error, id: req.params.id });

      if (error.success === false) {
        if (error.message === "Không tìm thấy thông tin giới thiệu") {
          res.status(404).json(error);
        } else {
          res.status(400).json(error);
        }
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi hệ thống khi lấy thông tin giới thiệu",
          error: error.message
        });
      }
    }
  }

  /**
   * Update about information
   */  static async updateAbout(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          error: "Invalid ID format"
        });
      }

      const data: UpdateAboutInput = req.body;
      const result = await AboutService.updateAbout(id, data);

      logger.info("About information updated successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Cập nhật thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      logger.error("Failed to update about information via API", {
        error,
        id: req.params.id,
        body: req.body
      });

      if (error.success === false) {
        if (error.message === "Không tìm thấy thông tin giới thiệu để cập nhật") {
          res.status(404).json(error);
        } else {
          res.status(400).json(error);
        }
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi hệ thống khi cập nhật thông tin giới thiệu",
          error: error.message
        });
      }
    }
  }

  /**
   * Delete about information (soft delete)
   */
  static async deleteAbout(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          error: "Invalid ID format"
        });
      }
      const result = await AboutService.deleteAbout(id);

      logger.info("About information deleted successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Xóa thông tin giới thiệu thành công"
      ));
    } catch (error : any) {
      logger.error("Failed to delete about information via API", { error, id: req.params.id });

      if (error.message === "Không tìm thấy thông tin giới thiệu để xóa") {
        res.status(404).json(error);
      } else {
        res.status(400).json(error);
      }
    }
  }

  /**
   * Restore deleted about information
   */
  static async restoreAbout(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          error: "Invalid ID format"
        });
      }

      const result = await AboutService.restoreAbout(id);

      logger.info("About information restored successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Khôi phục thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      logger.error("Failed to restore about information via API", { error, id: req.params.id });

      if (error.message === "Không tìm thấy thông tin giới thiệu để khôi phục") {
        res.status(404).json(error);
      } else {
        res.status(400).json(error);
      }
    }
  }

  /**
   * Permanently delete about information
   */
  static async permanentDeleteAbout(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id!);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          error: "Invalid ID format"
        });
      }
      const result = await AboutService.permanentDeleteAbout(id);

      logger.info("About information permanently deleted successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Xóa vĩnh viễn thông tin giới thiệu thành công"
      ));
    } catch (error : any) {
      logger.error("Failed to permanently delete about information via API", {
        error,
        id: req.params.id
      });

      if (error.message === "Không tìm thấy thông tin giới thiệu để xóa vĩnh viễn") {
        res.status(404).json(error);
      } else {
        res.status(400).json(error);
      }
    }
  }
}
