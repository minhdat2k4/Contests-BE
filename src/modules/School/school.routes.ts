import { Router } from "express";
import { validateBody, validateParams } from "@/utils/validation";
import { SchoolController } from "@/modules/School";
import {
  CreateSchoolSchema,
  SchoolIdShame,
  UpdeateSchoolShema,
} from "./school.schema";
import { authenticate, role } from "@/middlewares/auth";
import { UpdateAboutInput } from "../../../dist/modules/about/about.schema";
const schoolRouter = Router();
// prive

schoolRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(SchoolIdShame),
  SchoolController.getSchoolById
);

schoolRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateSchoolSchema),
  SchoolController.createSchool
);

schoolRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdeateSchoolShema),
  SchoolController.updateShool
);
export { schoolRouter };
