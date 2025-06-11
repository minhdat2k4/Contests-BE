import z, { number } from "zod";
export const RoundShema = z.object({
  id: z.number(),
  name: z.string(),
  contestName: z.string(),
  isActive: z.boolean(),
  index: z.number(),
  endTime: z.date(),
  startTime: z.date(),
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

export const RoundIdShame = z.object({
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

export const deleteRoundesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type RoundById = {
  id: number;
  name: string;
  contestId: number;
  contest: { name: string };
  index: number;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
};
export type CreateRoundInput = z.infer<typeof CreateRoundShema>;
export type RoundIdParams = z.infer<typeof RoundIdShame>;
export type UpdateRoundInput = z.infer<typeof UpdeateRoundhema>;
export type RoundQueryInput = z.infer<typeof RoundQuerySchema>;
export type Rounds = z.infer<typeof RoundShema>;
