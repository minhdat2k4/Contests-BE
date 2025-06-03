import { Router } from "express";
import { authenticate, role } from "@/middlewares/auth";

import { UserController, CreateUserShema } from "@/modules/user";
import { validateBody } from "@/middlewares/validation";
const userRouter = Router();
export { userRouter };
// Prive(schema)
userRouter.post("/", authenticate, role("Admin"), UserController.creatUser);
