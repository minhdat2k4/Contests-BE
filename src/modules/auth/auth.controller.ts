import AuthService from "./auth.service";
import {
  LoginInput,
  forgotPasswordInput,
  OtpInput,
  ResetPasswordInput,
  RegisterInput,
  StudentRegisterInput,
  ChangePassWordInput,
  ChangeInfoInput,
} from "./auth.schema";
import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { verifyToken, generateAccessToken } from "@/utils/jwt";
import UserService from "../user/user.service";
import { validateData } from "@/middlewares/validation";
import { sendOtp } from "@/utils/email";
import bcrypt from "bcrypt";

import { prisma } from "@/config/database";

export default class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const extingUserName = await UserService.existingUserName(input.username);
      if (extingUserName) {
        logger.error(`Tên tài khoản  ${input.username} đã tồn tại`);
        res
          .status(400)
          .json(validateData("username", "Tên tài khoản đã tồn tại"));
        return;
      }
      const extingEmail = await UserService.existingEmail(input.email);
      if (extingEmail) {
        logger.error(`Email ${input.email} đã tồn tại`);
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const { confirmPassword, ...userInput } = input;
      const hashedPassword = await bcrypt.hash(userInput.password, 10);
      const user = await UserService.creatUser({
        ...userInput,
        password: hashedPassword,
      });
      res.json(successResponse(user, "Đăng kí tài khoản thành công"));
      logger.info(`Đăng kí tài khoản thành công ${user}`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  //   static async registerStudent(req: Request, res: Response): Promise<void> {
  //     try {
  //       const input: StudentRegisterInput = req.body;
  // <<<<<<< HEAD

  //       // Kiểm tra username đã tồn tại chưa
  //       const existingUserName = await UserService.existingUserName(
  //         input.username
  //       );
  //       if (existingUserName) {
  //         logger.error(`Tên tài khoản ${input.username} đã tồn tại`);
  //         res
  //           .status(400)
  //           .json(validateData("username", "Tên tài khoản đã tồn tại"));
  //         return;
  //       }

  //       // Kiểm tra email đã tồn tại chưa
  //       const existingEmail = await UserService.existingEmail(input.email);
  //       if (existingEmail) {
  //         logger.error(`Email ${input.email} đã tồn tại`);
  //         res.status(400).json(validateData("email", "Email đã tồn tại"));
  //         return;
  //       }

  //       // Kiểm tra mã sinh viên đã tồn tại chưa (nếu có)
  //       if (input.studentCode) {
  //         const existingStudentCode = await StudentService.getStudentBy({
  //           studentCode: input.studentCode,
  //         });
  //         if (existingStudentCode) {
  //           logger.error(`Mã sinh viên ${input.studentCode} đã tồn tại`);
  //           res
  //             .status(400)
  //             .json(validateData("studentCode", "Mã sinh viên đã tồn tại"));
  //           return;
  //         }
  //       }

  //       // Kiểm tra lớp có tồn tại không
  //       const existingClass = await prisma.class.findFirst({
  //         where: { id: input.classId, isActive: true },
  //       });
  //       if (!existingClass) {
  //         logger.error(`Lớp với ID ${input.classId} không tồn tại`);
  //         res.status(400).json(validateData("classId", "Lớp không tồn tại"));
  //         return;
  //       }

  //       // Mã hóa mật khẩu
  //       const { confirmPassword, fullName, classId, studentCode, ...userInput } =
  //         input;
  //       const hashedPassword = await bcrypt.hash(userInput.password, 10);

  //       // Tạo transaction để đảm bảo tính nhất quán dữ liệu
  //       const result = await prisma.$transaction(async tx => {
  //         // Tạo User với role Student
  //         const user = await tx.user.create({
  //           data: {
  //             ...userInput,
  //             password: hashedPassword,
  //             role: "Student",
  //           },
  //         });

  //         // Tạo Student
  //         const student = await tx.student.create({
  //           data: {
  //             fullName,
  //             classId,
  //             studentCode: studentCode || null,
  //             isActive: true,
  //           },
  //         });

  //         return { user, student };
  //       });
  // =======

  //       const result = await AuthService.registerStudent(input);
  // >>>>>>> 273f4e23f2706bcb5a19973aa3419b9133a563fd

  //       res.json(
  //         successResponse(result, "Đăng ký tài khoản sinh viên thành công")
  //       );
  //       logger.info(
  //         `Đăng ký tài khoản sinh viên thành công cho ${input.username}`
  //       );
  //     } catch (error) {
  //       const errorMessage = (error as Error).message;

  //       // Xử lý các lỗi cụ thể
  //       switch (errorMessage) {
  //         case "USERNAME_EXISTS":
  //           logger.error(`Tên tài khoản ${req.body.username} đã tồn tại`);
  //           res
  //             .status(400)
  //             .json(validateData("username", "Tên tài khoản đã tồn tại"));
  //           break;
  //         case "EMAIL_EXISTS":
  //           logger.error(`Email ${req.body.email} đã tồn tại`);
  //           res.status(400).json(validateData("email", "Email đã tồn tại"));
  //           break;
  //         case "CLASS_NOT_EXISTS":
  //           logger.error(`Lớp với ID ${req.body.classId} không tồn tại`);
  //           res.status(400).json(validateData("classId", "Lớp không tồn tại"));
  //           break;
  //         default:
  //           logger.error((error as Error).message);
  //           res.status(400).json(errorResponse((error as Error).message));
  //           break;
  //       }
  //     }
  //   }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const user = await AuthService.findUserByIdentifier(input.identifier);
      if (!user) {
        logger.error(`Tài khoản ${input.identifier} không tồn tại`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không tồn tại"));
        return;
      }
      const isPassword = await AuthService.isPassword(
        input.password,
        user.password
      );
      if (!isPassword) {
        logger.error(`Tài khoản ${input.identifier} nhập sai mật khẩu`);
        res.status(400).json(validateData("password", "Sai mật khẩu "));
        return;
      }
      const tokenData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      const accessToken = await AuthService.accessToken(tokenData);
      const refreshToken = await AuthService.refreshToken(tokenData);
      const updateAccessToken: any = {};
      updateAccessToken.token = accessToken;
      await UserService.UpdateUser(user.id, updateAccessToken);
      const refreshTokenInput = {
        userId: user.id,
        refreshToken: refreshToken,
      };
      const deleterefreshToken = await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      });
      if (!deleterefreshToken) throw new Error("Đăng nhập thất bại");
      await UserService.UpdateUser(user.id, { token: accessToken });
      await AuthService.CreateRefreshToken(refreshTokenInput);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 60 * 1000 * 24, // 30 ngày
      });
      res.json(
        successResponse(
          { role: user.role, accessToken },
          "Đăng nhập thành công"
        )
      );
      logger.info(`${input.identifier} đăng nhập thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async studentLogin(req: Request, res: Response): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const user = await AuthService.findUserByIdentifier(input.identifier);

      if (!user) {
        logger.error(`Tài khoản ${input.identifier} không tồn tại`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không tồn tại"));
        return;
      }

      // Verify this is a Student role
      if (user.role !== "Student") {
        logger.error(`Tài khoản ${input.identifier} không phải là thí sinh`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không phải là thí sinh"));
        return;
      }

      const isPassword = await AuthService.isPassword(
        input.password,
        user.password
      );
      if (!isPassword) {
        logger.error(`Thí sinh ${input.identifier} nhập sai mật khẩu`);
        res.status(400).json(validateData("password", "Sai mật khẩu"));
        return;
      }

      // Get contestant information
      const contestant = await prisma.contestant.findFirst({
        where: {
          student: {
            id: user.id,
          },
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              studentCode: true,
            },
          },
          round: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!contestant) {
        logger.error(`Không tìm thấy thông tin thí sinh cho user ${user.id}`);
        res
          .status(400)
          .json(
            validateData("identifier", "Không tìm thấy thông tin thí sinh")
          );
        return;
      }

      // Find active matches for this contestant
      const activeMatches = await prisma.match.findMany({
        where: {
          round: {
            contestId: contestant.contestId,
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          currentQuestion: true,
          remainingTime: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const tokenData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      const accessToken = await AuthService.accessToken(tokenData);
      const refreshToken = await AuthService.refreshToken(tokenData);

      // Update user token
      await UserService.UpdateUser(user.id, { token: accessToken });

      // Delete old refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new refresh token
      await AuthService.CreateRefreshToken({
        userId: user.id,
        refreshToken: refreshToken,
      });

      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60, // 1 hour
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 60 * 1000 * 24, // 30 days
      });

      const responseData = {
        role: user.role,
        accessToken,
        contestantInfo: {
          id: contestant.id,
          status: contestant.status,
          student: contestant.student,
          contest: contestant.contest,
          round: contestant.round,
          activeMatches: activeMatches,
        },
        socketInfo: {
          namespace: "/match-control",
          instructions: "Use this token to connect to Socket.IO",
        },
      };

      res.json(successResponse(responseData, "Đăng nhập thí sinh thành công"));

      logger.info(
        `Thí sinh ${input.identifier} đăng nhập thành công | Contestant ID: ${contestant.id}`
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(500).json(errorResponse((error as Error).message));
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng ");
      }
      const userId: number = req.user.userId!;
      await UserService.UpdateUser(userId, { token: "" });
      await AuthService.deleteRefreshToken(userId);
      res.clearCookie("accessToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.json({
        success: true,
        message: "Đăng xuất thành công",
      });
      logger.info(`${req.user.username} đăng xuất thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async refreshAccToken(req: Request, res: Response): Promise<void> {
    try {
      const token: string = req.cookies.refreshToken;
      if (!token) {
        throw new Error("Không tìm thấy refreshtoken");
      }
      const payload = verifyToken(token);
      if (payload.type != "refresh") {
        throw new Error("Sai loại token");
      }
      const refreshtoken = await AuthService.getRefreshtokenByUseridToken(
        payload.userId,
        token
      );
      if (!refreshtoken || new Date(refreshtoken.expiredAt) < new Date()) {
        throw new Error("Token hết hạn");
      }
      const { userId, email, role, username } = payload;
      const newPayLoad = { userId, email, role, username };
      const newAccessToken = generateAccessToken(newPayLoad);
      const data: any = {};
      data.token = newAccessToken;
      await UserService.UpdateUser(userId, data);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 1000 * 60,
        secure: process.env.NODE_ENV === "production",
      });
      logger.info(`${payload.username} lấy token mới thành công`);
      res.json({
        success: true,
        message: "Lấy token mới thành công",
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(401).json(errorResponse((error as Error).message));
    }
  }
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: forgotPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000);
      const data: any = {
        otpCode: otp,
        otpExpiredAt: expiredAt,
      };
      await UserService.UpdateUser(user.id, data);
      await sendOtp({
        to: user.email,
        subject: "Mã OTP đặt lại mật khẩu",
        html: `
          <p>Xin chào ${user.username},</p>
          <p>Mã xác thực của bạn là:</p>
          <h2>${otp}</h2>
          <p>Mã có hiệu lực trong 5 phút.</p>
        `,
      });

      res.json({
        success: true,
        message: "Gửi mã xác thực thành công",
      });
      logger.info(` Gửi mã otp cho email ${input.email} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const input: OtpInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
      }
      const isOtpExpired = await AuthService.isOtpExpired(
        user.otpExpiredAt ?? undefined
      );
      if (isOtpExpired) {
        throw new Error("Mã OTP đã hết hạn");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        throw new Error("Mã OTP không chính xác");
      }
      res.json(successResponse(null, "Xác nhận OTP thành công"));
      logger.info(`${user.username} xác nhận otp thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: ResetPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Đổi mật khẩu thất bại");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        throw new Error("Đổi mật khẩu thất bại");
      }
      const data: any = {
        email: input.email,
        otp: input.otp,
        password: input.newPassword,
        otpCode: null,
        otpExpiredAt: null,
      };
      await UserService.UpdateUser(user.id, data);
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`${user.username} đổi mật khẩu thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async profile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const user = req.user;
      logger.info(`Truy cập hồ sơ ${req.user.username} thành công`);
      res.json(
        successResponse({
          id: user.userId,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
        })
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changePassWord(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangePassWordInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const isPassWord = await AuthService.isPassword(
        input.currentPassword,
        req.user.password
      );
      if (!isPassWord) {
        logger.error(
          `Người dùng ${req.user.username} nhập sai mật khẩu hiện tại`
        );
        res.status(400).json(validateData("currentPassword", "Sai mật khẩu"));
        return;
      }
      await UserService.UpdateUser(req.user.userId, {
        password: input.newPassword,
      });
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`Người dùng ${req.user.username} đổi mật thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changeInfo(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangeInfoInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const extisingEmail = await UserService.existingEmailForUpdate(
        input.email,
        req.user.userId
      );
      if (extisingEmail) {
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      await UserService.UpdateUser(req.user.userId, {
        email: input.email,
      });
      logger.info(`Tài khoản ${req.user.username} thay đổi email thành công`);
      res.json(successResponse(null, "Cập nhật email thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
