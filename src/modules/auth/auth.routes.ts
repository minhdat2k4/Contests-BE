import { Router } from "express";
import AuthController from "./auth.controller";
import { validateBody } from "@/utils/validation";
import {
  LoginSchema,
  forgotPasswordSchema,
  otpShema,
  ResetPasswordShema,
  RegisterSchema,
} from "./auth.schema";

import { authenticate } from "@/middlewares/auth";
const authRouter = Router();
// public
authRouter.post("/login", validateBody(LoginSchema), AuthController.login);
authRouter.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  AuthController.forgotPassword
);
authRouter.post("/very-otp", validateBody(otpShema), AuthController.verifyOtp);
authRouter.post(
  "/reset-password",
  validateBody(ResetPasswordShema),
  AuthController.resetPassword
);
authRouter.post(
  "/register",
  validateBody(RegisterSchema),
  AuthController.register
);
// private
authRouter.post("/logout", authenticate, AuthController.logout);
authRouter.post("/refresh-token", AuthController.refreshAccToken);
authRouter.get("/abc", authenticate, (req, res) => {
  res.json("au");
});
authRouter.get("/profile", authenticate, AuthController.profile);
export { authRouter };
