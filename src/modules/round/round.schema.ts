import z from "zod";
export const RoundShema = z.object({
  id: z.number(),
  name: z.string(),
  contestName: z.string(),
  isActive: z.boolean(),
});

export const CreateRoundShema = z.object({
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
    .refine(val => !NaN && val > 0, "Id cuộc thi là một số nguyên dương"),
  isActive: z.boolean().optional(),
});

export const RoundIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateRoundhema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên vòng đấu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên vòng đấu")
    .max(255, "Tên vòng đấu tối đa 255 kí tự")
    .optional(),
  isActive: z.boolean().optional(),
  contestId: z
    .number({
      required_error: "Vui lòng nhập id vòng đấu",
      invalid_type_error: "Id trường là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id trường là một số nguyên dương")
    .optional(),
});

export const RoundQuerySchema = z.object({
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

export const deleteRoundesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type RoundById = {
  id: number;
  name: string;
  schoolId: number;
  school: { name: string };
  isActive: boolean;
};
export type CreateRoundInput = z.infer<typeof CreateRoundShema>;
export type RoundIdParams = z.infer<typeof RoundIdShame>;
export type UpdateRoundInput = z.infer<typeof UpdeateRoundhema>;
export type RoundQueryInput = z.infer<typeof RoundQuerySchema>;
export type Rounds = z.infer<typeof RoundShema>;
