import { Router } from "express";
import { authenticate, role } from "@/middlewares/auth";
import { UserController } from "@/modules/user";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserIdShema,
  UserQuerySchema,
} from "./user.schema";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
const userRouter = Router();
export { userRouter };
// Prive(schema)
userRouter.get(
  "/get-roles",
  authenticate,
  role("Admin"),
  UserController.getRoles
);

userRouter.get(
  "/:id",
  authenticate,
  validateParams(UserIdShema),
  role("Admin"),
  UserController.getUserById
);

userRouter.get(
  "/",
  authenticate,
  validateQuery(UserQuerySchema),
  role("Admin"),
  UserController.getAllUsers
);

userRouter.post(
  "/",
  validateBody(CreateUserSchema),
  authenticate,
  role("Admin"),
  UserController.creatUser
);

userRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateUserSchema),
  UserController.UpdateUser
);

userRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  UserController.toggleActive
);
