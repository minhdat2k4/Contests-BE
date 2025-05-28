import { z } from 'zod';

// Base user schema
export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  username: z.string().min(3).max(20),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().default(true),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create user schema (for registration)
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be at most 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be at most 50 characters').optional(),
});

// Update user schema
export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url('Invalid URL format').optional(),
  isActive: z.boolean().optional(),
});

// Login schema
export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'), // Can be email or username
  password: z.string().min(1, 'Password is required'),
});

// Get user params schema
export const GetUserParamsSchema = z.object({
  id: z.string().cuid('Invalid user ID format'),
});

// Query schema for user list
export const GetUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'email', 'username']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type GetUserParams = z.infer<typeof GetUserParamsSchema>;
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
