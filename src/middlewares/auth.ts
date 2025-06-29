import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JwtPayload } from "@/utils/jwt";
import { errorResponse } from "@/utils/response";
import UserService from "@/modules/user/user.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface User {
      userId: number;
      username: string;
      email: string;
      role: string;
      isActive: boolean;
      password: string;
      contestantId?: number; // Thêm contestantId cho Student
    }
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      res.status(401).json(errorResponse("Access token is required"));
      return;
    }
    // Verify token
    const payload: JwtPayload = verifyToken(token);

    if (payload.type !== "access") {
      res.status(401).json(errorResponse("Invalid token type"));
      return;
    }

    // Get user from database to ensure they still exist and are active
    const user = await UserService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json(errorResponse("Account is deactivated"));
      return;
    }

    //  Kiểm tra token hiện tại với token ở database
    if (user.token !== token) {
      res.status(401).json(errorResponse("Vui lòng đăng nhập lại"));
      return;
    }

    // Base user info
    const userInfo: Express.User = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: user.password,
    };

    // If user is Student, find and attach contestantId
    if (user.role === "Student") {
      try {
        console.log('🔍 [AUTH MIDDLEWARE] Tìm contestant cho Student userId:', user.id);
        
        const contestant = await prisma.contestant.findFirst({
          where: {
            student: {
              userId: user.id
            }
          },
          include: {
            student: {
              select: { id: true, fullName: true, studentCode: true }
            }
          }
        });

        if (contestant) {
          console.log('✅ [AUTH MIDDLEWARE] Đã tìm thấy contestant:', contestant.id, 'cho student:', contestant.student.fullName);
          userInfo.contestantId = contestant.id;
        } else {
          console.log('❌ [AUTH MIDDLEWARE] Không tìm thấy contestant cho userId:', user.id);
          // Không throw error vì có thể Student chưa được assign vào contest nào
        }
      } catch (error) {
        console.error('💥 [AUTH MIDDLEWARE] Lỗi khi tìm contestant:', error);
        // Không throw error, chỉ log để debug
      }
    }

    // Attach user to request
    req.user = userInfo;

    next();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      // Custom error from JWT verification
      res.status(401).json(errorResponse((error as any).message));
      return;
    }
    next(error);
  }
};

export const role =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json(errorResponse(`Vui lòng đăng nhập lại`));
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json(errorResponse(`Không có quyền truy cập`));
    }
    next();
  };
