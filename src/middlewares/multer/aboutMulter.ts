import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { CONFIG } from "@/config/environment";
import { logger } from "@/utils/logger";

// Tạo thư mục upload nếu chưa tồn tại
const createUploadDir = (uploadPath: string) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    logger.info(`Created upload directory: ${uploadPath}`);
  }
};

// Cấu hình storage cho About images
const aboutStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadPath = path.join(CONFIG.UPLOAD_DIR, "about");
    createUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Tạo tên file unique với timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `about-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter cho images
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Kiểm tra loại file
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)"));
  }
};

// Middleware upload cho About logo
export const uploadAboutLogo = multer({
  storage: aboutStorage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE, // 5MB
  },
  fileFilter: imageFileFilter,
}).single("logo"); // Tên field trong form

// Middleware upload cho About banner
export const uploadAboutBanner = multer({
  storage: aboutStorage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE, // 5MB
  },
  fileFilter: imageFileFilter,
}).single("banner"); // Tên field trong form

// Middleware upload multiple images cho About
export const uploadAboutImages = multer({
  storage: aboutStorage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE, // 5MB per file
  },
  fileFilter: imageFileFilter,
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 }
]);

// Utility function để xóa file cũ
export const deleteOldFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted old file: ${filePath}`);
    }
  } catch (error) {
    logger.error("Error deleting old file:", { filePath, error });
  }
};

// Utility function để tạo URL đầy đủ cho file
export const getFileUrl = (fileName: string): string => {
  return `/uploads/about/${fileName}`;
};

// Utility function để lấy đường dẫn file đầy đủ
export const getFilePath = (fileName: string): string => {
  return path.join(CONFIG.UPLOAD_DIR, "about", fileName);
};