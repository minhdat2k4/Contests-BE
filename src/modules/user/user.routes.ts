import { Router } from "express";
import { authenticate, role } from "@/middlewares/auth";
import { UserController } from "@/modules/user";
import { CreateUserSchema, UpdateUserSchema } from "./user.schema";
import { validateBody } from "@/utils/validation";
const userRouter = Router();
export { userRouter };
// Prive(schema)
userRouter.get("/:id", authenticate, role("Admin"), UserController.getUserById);

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
