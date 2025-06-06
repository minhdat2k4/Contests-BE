import { prisma } from "@/config/database";
import { QuestionPackage } from "@prisma/client";
import {
  CreateQuestionPackageInput,
  UpdateQuestionPackageInput,
  QuestionPackageQueryInput,
  QuestionPackageResponse,
  QuestionPackageDetailResponse,
} from "./questionPackage.schema";

export default class QuestionPackageService {
  /**
   * Create a new question package
   */
  static async createQuestionPackage(
    data: CreateQuestionPackageInput
  ): Promise<QuestionPackage> {
    return prisma.questionPackage.create({
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Get question package by ID
   */
  static async getQuestionPackageById(
    id: number
  ): Promise<QuestionPackageDetailResponse | null> {
    const questionPackage = await prisma.questionPackage.findFirst({
      where: { id },
      include: {        questionDetails: {
          select: {
            questionOrder: true,
            isActive: true,
            question: {
              select: {
                id: true,
                plainText: true,
                questionType: true,
                difficulty: true,
              },
            },
          },
          where: {
            isActive: true,
          },
          orderBy: {
            questionOrder: 'asc',
          },
        },
        matches: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
          where: { isActive: true },
        },
        _count: {
          select: { 
            questionDetails: true,
            matches: true,
          },
        },
      },
    });

    if (!questionPackage) return null;

    return {
      id: questionPackage.id,
      name: questionPackage.name,
      isActive: questionPackage.isActive,
      questionDetailsCount: questionPackage._count.questionDetails,
      matchesCount: questionPackage._count.matches,
      createdAt: questionPackage.createdAt,
      updatedAt: questionPackage.updatedAt,
      questionDetails: questionPackage.questionDetails,
      matches: questionPackage.matches,
    };
  }

  /**
   * Update question package
   */
  static async updateQuestionPackage(
    id: number,
    data: UpdateQuestionPackageInput
  ): Promise<QuestionPackage | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return prisma.questionPackage.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete question package (set isActive to false)
   */
  static async deleteQuestionPackage(id: number): Promise<QuestionPackage | null> {
    return prisma.questionPackage.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Check if question package exists
   */
  static async questionPackageExists(id: number): Promise<boolean> {
    const questionPackage = await prisma.questionPackage.findFirst({
      where: { id },
    });
    return !!questionPackage;
  }

  /**
   * Check if question package name already exists
   */
  static async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { name };
    
    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const questionPackage = await prisma.questionPackage.findFirst({
      where: whereClause,
    });
    return !!questionPackage;
  }

  /**
   * Get all question packages with pagination and filtering
   */
  static async getAllQuestionPackages(
    queryInput: QuestionPackageQueryInput
  ): Promise<{
    questionPackages: QuestionPackageResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Apply defaults if values are undefined
    const page = queryInput.page || 1;
    const limit = queryInput.limit || 10;
    const search = queryInput.search;
    const isActive = queryInput.isActive;
    const sortBy = queryInput.sortBy || "createdAt";
    const sortOrder = queryInput.sortOrder || "desc";
    
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Apply filters
    if (search) {
      whereClause.name = {
        contains: search,
      };
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    // Count total records
    const total = await prisma.questionPackage.count({
      where: whereClause,
    });

    // Get paginated results
    const questionPackages = await prisma.questionPackage.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: { 
            questionDetails: true,
            matches: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      questionPackages: questionPackages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        isActive: pkg.isActive,
        questionDetailsCount: pkg._count.questionDetails,
        matchesCount: pkg._count.matches,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get active question packages (for dropdown/select)
   */
  static async getActiveQuestionPackages(): Promise<
    Array<{ id: number; name: string }>
  > {
    return prisma.questionPackage.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
