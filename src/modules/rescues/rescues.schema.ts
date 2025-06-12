import z, { number } from "zod";
import { RescueType, RescueStatus } from "@prisma/client";

export const RescuesShema = z.object({
  id: z.number(),
  name: z.string(),
  rescueType: z.nativeEnum(RescueType),
  questionFrom: z.number(),
  questionTo: z.number(),
  studentIds: z.any().optional(),
  supportAnswers: z.any().optional(),
  remainingContestants: z.number(),
  maxStudent: z.number(),
  index: z.number(),
  status: z.nativeEnum(RescueStatus),
  matchName: z.string(),
});

export const CreateRescuesShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên cứu trợ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên cứu trợ")
    .max(255, "Tên cứu trợ tối đa 255 kí tự")
    .optional(),
  rescueType: z.nativeEnum(RescueType),
  questionFrom: z
    .number({
      required_error: "Vui lòng nhập câu bắt đầu",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  questionTo: z
    .number({
      required_error: "Vui lòng nhập câu kết thúc",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  studentIds: z.any().optional(),
  supportAnswers: z.any().optional(),
  remainingContestants: z
    .number({
      required_error: "Vui lòng nhập số thí sinh còn lại",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  maxStudent: z
    .number({
      required_error: "Vui lòng nhập số lượng thí sinh tối đa",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  matchId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(val => !isNaN(val) && val > 0, "Id cuộc thi là một số nguyên dương")
    .optional(),
  status: z.nativeEnum(RescueStatus).optional(),
  index: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const RescuesIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateRescueshema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên cứu trợ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên cứu trợ")
    .max(255, "Tên cứu trợ tối đa 255 kí tự")
    .optional(),
  contestId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(val => !isNaN(val) && val > 0, "Id cuộc thi là một số nguyên dương")
    .optional(),
  startTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày bắt đầu không hợp lệ",
    })
    .transform(val => new Date(val))
    .optional(),

  endTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày kết thúc không hợp lệ",
    })
    .transform(val => new Date(val))
    .optional(),

  index: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const RescuesQuerySchema = z.object({
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
  rescueType: z.nativeEnum(RescueType).optional(),
  status: z.nativeEnum(RescueStatus).optional(),
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trận đấu phải là số nguyên dương"
    )
    .optional(),
});

export const deleteRescuesesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type RescuesById = {
  id: number;
  name: string;
  rescueType: RescueType;
  questionFrom: number;
  questionTo: number;
  studentIds: number[];
  supportAnswers: string[];
  remainingContestants: number;
  maxStudent: number;
  index: number;
  status: RescueStatus;
  matchName: string;
  isActive: boolean;
};
export type CreateRescueInput = z.infer<typeof CreateRescuesShema>;
export type RescuesIdParams = z.infer<typeof RescuesIdShame>;
export type UpdateRescueInput = z.infer<typeof UpdeateRescueshema>;
export type RescuesQueryInput = z.infer<typeof RescuesQuerySchema>;
export type Rescues = z.infer<typeof RescuesShema>;
