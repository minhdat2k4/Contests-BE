import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { StudentController } from "@/modules/student";
import {
  CreateStudentShema,
  StudentQuerySchema,
  StudentIdShame,
  UpdateStundentShema,
} from "./student.schema";
import { authenticate, role } from "@/middlewares/auth";
const studentRouter = Router();
// prive

studentRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(StudentQuerySchema),
  StudentController.getAlls
);

studentRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(StudentIdShame),
  StudentController.getStudentById
);

studentRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateStudentShema),
  StudentController.createStudent
);

studentRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateStundentShema),
  validateParams(StudentIdShame),
  StudentController.updateStudent
);

studentRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  validateParams(StudentIdShame),
  StudentController.toggleActive
);
studentRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(StudentIdShame),
  StudentController.deleteStudent
);
export { studentRouter };
