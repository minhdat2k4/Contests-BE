import z from "zod";
import { ContestantStatus } from "@prisma/client";

export const ContestantSchema = z.object({
  id: z.number().int().optional(), // do @default(autoincrement()
  roundName: z.string(),
  fullName: z.string(),
  status: z.nativeEnum(ContestantStatus),
});

export const CreateContestantSchema = z.object({
  contestId: z.number({
    required_error: "Vui lòng id cuộc thi",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  studentId: z.number({
    required_error: "Vui lòng id cuộc thi",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  roundId: z
    .number({
      required_error: "Vui lòng id cuộc thi",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .int(),
  status: z.nativeEnum(ContestantStatus).optional(),
});

export const UpdateContestantSchema = z.object({
  roundId: z
    .number({
      required_error: "Vui lòng id cuộc thi",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
});

export const ContestantQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Page phải là số nguyên dương")
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Limit phải là số nguyên dương")
    .optional()
    .default("10"),
  search: z.string().max(100, "Từ khóa tìm kiếm tối đa 100 ký tự").optional(),
  contestId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  roundId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  studentId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
});

export const ContestantIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
});

export const deleteContestantesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type ContestantById = {
  id: number;
  roundId: number;
  studentId: number;
  round: { name: string };
  student: { fullName: string };
  status: ContestantStatus;
};

export type CreateContestantInput = z.infer<typeof CreateContestantSchema>;
export type ContestantIdParams = z.infer<typeof ContestantIdShame>;
export type UpdateContestantInput = z.infer<typeof UpdateContestantSchema>;
export type ContestantQueryInput = z.infer<typeof ContestantQuerySchema>;
export type ContestantType = z.infer<typeof ContestantSchema>;
