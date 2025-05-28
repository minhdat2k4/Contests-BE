import { Router } from 'express';
import { UserController } from './user.controller';
import { validateBody, validateParams, validateQuery } from '@/middlewares/validation';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '@/middlewares/auth';
import {
  CreateUserSchema,
  UpdateUserSchema,
  GetUserParamsSchema,
  GetUsersQuerySchema,
  LoginSchema,
} from './user.schema';

const userRouter = Router();

// Public routes
userRouter.post(
  '/register',
  validateBody(CreateUserSchema),
  UserController.createUser
);

userRouter.post(
  '/login',
  validateBody(LoginSchema),
  UserController.loginUser
);

// Protected routes (require authentication)
userRouter.get('/profile', authenticate, UserController.getProfile);
userRouter.put('/profile', authenticate, validateBody(UpdateUserSchema), UserController.updateProfile);

// Admin routes (require admin role)
userRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateQuery(GetUsersQuerySchema),
  UserController.getUsers
);

userRouter.get(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateParams(GetUserParamsSchema),
  UserController.getUserById
);

userRouter.put(
  '/:id',
  authenticate,
  authorizeOwnerOrAdmin(),
  validateParams(GetUserParamsSchema),
  validateBody(UpdateUserSchema),
  UserController.updateUser
);

userRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateParams(GetUserParamsSchema),
  UserController.deleteUser
);

// User profile routes
userRouter.get(
  '/profile/me',
  UserController.getProfile
);

userRouter.put(
  '/profile/me',
  validateBody(UpdateUserSchema),
  UserController.updateProfile
);

export { userRouter };
