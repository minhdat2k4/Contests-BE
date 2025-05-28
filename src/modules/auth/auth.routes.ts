import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '@/middlewares/validation';
import { authenticate } from '@/middlewares/auth';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
} from './auth.schema';

const authRouter = Router();

// Public routes
authRouter.post(
  '/register',
  validateBody(RegisterSchema),
  AuthController.register
);

authRouter.post(
  '/login',
  validateBody(LoginSchema),
  AuthController.login
);

authRouter.post(
  '/refresh',
  validateBody(RefreshTokenSchema),
  AuthController.refreshToken
);

// Protected routes
authRouter.post(
  '/logout',
  authenticate,
  AuthController.logout
);

authRouter.post(
  '/change-password',
  authenticate,
  validateBody(ChangePasswordSchema),
  AuthController.changePassword
);

authRouter.get(
  '/profile',
  authenticate,
  AuthController.getProfile
);

export { authRouter };
