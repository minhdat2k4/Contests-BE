import { Request, Response } from "express";
import path from "path";
import {
  ClassVideoService,
  CreateClassVideoInput,
  UpdateClassVideoInput,
} from "@/modules/classVideo";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import { Contestervice } from "@/modules/contest";

import {
  prepareFileInfoCustom,
  moveUploadedFile,
  deleteFile,
  ensureFolderExists,
} from "@/utils/uploadFile";

export default class ClassVideoController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await Contestervice.getBy({ slug: slug });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");

      const ClassVideos = await ClassVideoService.getAll(contest.id);

      if (!ClassVideos) {
        throw new Error("Không tìm thấy ClassVideo nào");
      }

      logger.info(`Lấy danh sách ClassVideo thành công`);
      res.json(
        successResponse(ClassVideos, "Lấy danh sách ClassVideo thành công")
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const ClassVideo = await ClassVideoService.getBy({ id: Number(id) });
      if (!ClassVideo) {
        throw new Error("Không tìm thấy ClassVideo ");
      }
      logger.info(`Lấy thông tin ClassVideo thành công`);
      res.json(
        successResponse(ClassVideo, `Lấy thông tin ClassVideo thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<CreateClassVideoInput, "videos" | "contestId"> =
        req.body;

      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({
        where: { slug },
      });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const classEx = await prisma.class.findFirst({
        where: { id: Number(input.classId) },
      });

      if (!classEx) throw new Error(`Không tìm thấy lớp học`);

      if (!req.file) throw new Error(`Vui lòng upload file`);
      const file = req.file;

      // Đường dẫn đích (nơi lưu file sau khi move)
      const folderPath = path.resolve(process.cwd(), "uploads", "ClassVideo");

      // Thông tin file sau khi upload tạm
      const info = prepareFileInfoCustom(file, folderPath);

      const data = {
        videos: `/uploads/ClassVideo/${info.fileName}`,
        name: input.name,
        slogan: input.slogan,
        classId: classEx.id,
        contestId: contest.id,
      };

      const classVideo = await ClassVideoService.create(data);
      if (!classVideo) {
        throw new Error(`Thêm video lớp học thất bại`);
      }

      // Di chuyển file từ thư mục tạm sang thư mục chính
      await moveUploadedFile(info.tempPath!, info.destPath!);

      logger.info(`Thêm video lớp học thành công`);
      res.json(successResponse(classVideo, `Thêm video lớp học thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const ClassVideo = await ClassVideoService.getBy({ id: Number(id) });
      if (!ClassVideo) {
        throw new Error("Không tìm thấy video lớp học");
      }
      const deleteClassVideo = await ClassVideoService.delete(ClassVideo.id);
      if (!deleteClassVideo) {
        throw new Error(`Xóa video lớp học thất bại`);
      }
      logger.info(`Xóa video lớp học thành công`);
      await deleteFile(ClassVideo.videos);
      res.json(successResponse(null, `Xóa video lớp học thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<UpdateClassVideoInput, "videos"> = req.body;
      const id = Number(req.params.id);

      const ClassVideoContest = await ClassVideoService.getBy({ id });
      if (!ClassVideoContest) throw new Error("Không tìm thấy video lớp học");

      const classEx = await prisma.class.findFirst({
        where: { id: input.classId },
      });
      if (!classEx) throw new Error(`Không tìm thấy lớp học`);

      let newUrl: string | undefined;

      if (req.file) {
        const folderPath = path.resolve(process.cwd(), "uploads", "ClassVideo");
        await ensureFolderExists(folderPath);
        const info = prepareFileInfoCustom(req.file, folderPath);
        await moveUploadedFile(info.tempPath!, info.destPath!);
        newUrl = `/uploads/ClassVideo/${info.fileName}`;
      }
      const data: UpdateClassVideoInput = {
        name: input.name,
        slogan: input.slogan,
        classId: input.classId,
      };

      if (newUrl) {
        data.videos = newUrl;
      }

      const updated = await ClassVideoService.update(id, data);
      if (!updated) throw new Error("Cập nhật video lớp học thất bại ");

      if (newUrl && ClassVideoContest.videos) {
        await deleteFile(ClassVideoContest.videos);
      }

      console.log(ClassVideoContest);

      logger.info("Cập nhật video lớp học thành công");
      res.json(successResponse(updated, "Cập nhật video lớp học thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deletes(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const ClassVideo = await ClassVideoService.getBy({ id: Number(id) });

        console.log("ClassVideo", ClassVideo);

        if (!ClassVideo) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy ClassVideo với ID = ${id}`,
          });
          continue;
        }
        const deleted = await ClassVideoService.delete(ClassVideo.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa video lớp học thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa video lớp học thành công`,
        });
        logger.info(`Xóa video lớp học thành công`);
        await deleteFile(ClassVideo.videos);
      }
      res.json({
        success: true,
        messages,
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ClassVideosByContestSlug(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { slug } = req.params;
      const contest = await prisma.contest.findUnique({
        where: { slug },
      });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const classVideos = await prisma.classVideo.findMany({
        where: { contestId: contest.id },
        select: {
          id: true,
          name: true,
          videos: true,
        },
      });

      if (!classVideos) {
        throw new Error("Không tìm thấy video lớp học nào cho cuộc thi này");
      }

      res.json(
        successResponse(classVideos, "Lấy danh sách video lớp học thành công")
      );
    } catch (error) {
      logger.error("Error fetching class videos by contest slug:", error);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
