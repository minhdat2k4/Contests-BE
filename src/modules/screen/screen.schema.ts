import z, { number, string } from "zod";

export const CreateScreensSchema = z.object({});

export const ScreensIdShema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateScreensSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhóm").optional(),
  userId: z.number().optional(),
  matchId: z.number().optional(),
  confirmCurrentQuestion: z.number().optional(),
});

export type ScreensIdParams = z.infer<typeof ScreensIdShema>;
export type UpdateScreenInput = z.infer<typeof UpdateScreensSchema>;
export type CreateScreenInput = z.infer<typeof CreateScreensSchema>;
