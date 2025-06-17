import { Request } from "express";
import { logger } from "@/utils/logger";
import { createImageUploader, UPLOAD_CONFIGS, getFileUrl } from "@/middlewares/imageUpload";

// Sponsor uploader sử dụng config có sẵn
export const sponsorImageUpload = createImageUploader(UPLOAD_CONFIGS.SPONSOR);

// Export middleware upload đơn giản
export const sponsorUploadMiddleware = {
  fields: () => sponsorImageUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "images", maxCount: 1 },
    { name: "videos", maxCount: 1 }
  ])
};

// Process uploaded files và convert thành string URLs đơn giản
export const processSponsorFiles = (files: any): { logo?: string, images?: string, videos?: string } => {
  const result: { logo?: string, images?: string, videos?: string } = {};

  // Logo - 1 file -> 1 string URL
  if (files.logo && files.logo[0]) {
    result.logo = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.logo[0].filename);
  }

  // Images - 1 file -> 1 string URL  
  if (files.images && files.images[0]) {
    result.images = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.images[0].filename);
  }

  // Videos - 1 file -> 1 string URL
  if (files.videos && files.videos[0]) {
    result.videos = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.videos[0].filename);
  }

  return result;
};

// Cleanup files on error
export const cleanupUploadedFiles = (files: any): void => {
  try {
    const allFiles = [
      ...(files.logo || []),
      ...(files.images || []),
      ...(files.videos || [])
    ];

    for (const file of allFiles) {
      if (file.path) {
        const fs = require('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`Cleaned up file: ${file.path}`);
        }
      }
    }
  } catch (error) {
    logger.error("Error cleaning up files:", error);
  }
};
