import { Request, Response } from "express";
import {
  CreateStudentInput,
  StudentService,
  StudentQueryInput,
} from "@/modules/student";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import {
  prepareFileInfoCustom,
  ensureFolderExists,
  deleteFile,
  moveUploadedFile,
} from "@/utils/uploadFile";
import path from "path";
export default class StudentController {
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const student = await StudentService.getStudentBy({ id: Number(id) });
      if (!student) {
        throw new Error("Không tìm thấy sinh viên");
      }
      const updateStudent = await StudentService.updateStudent(Number(id), {
        isActive: !student.isActive,
      });
      if (!updateStudent) {
        throw new Error("Cập nhật trạng thái sinh viên  thất bại");
      }
      logger.info(
        `Cập nhật trạng thái sinh viên  ${updateStudent.fullName} thành công`
      );
      res.json(
        successResponse(
          updateStudent,
          `Cập nhật trạng thái sinh viên ${updateStudent.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteStudent(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const student = await StudentService.getStudentBy({ id: Number(id) });
      if (!student) {
        throw new Error("Không tìm thấy sinh viên ");
      }
      const countContestant = await StudentService.countContestantStudentId(
        Number(id)
      );
      if (countContestant > 0) {
        throw new Error(
          `Sinh viên này hiện đang tham gia ${countContestant} cuộc thi không thể xóa`
        );
      }
      const deleteStudent = await StudentService.deleteStudent(Number(id));
      if (!deleteStudent) {
        throw new Error(`Xóa sinh viên ${student.fullName} thất bại `);
      }
      await deleteFile(student?.avatar);
      logger.info(`Xóa sinh viên ${student.fullName} thành công`);
      res.json(
        successResponse(null, `Xóa sinh viên ${student.fullName} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateStudent(req: Request, res: Response): Promise<void> {
    try {
      const input: any = req.body || {};
      const id = Number(req.params.id);

      const existing = await StudentService.getStudentBy({ id: id });
      if (!existing) throw new Error("Không tìm thấy sinh viên");

      if (input.classId) {
        const classExists = await prisma.class.findFirst({
          where: { id: Number(input.classId) },
        });
        if (!classExists) throw new Error("Không tìm thấy lớp học");
        input.classId = classExists.id;
      }

      // Xử lý file upload nếu có
      let newUrl: string | undefined | null;
      if (req.file) {
        const folderPath = path.resolve(process.cwd(), "uploads", "Student");
        await ensureFolderExists(folderPath);
        const info = prepareFileInfoCustom(req.file, folderPath);
        await moveUploadedFile(info.tempPath!, info.destPath!);
        newUrl = `/uploads/Student/${info.fileName}`;
      }

      if (input.isAvatarDeleted) newUrl = null;
      const data: any = {};

      if (input.fullName) data.fullName = input.fullName;
      if (input.classId) data.classId = Number(input.classId);
      if (input.studentCode) data.studentCode = input.studentCode;
      if (typeof input.isActive !== "undefined") {
        data.isActive = input.isActive === "true" || input.isActive === true;
      }
      if (input.bio) data.bio = input.bio;
      if (input.userId) data.userId = Number(input.userId);
      if (typeof newUrl !== "undefined") {
        data.avatar = newUrl;
        await deleteFile(existing.avatar);
      }

      const updated = await StudentService.updateStudent(id, data);
      if (!updated) throw new Error("Cập nhật sinh viên thất bại");

      if (newUrl && existing.avatar) {
        await deleteFile(existing.avatar);
      }

      logger.info("Cập nhật sinh viên thành công");
      res.json(successResponse(updated, "Cập nhật sinh viên thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getStudentById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const student = await StudentService.getStudentBy({ id: Number(id) });
      if (!student) {
        throw new Error("Không tìm thấy sinh viên ");
      }
      logger.info(`Lấy thông tin sinh viên ${student.fullName} thành công`);
      res.json(
        successResponse(
          student,
          `Lấy thông tin sinh viên ${student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: StudentQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        classId: parseInt(req.query.classId as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await StudentService.getAllStudent(query);
      if (!data) {
        throw new Error("Không tìm thấy sinh viên ");
      }
      logger.info(`Lấy danh sách sinh viên thành công`);
      res.json(
        successResponse(
          { students: data.students, pagination: data.pagination },
          "Lấy danh sinh viên thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async createStudent(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<CreateStudentInput, "avatar"> = req.body;
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

      if (!classEx) {
        throw new Error("Không tìm thấy lớp học");
      }

      // Kiểm tra userId đã có thí sinh chưa
      const existingStudent = await prisma.student.findFirst({
        where: {
          userId: Number(input.userId),
        },
      });

      if (existingStudent) {
        throw new Error("Tài khoản này đã có thí sinh");
      }

      let avatarPath: string | undefined;

      if (req.file) {
        const file = req.file;
        const folderPath = path.resolve(process.cwd(), "uploads", "Student");

        // Xử lý file
        const info = prepareFileInfoCustom(file, folderPath);
        avatarPath = `/uploads/Student/${info.fileName}`;

        // Di chuyển file từ thư mục tạm sang thư mục chính
        await moveUploadedFile(info.tempPath!, info.destPath!);
      }

      const data = {
        avatar: avatarPath,
        fullName: input.fullName,
        classId: classEx.id,
        studentCode: input.studentCode,
        isActive: Boolean(input.isActive), // convert string -> boolean
        bio: input.bio ?? "",
        userId: Number(input.userId),
      };

      const student = await StudentService.createStudent(data);

      logger.info(`Thêm sinh viên thành công`);
      res.json(successResponse(student, `Thêm sinh viên thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deleteStudents(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const student = await StudentService.getStudentBy({ id: Number(id) });

        if (!student) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy sinh viên với ID = ${id}`,
          });
          continue;
        }

        const countContestant = await StudentService.countContestantStudentId(
          student.id
        );
        if (countContestant > 0) {
          messages.push({
            status: "error",
            msg: `Sinh viên "${student.fullName}" đang tham gia ${countContestant} cuộc thi, không thể xóa`,
          });
          continue;
        }

        const deletedStudent = await StudentService.deleteStudent(student.id);
        if (!deletedStudent) {
          messages.push({
            status: "error",
            msg: `Xóa sinh viên "${student.fullName}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa sinh viên "${student.fullName}" thành công`,
        });
        await deleteFile(student.avatar);

        logger.info(`Xóa sinh viên ${student.fullName} thành công`);
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

  static async getStudentNotContestId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi ");
      const query: StudentQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        classId: parseInt(req.query.classId as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const students = await StudentService.getStudentNotContestId(
        query,
        contest.id
      );

      if (!students) {
        throw new Error("Không tìm thấy sinh viên ");
      }
      logger.info(`Lấy danh sách sinh viên thành công`);
      res.json(
        successResponse(students, `Lấy danh sách sinh viên  thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
