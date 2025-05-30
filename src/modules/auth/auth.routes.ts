import { Router } from "express";
import AuthController from "./auth.controller";
import { validateBody } from "@/utils/validation";
import { LoginSchema } from "./auth.schema";
import { authenticate } from "@/middlewares/auth";
const authRouter = Router();
authRouter.post("/login", validateBody(LoginSchema), AuthController.login);
authRouter.post("/logout", authenticate, AuthController.logout);
authRouter.get("/abc", authenticate, (req, res) => {
  res.json("au");
});
export { authRouter };
