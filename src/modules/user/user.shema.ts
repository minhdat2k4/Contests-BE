import z from "zod";
import { Role } from "@prisma/client";

export const UpdateUserSchema = z.object({
  email: z
    .string({
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .email("Vui lòng nhập đúng định dạng email")
    .optional(),
  role: z.nativeEnum(Role).optional(),
  token: z.string({
    invalid_type_error: "Vui lòng nhập kí tự chuỗi",
  }),
  isAcitve: z.boolean().optional(),
  password: z.string().optional(),
  updateAt: z.date().optional(),
  otpCode: z.number().optional(),
  otpExpiredAt: z.date().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
