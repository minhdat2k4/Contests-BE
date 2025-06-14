import { z } from "zod";

// Create Result Schema
export const createResultSchema = z.object({
  name: z.string()
    .min(1, "Tên kết quả không được để trống")
    .max(255, "Tên kết quả không được quá 255 ký tự"),
  contestantId: z.number()
    .int("Contestant ID phải là số nguyên")
    .positive("Contestant ID phải là số dương"),
  matchId: z.number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương"),
  isCorrect: z.boolean()
    .default(true),
  questionOrder: z.number()
    .int("Question order phải là số nguyên")
    .positive("Question order phải là số dương")
});

// Update Result Schema (PATCH method)
export const updateResultSchema = z.object({
  name: z.string()
    .min(1, "Tên kết quả không được để trống")
    .max(255, "Tên kết quả không được quá 255 ký tự")
    .optional(),
  contestantId: z.number()
    .int("Contestant ID phải là số nguyên")
    .positive("Contestant ID phải là số dương")
    .optional(),
  matchId: z.number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
  isCorrect: z.boolean()
    .optional(),
  questionOrder: z.number()
    .int("Question order phải là số nguyên")
    .positive("Question order phải là số dương")
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Ít nhất một trường cần được cập nhật"
  }
);

// Get Result by ID Schema
export const getResultByIdSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Get Results by Contestant Schema
export const getResultsByContestantSchema = z.object({
  contestantId: z.string()
    .regex(/^\d+$/, "Contestant ID phải là số")
    .transform(Number)
});

// Get Results by Match Schema
export const getResultsByMatchSchema = z.object({
  matchId: z.string()
    .regex(/^\d+$/, "Match ID phải là số")
    .transform(Number)
});

// Delete Result Schema
export const deleteResultSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Get Results Query Schema
export const getResultsQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, "Page phải là số")
    .transform(Number)
    .refine(val => val > 0, "Page phải lớn hơn 0")
    .default("1"),
  limit: z.string()
    .regex(/^\d+$/, "Limit phải là số")
    .transform(Number)
    .refine(val => val > 0 && val <= 100, "Limit phải từ 1-100")
    .default("10"),
  search: z.string().optional(),
  contestantId: z.string()
    .regex(/^\d+$/, "Contestant ID phải là số")
    .transform(Number)
    .optional(),
  matchId: z.string()
    .regex(/^\d+$/, "Match ID phải là số")
    .transform(Number)
    .optional(),
  isCorrect: z.string()
    .transform(val => val === "true")
    .optional(),
  questionOrder: z.string()
    .regex(/^\d+$/, "Question order phải là số")
    .transform(Number)
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "questionOrder"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
});

// Batch Delete Results Schema
export const batchDeleteResultsSchema = z.object({
  ids: z.array(z.number().int().positive())
    .min(1, "Danh sách ID không được để trống")
    .max(100, "Không thể xóa quá 100 kết quả cùng lúc")
});

// TypeScript Types
export type CreateResultData = z.infer<typeof createResultSchema>;
export type UpdateResultData = z.infer<typeof updateResultSchema>;
export type GetResultByIdParams = z.infer<typeof getResultByIdSchema>;
export type GetResultsByContestantParams = z.infer<typeof getResultsByContestantSchema>;
export type GetResultsByMatchParams = z.infer<typeof getResultsByMatchSchema>;
export type DeleteResultParams = z.infer<typeof deleteResultSchema>;
export type GetResultsQuery = z.infer<typeof getResultsQuerySchema>;
export type BatchDeleteResultsData = z.infer<typeof batchDeleteResultsSchema>;

// Response Types
export interface ResultResponse {
  id: number;
  name: string;
  contestantId: number;
  matchId: number;
  isCorrect: boolean;
  questionOrder: number;
  createdAt: Date;
  updatedAt: Date;
  contestant?: {
    id: number;
    name: string;
    studentId: number;
    student?: {
      id: number;
      fullName: string;
      studentCode: string | null;
    };
  };
  match?: {
    id: number;
    name: string;
    roundId: number;
    round?: {
      id: number;
      name: string;
    };
  };
}

export interface ResultListResponse {
  results: ResultResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BatchDeleteResult {
  successIds: number[];
  failedIds: number[];
  errors: Array<{
    id: number;
    error: string;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}
