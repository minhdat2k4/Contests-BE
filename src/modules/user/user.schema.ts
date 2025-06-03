import z from "zod";
import { Role, User } from "@prisma/client";

export const UserShema = z.object({
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
  password: z.string().optional(),
  updateAt: z.date().optional(),
  otpCode: z.number().optional(),
  otpExpiredAt: z.date().optional(),
});
export const CreateUserShema = z.object({
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
  role: z.nativeEnum(Role).default(Role.Judge),
});
export type UserInput = z.infer<typeof UserShema>;
export type CreatUserInput = z.infer<typeof CreateUserShema>;
