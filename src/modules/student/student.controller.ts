import { Request, Response } from "express";
import {
  CreateStudentInput,
  StudentService,
  StudentQueryInput,
  UpdateStudentInput,
} from "@/modules/student";
import { ClassController, ClassService } from "@/modules/class";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
export default class StudentController {
  // static async toggleActive(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Class = await ClassService.getClassBy({ id: Number(id) });
  //     if (!Class) {
  //       throw new Error("Không tìm thấy lớp học ");
  //     }
  //     const updateClass = await ClassService.updateClass(Number(id), {
  //       isActive: !Class.isActive,
  //     });
  //     if (!updateClass) {
  //       throw new Error("Cập nhật trạng thái lớp thất bại ");
  //     }
  //     logger.info(`Cập nhật trạng thái lớp  ${Class.name} thành công`);
  //     res.json(
  //       successResponse(
  //         updateClass,
  //         `Cập nhật trạng thái lớp ${Class.name} thành công`
  //       )
  //     );
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
  // static async deleteClass(req: Request, res: Response): Promise<void> {
  //   try {
  //     const id = req.params.id;
  //     const Class = await ClassService.getClassBy({ id: Number(id) });
  //     if (!Class) {
  //       throw new Error("Không tìm thấy lớp học ");
  //     }
  //     const [countClassVieo, countStudent] = await Promise.all([
  //       ClassService.countClassVieoByClassId(Number(id)),
  //       ClassService.countClassStudentClassId(Number(id)),
  //     ]);

  //     if (countClassVieo > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countClassVieo} video lớp tham gia cuộc thi không thể xóa`
  //       );
  //     }
  //     if (countStudent > 0) {
  //       throw new Error(
  //         `Lớp này hiện có ${countStudent} sinh viên không thể xóa `
  //       );
  //     }
  //     const deleteClass = await ClassService.deleteClass(Class.id);
  //     if (!deleteClass) {
  //       throw new Error(`Xóa lớp ${Class.name} thất bại `);
  //     }
  //     logger.info(`Xóa lớp ${Class.name} thành công`);
  //     res.json(successResponse(null, `Xóa lớp ${Class.name} thành công`));
  //   } catch (error) {
  //     logger.error((error as Error).message);
  //     res.status(400).json(errorResponse((error as Error).message));
  //   }
  // }
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
            : true,
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
}
