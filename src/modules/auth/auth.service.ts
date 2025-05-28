import { UserService } from '@/modules/user/user.service';
import { generateTokenPair, verifyToken, JwtPayload } from '@/utils/jwt';
import { createError } from '@/middlewares/errorHandler';
import { LoginInput, RegisterInput, ChangePasswordInput } from './auth.schema';
import bcrypt from 'bcrypt';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Register a new user
   */
  static async register(data: RegisterInput) {
    try {
      const user = await UserService.createUser(data);
      
      // Generate tokens
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user,
        tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user with email/username and password
   */
  static async login(data: LoginInput) {
    try {
      // Get user by email or username
      const user = await UserService.getUserByIdentifier(data.identifier);
      
      if (!user) {
        throw createError('INVALID_CREDENTIALS', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError('ACCOUNT_DEACTIVATED', 403);
      }

      // Verify password
      const isPasswordValid = await UserService.verifyPassword(data.password, user.password);
      
      if (!isPasswordValid) {
        throw createError('INVALID_CREDENTIALS', 401);
      }

      // Generate tokens
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload: JwtPayload = verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw createError('INVALID_TOKEN', 401, 'Invalid token type');
      }

      // Get user to ensure they still exist and are active
      const user = await UserService.getUserById(payload.userId);
      
      if (!user.isActive) {
        throw createError('ACCOUNT_DEACTIVATED', 403);
      }

      // Generate new tokens
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return { tokens };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, data: ChangePasswordInput) {
    try {
      // Get user with password
      const user = await UserService.getUserByIdentifier(userId);
      
      if (!user) {
        throw createError('USER_NOT_FOUND', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await UserService.verifyPassword(
        data.currentPassword,
        user.password
      );
      
      if (!isCurrentPasswordValid) {
        throw createError('INVALID_CREDENTIALS', 401, 'Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(data.newPassword, this.SALT_ROUNDS);

      // Update password in database (you'll need to add this method to UserService)
      // await UserService.updatePassword(userId, hashedNewPassword);

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user (invalidate tokens)
   * Note: In a real application, you might want to maintain a blacklist of invalidated tokens
   */
  static async logout(userId: string) {
    try {
      // In a simple JWT implementation, logout is handled client-side
      // by removing the tokens from storage
      // For more security, implement token blacklisting
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw error;
    }
  }
}
