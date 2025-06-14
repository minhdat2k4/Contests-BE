import z, { number } from "zod";
export const MatchShema = z.object({
  id: z.number(),
  name: z.string(),
  contestName: z.string(),
  isActive: z.boolean(),
  index: z.number(),
  endTime: z.date(),
  startTime: z.date(),
});

export const CreateMatchShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên vòng đấu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên vòng đấu")
    .max(255, "Tên vòng đấu tối đa 255 kí tự"),
  contestId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi là một số nguyên dương"
    ),
  startTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày bắt đầu không hợp lệ",
    })
    .transform(val => new Date(val)),

  endTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày kết thúc không hợp lệ",
    })
    .transform(val => new Date(val)),

  index: z.number(),
  isActive: z.boolean(),
});

export const MatchIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateMatchhema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên vòng đấu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên vòng đấu")
    .max(255, "Tên vòng đấu tối đa 255 kí tự")
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

export const MatchQuerySchema = z.object({
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
  isActive: z
    .string()
    .transform(val => val === "true")
    .optional(),
  contestId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
});

export const deleteMatchesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type MatchById = {
  id: number;
  name: string;
  contestId: number;
  contest: { name: string };
  index: number;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
};
export type CreateMatchInput = z.infer<typeof CreateMatchShema>;
export type MatchIdParams = z.infer<typeof MatchIdShame>;
export type UpdateMatchInput = z.infer<typeof UpdeateMatchhema>;
export type MatchQueryInput = z.infer<typeof MatchQuerySchema>;
export type Matchs = z.infer<typeof MatchShema>;
