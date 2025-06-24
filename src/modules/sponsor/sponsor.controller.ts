import { Request, Response } from "express";
import { SponsorService } from "./sponsor.service";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import { successResponse, errorResponse } from "@/utils/response";
import {
  CreateSponsorData,
  UpdateSponsorData,
  GetSponsorsQuery,
  BatchDeleteSponsorsData,
  UploadResult
} from "./sponsor.schema";
import { 
  getFileUrl, 
  getFileNameFromUrl, 
  deleteFile, 
  getFilePath 
} from "@/middlewares/imageUpload";
import { 
  processSponsorFiles, 
  cleanupUploadedFiles 
} from "./sponsor.upload";

export class SponsorController {
  private sponsorService: SponsorService;

  constructor() {
    this.sponsorService = new SponsorService();
  }

  /**
   * Get sponsors with pagination and filtering
   */
  async getSponsors(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters with defaults
      const query: GetSponsorsQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        contestId: req.query.contestId ? parseInt(req.query.contestId as string) : undefined,
        sortBy: (req.query.sortBy as "createdAt" | "updatedAt" | "name") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc"
      };

      const result = await this.sponsorService.getSponsors(query);

      logger.info(`Retrieved ${result.sponsors.length} sponsors`);
      res.json(successResponse(result, "Lấy danh sách nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in getSponsors controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get sponsor by ID
   */
  async getSponsorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sponsor = await this.sponsorService.getSponsorById(Number(id));

      logger.info(`Retrieved sponsor: ${sponsor.id}`);
      res.json(successResponse(sponsor, "Lấy thông tin nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in getSponsorById controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get sponsors by contest slug
   */
  async getSponsorsByContestSlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const sponsors = await this.sponsorService.getSponsorsByContestSlug(slug);

      logger.info(`Retrieved ${sponsors.length} sponsors for contest ${slug}`);
      res.json(successResponse(sponsors, "Lấy nhà tài trợ theo contest thành công"));
    } catch (error) {
      logger.error("Error in getSponsorsByContestSlug controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
  /**
   * Create new sponsor
   */
  async createSponsor(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateSponsorData = req.body;
      
      // Process uploaded files if any
      let uploadedFiles = {};
      if (req.files) {
        uploadedFiles = processSponsorFiles(req.files);
      }
      
      // Merge uploaded files with request data
      const sponsorData = {
        ...data,
        ...uploadedFiles
      };

      const sponsor = await this.sponsorService.createSponsor(sponsorData);

      logger.info(`Sponsor created successfully: ${sponsor.id}`);
      res.status(201).json(successResponse(sponsor, "Tạo nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in createSponsor controller:", error);
      
      // Cleanup uploaded files on error
      if (req.files) {
        cleanupUploadedFiles(req.files);
      }
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }  /**
   * Create sponsor by contest slug
   */
  async createSponsorByContestSlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const data: CreateSponsorData = req.body;
      
      // Process uploaded files if any
      let uploadedFiles = {};
      if (req.files) {
        uploadedFiles = processSponsorFiles(req.files);
      }
      
      // Merge uploaded files with request data
      const sponsorData = {
        ...data,
        ...uploadedFiles
      };

      const sponsor = await this.sponsorService.createSponsorByContestSlug(slug, sponsorData);

      logger.info(`Sponsor created for contest ${slug}: ${sponsor.id}`);
      res.status(201).json(successResponse(sponsor, "Tạo nhà tài trợ cho contest thành công"));
    } catch (error) {
      logger.error("Error in createSponsorByContestSlug controller:", error);
      
      // Cleanup uploaded files on error
      if (req.files) {
        cleanupUploadedFiles(req.files);
      }
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
  /**
   * Update sponsor (PATCH method)
   */
  async updateSponsor(req: Request, res: Response): Promise<void> {    try {
      const { id } = req.params;
      const data: UpdateSponsorData = req.body;
      
      // Debug log
      logger.info(`Update sponsor ${id} - Request data:`, {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'no files'
      });
      
      // Process uploaded files if any
      let uploadedFiles = {};
      if (req.files) {
        uploadedFiles = processSponsorFiles(req.files);
      }
        // Handle file removal flags
      const processedData = { ...data };
      
      // If removeLogo is true, set logo to null
      if (data.removeLogo === true) {
        logger.info(`Removing logo for sponsor ${id}`);
        (processedData as any).logo = null;
        delete processedData.removeLogo;
      }
      
      // If removeImages is true, set images to null
      if (data.removeImages === true) {
        logger.info(`Removing images for sponsor ${id}`);
        (processedData as any).images = null;
        delete processedData.removeImages;
      }
      
      // If removeVideos is true, set videos to null
      if (data.removeVideos === true) {
        logger.info(`Removing videos for sponsor ${id}`);
        (processedData as any).videos = null;
        delete processedData.removeVideos;
      }
      
      // Merge uploaded files with processed data
      const updateData = {
        ...processedData,
        ...uploadedFiles
      };
      
      logger.info(`Update sponsor ${id} - Final update data:`, updateData);
      
      // Check if at least one field is provided
      if (Object.keys(updateData).length === 0) {
        res.status(400).json(errorResponse("Ít nhất một trường cần được cập nhật", ERROR_CODES.VALIDATION_ERROR));
        return;
      }

      const sponsor = await this.sponsorService.updateSponsor(Number(id), updateData);

      logger.info(`Sponsor updated successfully: ${sponsor.id}`);
      res.json(successResponse(sponsor, "Cập nhật nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in updateSponsor controller:", error);
      
      // Cleanup uploaded files on error
      if (req.files) {
        cleanupUploadedFiles(req.files);
      }
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Hard delete sponsor
   */
  async deleteSponsor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Get sponsor for file cleanup
      const sponsor = await this.sponsorService.getSponsorById(Number(id));
      
      await this.sponsorService.deleteSponsor(Number(id));

      // Clean up associated files
      this.cleanupSponsorFiles(sponsor);

      logger.info(`Sponsor deleted: ${id}`);
      res.json(successResponse(null, "Xóa nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in deleteSponsor controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Batch delete sponsors
   */
  async batchDeleteSponsors(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteSponsorsData = req.body;
      
      // Get sponsors for file cleanup
      const sponsorsToDelete = await Promise.all(
        data.ids.map(async (id) => {
          try {
            return await this.sponsorService.getSponsorById(id);
          } catch {
            return null;
          }
        })
      );

      const result = await this.sponsorService.batchDeleteSponsors(data.ids);

      // Clean up files for successfully deleted sponsors
      sponsorsToDelete.forEach((sponsor, index) => {
        if (sponsor && result.successIds.includes(data.ids[index])) {
          this.cleanupSponsorFiles(sponsor);
        }
      });

      const { successIds, failedIds } = result;

      if (failedIds.length === 0) {
        logger.info(`Batch delete successful: ${successIds.length} sponsors deleted`);
        res.json(successResponse(result, `Xóa thành công ${successIds.length} nhà tài trợ`));
      } else if (successIds.length === 0) {
        logger.warn(`Batch delete failed: All ${failedIds.length} sponsors failed to delete`);
        res.status(400).json(errorResponse(`Không thể xóa bất kỳ nhà tài trợ nào`, ERROR_CODES.VALIDATION_ERROR));
      } else {
        logger.info(`Batch delete partial success: ${successIds.length} success, ${failedIds.length} failed`);
        res.status(207).json(successResponse(result, `Batch delete hoàn thành: ${successIds.length}/${data.ids.length} thành công, ${failedIds.length} thất bại`));
      }
    } catch (error) {
      logger.error("Error in batchDeleteSponsors controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get sponsors statistics
   */
  async getSponsorsStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.sponsorService.getSponsorsStatistics();

      logger.info("Retrieved sponsors statistics");
      res.json(successResponse(statistics, "Lấy thống kê nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in getSponsorsStatistics controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Upload media files for sponsor
   */
  async uploadSponsorMedia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || Object.keys(files).length === 0) {
        res.status(400).json(errorResponse("Không có file nào được upload", ERROR_CODES.VALIDATION_ERROR));
        return;
      }

      // Get existing sponsor for cleanup
      const existingSponsor = await this.sponsorService.getSponsorById(Number(id));
      
      const uploadedUrls = this.processUploadedFiles(files);
      const sponsor = await this.sponsorService.updateSponsorMedia(Number(id), uploadedUrls);

      // Clean up old files
      this.cleanupOldFiles(existingSponsor, uploadedUrls);

      logger.info(`Sponsor media uploaded: ${sponsor.id}`);
      res.json(successResponse(sponsor, "Upload media nhà tài trợ thành công"));
    } catch (error) {
      logger.error("Error in uploadSponsorMedia controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Process uploaded files and return URLs
   */
  private processUploadedFiles(files: { [fieldname: string]: Express.Multer.File[] }): UploadResult {
    const result: UploadResult = {};

    if (files?.logo?.[0]) {
      result.logo = getFileUrl("sponsors", files.logo[0].filename);
    }

    if (files?.images?.[0]) {
      result.images = getFileUrl("sponsors", files.images[0].filename);
    }

    if (files?.videos?.[0]) {
      result.videos = getFileUrl("sponsors", files.videos[0].filename);
    }

    return result;
  }

  /**
   * Clean up old files when updating
   */
  private cleanupOldFiles(existingSponsor: any, newUrls: UploadResult): void {
    try {
      if (newUrls.logo && existingSponsor.logo) {
        const oldFileName = getFileNameFromUrl(existingSponsor.logo);
        if (oldFileName) {
          const oldFilePath = getFilePath("sponsors", oldFileName);
          deleteFile(oldFilePath);
        }
      }

      if (newUrls.images && existingSponsor.images) {
        const oldFileName = getFileNameFromUrl(existingSponsor.images);
        if (oldFileName) {
          const oldFilePath = getFilePath("sponsors", oldFileName);
          deleteFile(oldFilePath);
        }
      }

      if (newUrls.videos && existingSponsor.videos) {
        const oldFileName = getFileNameFromUrl(existingSponsor.videos);
        if (oldFileName) {
          const oldFilePath = getFilePath("sponsors", oldFileName);
          deleteFile(oldFilePath);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up old files:", error);
    }
  }

  /**
   * Clean up all files for a sponsor
   */
  private cleanupSponsorFiles(sponsor: any): void {
    try {
      if (sponsor.logo) {
        const fileName = getFileNameFromUrl(sponsor.logo);
        if (fileName) {
          const filePath = getFilePath("sponsors", fileName);
          deleteFile(filePath);
        }
      }

      if (sponsor.images) {
        const fileName = getFileNameFromUrl(sponsor.images);
        if (fileName) {
          const filePath = getFilePath("sponsors", fileName);
          deleteFile(filePath);
        }
      }

      if (sponsor.videos) {
        const fileName = getFileNameFromUrl(sponsor.videos);
        if (fileName) {
          const filePath = getFilePath("sponsors", fileName);
          deleteFile(filePath);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up sponsor files:", error);
    }
  }
}
