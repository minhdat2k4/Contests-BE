import { Request, Response } from "express";
import {
  CreateStudentInput,
  StudentService,
  StudentQueryInput,
  UpdateStudentInput,
} from "@/modules/student";
import { ClassService } from "@/modules/class";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
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
      const id = req.params.id;
      const input: UpdateStudentInput = req.body;
      if (input.classId) {
        const school = await ClassService.getClassBy({ id: input.classId });
        if (!school) {
          throw new Error("Không tìm thấy lớp");
        }
      }
      const student = await StudentService.getStudentBy({ id: Number(id) });
      if (!student) {
        throw new Error("Không tìm thấy sinh viên");
      }
      console.log(input);
      const updateStudent = await StudentService.updateStudent(
        Number(id),
        input
      );
      if (!updateStudent) {
        throw new Error("Cập nhật sinh viên  thất bại");
      }
      logger.info(`Cập nhật sinh viên  ${updateStudent.fullName} thành công`);
      res.json(
        successResponse(
          updateStudent,
          `Cập nhật sinh viên ${updateStudent.fullName} thành công`
        )
      );
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
      const input: CreateStudentInput = req.body;
      const Class = await ClassService.getClassBy({ id: input.classId });
      if (!Class) {
        throw new Error("Không tìm thấy lớp học");
      }
      const student = await StudentService.createClass(input);
      if (!student) {
        throw new Error(`Thêm sinh viên ${input.fullName} thất bại`);
      }

      logger.info(`Thêm sinh viên ${input.fullName} thành công`);
      res.json(
        successResponse(student, `Thêm sinh viên ${input.fullName} thành công`)
      );
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
