import z from "zod";
export const CreateStudentShema = z.object({
  fullName: z
    .string({
      required_error: "Vui lòng nhập họ và tên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(255, "Tên lớp tối đa 255 kí tự"),
  classId: z
    .number({
      required_error: "Vui lòng nhập id lớp",
      invalid_type_error: "Id lớp là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id lớp là một số nguyên dương"),
  studentCode: z
    .string({
      required_error: "Vui lòng nhập mã số sinh viên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(12, "Tên lớp tối đa 12 kí tự")
    .optional(),
  isActive: z.boolean().optional(),
});

export const ClassIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateClasshema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên lớp",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên lớp")
    .max(255, "Tên lớp tối đa 255 kí tự")
    .optional(),
  isActive: z.boolean().optional(),
  schoolId: z
    .number({
      required_error: "Vui lòng nhập id trường",
      invalid_type_error: "Id trường là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id trường là một số nguyên dương")
    .optional(),
});

export const ClassQuerySchema = z.object({
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
  search: z
    .string()
    .min(2, "Từ khóa tìm kiếm phải có ít nhất 2 ký tự")
    .max(100, "Từ khóa tìm kiếm tối đa 100 ký tự")
    .optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === "true"),
  schoolId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id phải là số nguyên dương")
    .optional(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentShema>;
export type ClassIdParams = z.infer<typeof ClassIdShame>;
export type UpdateClassInput = z.infer<typeof UpdeateClasshema>;
export type ClassQueryInput = z.infer<typeof ClassQuerySchema>;
