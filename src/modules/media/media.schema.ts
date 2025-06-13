import z, { number } from "zod";
import { ContestMedia } from "@prisma/client";
export const CreateMediaShema = z.object({
  url: z.string().min(1, "Vui lòng hình ảnh"),
  type: z.nativeEnum(ContestMedia),
  contestId: z.number(),
});

export const MediaIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateMediahema = z.object({
  url: z.string().min(1, "Vui lòng hình ảnh").optional(),
  type: z.nativeEnum(ContestMedia).optional(),
});

export const deleteMediaesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});
export type CreateMediaInput = z.infer<typeof CreateMediaShema>;
export type MediaIdParams = z.infer<typeof MediaIdShame>;
export type UpdateMediaInput = z.infer<typeof UpdeateMediahema>;
