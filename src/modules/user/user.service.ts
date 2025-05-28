import { prisma } from '@/config/database';
import { CreateUserInput, UpdateUserInput, GetUsersQuery } from './user.schema';
import { createError } from '@/middlewares/errorHandler';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';

export class UserService {
  private static readonly SALT_ROUNDS = 12;

  // Create a new user
  static async createUser(data: CreateUserInput): Promise<Omit<User, 'password'>> {
    try {
      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingEmail) {
        throw createError('EMAIL_ALREADY_EXISTS', 409);
      }

      // Check if username already exists
      const existingUsername = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUsername) {
        throw createError('USERNAME_ALREADY_EXISTS', 409);
      }      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Prepare data for Prisma create
      const createData: any = {
        email: data.email,
        username: data.username,
        password: hashedPassword,
      };

      // Only add optional fields if they exist
      if (data.firstName !== undefined) {
        createData.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        createData.lastName = data.lastName;
      }

      // Create user
      const user = await prisma.user.create({
        data: createData,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw createError('USER_NOT_FOUND', 404);
      }

      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Get user by email or username (for login)
  static async getUserByIdentifier(identifier: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier },
          ],
        },
      });

      return user;
    } catch (error) {
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Get all users with pagination and filtering
  static async getUsers(query: GetUsersQuery) {
    try {
      const { page, limit, search, role, isActive, sortBy, sortOrder } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isActive: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Update user
  static async updateUser(id: string, data: UpdateUserInput): Promise<Omit<User, 'password'>> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw createError('USER_NOT_FOUND', 404);
      }

      // Check email uniqueness if email is being updated
      if (data.email && data.email !== existingUser.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingEmail) {
          throw createError('EMAIL_ALREADY_EXISTS', 409);
        }
      }

      // Check username uniqueness if username is being updated
      if (data.username && data.username !== existingUser.username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: data.username },
        });

        if (existingUsername) {
          throw createError('USERNAME_ALREADY_EXISTS', 409);
        }
      }      // Prepare data for Prisma update (only include defined fields)
      const updateData: any = {};
      
      if (data.email !== undefined) {
        updateData.email = data.email;
      }
      if (data.username !== undefined) {
        updateData.username = data.username;
      }
      if (data.firstName !== undefined) {
        updateData.firstName = data.firstName;
      }
      if (data.lastName !== undefined) {
        updateData.lastName = data.lastName;
      }
      if (data.avatar !== undefined) {
        updateData.avatar = data.avatar;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Delete user
  static async deleteUser(id: string): Promise<void> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw createError('USER_NOT_FOUND', 404);
      }

      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('DATABASE_ERROR', 500);
    }
  }

  // Verify password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
