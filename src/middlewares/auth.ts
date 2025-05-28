import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '@/utils/jwt';
import { createError } from '@/middlewares/errorHandler';
import { errorResponse } from '@/utils/response';
import { UserService } from '@/modules/user/user.service';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}

/**
 * Authenticate user with JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json(errorResponse('Access token is required'));
      return;
    }
    
    // Verify token
    const payload: JwtPayload = verifyToken(token);
    
    if (payload.type !== 'access') {
      res.status(401).json(errorResponse('Invalid token type'));
      return;
    }
    
    // Get user from database to ensure they still exist and are active
    const user = await UserService.getUserById(payload.userId);
    
    if (!user.isActive) {
      res.status(401).json(errorResponse('Account is deactivated'));
      return;
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
    
    next();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      // Custom error from JWT verification
      res.status(401).json(errorResponse((error as any).message));
      return;
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      next();
      return;
    }
    
    const payload: JwtPayload = verifyToken(token);
    
    if (payload.type !== 'access') {
      next();
      return;
    }
    
    const user = await UserService.getUserById(payload.userId);
    
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      };
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('Insufficient permissions'));
      return;
    }
    
    next();
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const authorizeOwnerOrAdmin = (userIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }
    
    const resourceUserId = req.params[userIdParam];
    const isOwner = req.user.id === resourceUserId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      res.status(403).json(errorResponse('Access denied'));
      return;
    }
    
    next();
  };
};
