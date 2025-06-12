import path from "path";
import fs from "fs";
export function prepareFileInfo(
  file: Express.Multer.File,
  allowedExtensions: string[],
  uploadFolder = "uploads"
): {
  isValid: boolean;
  fileName?: string;
  ext?: string;
  originalName?: string;
  tempPath?: string;
  destPath?: string;
  error?: string;
} {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `File "${file.originalname}" không đúng định dạng.`,
    };
  }

  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const tempPath = file.path;
  const destPath = path.join(uploadFolder, fileName);

  return {
    isValid: true,
    fileName,
    ext: ext.slice(1),
    originalName: path.basename(file.originalname, ext),
    tempPath,
    destPath,
  };
}

export function moveUploadedFile(tempPath: string, destPath: string) {
  fs.renameSync(tempPath, destPath);
}

export function deleteFile(path: string) {
  if (fs.existsSync(path)) fs.unlinkSync(path);
}
