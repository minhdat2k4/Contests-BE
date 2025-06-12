import path from "path";
import fs from "fs";

export function prepareFileInfoCustom(
  file: Express.Multer.File,
  folderPath: string // Đường dẫn tuyệt đối tới thư mục lưu file
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
  const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "-");
  const fileName = `${Date.now()}-${baseName}${ext}`; // chỉ tên file, không kèm folder
  const tempPath = file.path;
  const destPath = path.join(folderPath, fileName); // path đúng: folder + tên file

  return {
    isValid: true,
    fileName,
    ext: ext.slice(1),
    originalName: baseName,
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
