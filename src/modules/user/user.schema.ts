import { z } from "zod";
import { Role } from "@prisma/client";

export const UpdateUserSchema = z.object({
  email: z
    .string({
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .email("Vui lòng nhập đúng định dạng email")
    .optional(),
  role: z.nativeEnum(Role).optional(),
  token: z
    .string({
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .optional(),
  isAcitve: z.boolean().optional(),
  password: z
    .string()
    .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
      "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
    )
    .optional(),
  updateAt: z.date().optional(),
  otpCode: z.number().optional(),
  otpExpiredAt: z.date().optional(),
});
export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Tên tài khoản ít nhất 3 kí tự")
    .max(20, "Tên tài tối đa 20 kí tự"),
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Vui lòng nhập đúng định dạng email"),
  password: z
    .string()
    .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
      "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
    ),
  role: z.nativeEnum(Role).default("Judge"),
});

export type UserInput = z.infer<typeof UpdateUserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
