import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { logger } from "@/utils/logger";
import { UploadConfig, createImageUploader, UPLOAD_CONFIGS } from "@/middlewares/imageUpload";

// Extended upload config for Sponsors with video support
interface SponsorMediaConfig extends UploadConfig {
  allowedVideoTypes?: RegExp;
  allowedVideoMimeTypes?: RegExp;
  maxVideoSize?: number;
}

// Sponsor media configuration
export const SPONSOR_MEDIA_CONFIG: SponsorMediaConfig = {
  uploadDir: "sponsors",
  filePrefix: "sponsor",
  maxFileSize: 5 * 1024 * 1024, // 5MB for images/logos
  maxVideoSize: 100 * 1024 * 1024, // 100MB for videos
  allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/,
  allowedVideoTypes: /mp4|avi|mov|wmv|flv|webm|mkv/,
  allowedVideoMimeTypes: /^video\/(mp4|avi|quicktime|x-ms-wmv|x-flv|webm|x-matroska)$/,
};

// Temporary upload directory for processing
export const TMP_UPLOAD_DIR = path.join(process.cwd(), "tmp");

// Create temp directory if not exists
const createTempDir = (): void => {
  if (!fs.existsSync(TMP_UPLOAD_DIR)) {
    fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
    logger.info(`Created temp directory: ${TMP_UPLOAD_DIR}`);
  }
};

// Detect media type from file extension
export const detectMediaType = (filename: string): 'image' | 'video' => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  
  if (SPONSOR_MEDIA_CONFIG.allowedTypes?.test(ext)) {
    return 'image';
  } else if (SPONSOR_MEDIA_CONFIG.allowedVideoTypes?.test(ext)) {
    return 'video';
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
};

// Custom storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    createTempDir();
    
    // Determine the upload directory based on field name
    let uploadDir: string;
    const mediaType = detectMediaType(file.originalname);
    
    if (file.fieldname === 'logo') {
      uploadDir = path.join(process.cwd(), "uploads", "sponsors", "logos");
    } else if (file.fieldname === 'images') {
      uploadDir = path.join(process.cwd(), "uploads", "sponsors", "images");
    } else if (file.fieldname === 'videos') {
      uploadDir = path.join(process.cwd(), "uploads", "sponsors", "videos");
    } else {
      uploadDir = path.join(process.cwd(), "uploads", "sponsors");
    }
    
    // Create directory if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info(`Created upload directory: ${uploadDir}`);
    }
    
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    const mediaType = detectMediaType(file.originalname);
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    
    // Generate filename based on field and media type
    let filename: string;
    if (file.fieldname === 'logo') {
      filename = `sponsor-logo-${timestamp}-${random}${ext}`;
    } else if (file.fieldname === 'images') {
      filename = `sponsor-image-${timestamp}-${random}${ext}`;
    } else if (file.fieldname === 'videos') {
      filename = `sponsor-video-${timestamp}-${random}${ext}`;
    } else {
      filename = `sponsor-${mediaType}-${timestamp}-${random}${ext}`;
    }
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  try {
    const mediaType = detectMediaType(file.originalname);
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    // Check if it's an image
    if (mediaType === 'image') {
      if (SPONSOR_MEDIA_CONFIG.allowedTypes?.test(ext) && 
          SPONSOR_MEDIA_CONFIG.allowedMimeTypes?.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
    // Check if it's a video
    else if (mediaType === 'video') {
      if (SPONSOR_MEDIA_CONFIG.allowedVideoTypes?.test(ext) && 
          SPONSOR_MEDIA_CONFIG.allowedVideoMimeTypes?.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
    else {
      cb(null, false);
    }
  } catch (error) {
    cb(null, false);
  }
};

// Create multer instance for sponsors
export const sponsorMediaUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: SPONSOR_MEDIA_CONFIG.maxVideoSize, // Use max video size as the upper limit
    files: 3, // Max 3 files total (1 logo + 1 image + 1 video)
  }
}).fields([
  { name: 'logo', maxCount: 1 },      // Single logo
  { name: 'images', maxCount: 1 },    // Single image
  { name: 'videos', maxCount: 1 }     // Single video
]);

// Process uploaded files and return structured data
export const processSponsorUploads = (files: any): {
  logo?: string;
  images?: string;
  videos?: string;
} => {
  const result: {
    logo?: string;
    images?: string;
    videos?: string;
  } = {};

  if (files) {
    // Process logo (single file)
    if (files.logo && files.logo[0]) {
      const logoFile = files.logo[0];
      result.logo = `/uploads/sponsors/logos/${logoFile.filename}`;
    }

    // Process images (take first image only)
    if (files.images && files.images.length > 0) {
      const imageFile = files.images[0];
      result.images = `/uploads/sponsors/images/${imageFile.filename}`;
    }

    // Process videos (take first video only)
    if (files.videos && files.videos.length > 0) {
      const videoFile = files.videos[0];
      result.videos = `/uploads/sponsors/videos/${videoFile.filename}`;
    }
  }

  return result;
};

// Clean up temporary files
export const cleanupTempFiles = (files: any): void => {
  if (!files) return;

  const allFiles = [
    ...(files.logo || []),
    ...(files.images || []),
    ...(files.videos || [])
  ];

  allFiles.forEach((file: any) => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.info(`Cleaned up temp file: ${file.path}`);
      } catch (error) {
        logger.error(`Failed to clean up temp file: ${file.path}`, error);
      }
    }
  });
};

// Validation helpers
export const validateSponsorMedia = (files: any): string[] => {
  const errors: string[] = [];

  if (files) {
    // Check logo
    if (files.logo && files.logo.length > 1) {
      errors.push("Only one logo file is allowed");
    }

    // Check images count
    if (files.images && files.images.length > 1) {
      errors.push("Only one image file is allowed");
    }

    // Check videos count
    if (files.videos && files.videos.length > 1) {
      errors.push("Only one video file is allowed");
    }

    // Check file sizes
    const allFiles = [
      ...(files.logo || []),
      ...(files.images || []),
      ...(files.videos || [])
    ];

    allFiles.forEach((file: any) => {
      try {
        const mediaType = detectMediaType(file.originalname);
        
        if (mediaType === 'image' && file.size > SPONSOR_MEDIA_CONFIG.maxFileSize!) {
          errors.push(`Image file ${file.originalname} exceeds 5MB limit`);
        } else if (mediaType === 'video' && file.size > SPONSOR_MEDIA_CONFIG.maxVideoSize!) {
          errors.push(`Video file ${file.originalname} exceeds 100MB limit`);
        }
      } catch (error) {
        errors.push(`Invalid file: ${file.originalname}`);
      }
    });
  }

  return errors;
};
