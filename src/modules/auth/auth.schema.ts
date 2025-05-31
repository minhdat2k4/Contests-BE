import { nativeEnum, number, string, z } from "zod";
import { Role } from "@prisma/client";
export const CreateRefreshTokenShchema = z.object({
  id: number(),
  username: string(),
  email: string(),
  role: nativeEnum(Role),
});

export const LoginSchema = z.object({
  identifier: z
    .string({
      required_error: "Vui lòng nhập tên đăng nhập hoặc email",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi ",
    })
    .min(1, "Vui lòng nhập tên đăng nhập hoặc email"),
  password: z
    .string({
      required_error: "Vui lòng nhập mật khẩu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập mật khẩu"),
});
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(1, "Vui lòng nhập tên đăng nhập")
    .max(20, "Tên đăng nhập không được quá 20 ký tự"),
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu là bắt buộc và phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
      "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
    ),
  Role: z.nativeEnum(Role).default(Role.Judge).optional(),
});
export const ResetPasswordSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
});
export const UpdateUserSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ")
    .optional(),
  role: z.nativeEnum(Role).default(Role.Judge).optional(),
});
export const ChangePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    confirmNewPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Xác nhận mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateRefreshTokenInput = z.infer<typeof CreateRefreshTokenShchema>;
