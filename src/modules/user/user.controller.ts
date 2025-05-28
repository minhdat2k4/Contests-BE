import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { CreateUserInput, UpdateUserInput, GetUserParams, GetUsersQuery, LoginInput } from './user.schema';
import { createError } from '@/middlewares/errorHandler';
import { successResponse, paginatedResponse } from '@/utils/response';
import { logger } from '@/utils/logger';

export class UserController {
  // Create a new user
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserInput = req.body;
      const user = await UserService.createUser(userData);      logger.info('User created successfully', { userId: user.id, email: user.email });

      res.status(201).json(successResponse(user, 'User created successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id }: GetUserParams = req.params as GetUserParams;      const user = await UserService.getUserById(id);

      res.status(200).json(successResponse(user, 'User retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Get all users with pagination and filtering
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: GetUsersQuery = req.query as any;      const result = await UserService.getUsers(query);

      res.status(200).json(paginatedResponse(result.users, result.pagination, 'Users retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Update user
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id }: GetUserParams = req.params as GetUserParams;
      const updateData: UpdateUserInput = req.body;
      
      const user = await UserService.updateUser(id, updateData);      logger.info('User updated successfully', { userId: user.id, email: user.email });

      res.status(200).json(successResponse(user, 'User updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Delete user
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id }: GetUserParams = req.params as GetUserParams;
      await UserService.deleteUser(id);      logger.info('User deleted successfully', { userId: id });

      res.status(200).json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async loginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password }: LoginInput = req.body;
      
      // Get user by email or username
      const user = await UserService.getUserByIdentifier(identifier);
      
      if (!user) {
        throw createError('INVALID_CREDENTIALS', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError('FORBIDDEN', 403, 'Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await UserService.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        throw createError('INVALID_CREDENTIALS', 401);
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.status(200).json(successResponse({ 
        user: userWithoutPassword,
        // TODO: Add JWT token generation here
      }, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile (requires authentication middleware)
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Extract user ID from JWT token in authentication middleware
      // For now, we'll assume user ID is attached to req.user by auth middleware
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw createError('UNAUTHORIZED', 401);
      }      const user = await UserService.getUserById(userId);

      res.status(200).json(successResponse(user, 'Profile retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Update current user profile (requires authentication middleware)
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Extract user ID from JWT token in authentication middleware
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw createError('UNAUTHORIZED', 401);
      }

      const updateData: UpdateUserInput = req.body;
      const user = await UserService.updateUser(userId, updateData);      logger.info('User profile updated successfully', { userId: user.id, email: user.email });

      res.status(200).json(successResponse(user, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  }
}
