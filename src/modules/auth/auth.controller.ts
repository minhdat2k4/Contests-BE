import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { LoginInput, RegisterInput, RefreshTokenInput, ChangePasswordInput } from './auth.schema';
import { successResponse } from '@/utils/response';
import { logger } from '@/utils/logger';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registerData: RegisterInput = req.body;
      const result = await AuthService.register(registerData);

      logger.info('User registered successfully', { 
        userId: result.user.id, 
        email: result.user.email 
      });

      res.status(201).json(successResponse(result, 'User registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: LoginInput = req.body;
      const result = await AuthService.login(loginData);

      logger.info('User logged in successfully', { 
        userId: result.user.id, 
        email: result.user.email 
      });

      res.status(200).json(successResponse(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenInput = req.body;
      const result = await AuthService.refreshToken(refreshToken);

      res.status(200).json(successResponse(result, 'Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return next(new Error('User not authenticated'));
      }

      const changePasswordData: ChangePasswordInput = req.body;
      const result = await AuthService.changePassword(userId, changePasswordData);

      logger.info('Password changed successfully', { userId });

      res.status(200).json(successResponse(result, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return next(new Error('User not authenticated'));
      }

      const result = await AuthService.logout(userId);

      logger.info('User logged out successfully', { userId });

      res.status(200).json(successResponse(result, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return next(new Error('User not authenticated'));
      }

      // User data is already available from auth middleware
      res.status(200).json(successResponse(req.user, 'Profile retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
}
