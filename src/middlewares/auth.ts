import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JwtPayload } from "@/utils/jwt";
import { errorResponse } from "@/utils/response";
import UserService from "@/modules/user/user.service";

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
    // Attach user to request
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: user.password,
    };

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
  (...roles: String[]) =>
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
