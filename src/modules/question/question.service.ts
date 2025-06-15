import { PrismaClient, Question, QuestionType, Difficulty } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import path from "path";
import fs from "fs";
import {
  CreateQuestionData,
  UpdateQuestionData,
  GetQuestionsQuery,
  QuestionResponse,
  QuestionListResponse,
  BatchDeleteResult,
  MediaFile,
  MediaUploadResult,
  MediaType
} from "./question.schema";
import {
  detectMediaType,
  detectMediaTypeFromMime,
  moveFileFromTemp,
  cleanupTempFiles,
  getQuestionMediaPath,
  getQuestionMediaUrl,
  validateFileSize,
  getMediaDimensions,
  getMediaDuration,
  TMP_UPLOAD_DIR
} from "./question.upload";

export class QuestionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process uploaded media files
   */
  private async processMediaFiles(files: Express.Multer.File[]): Promise<MediaFile[]> {
    const processedFiles: MediaFile[] = [];
    const tempFilesToCleanup: string[] = [];

    try {
      for (const file of files) {
        // Validate file size based on media type
        validateFileSize(file);

        const mediaType = detectMediaTypeFromMime(file.mimetype);
        const tempPath = file.path;
        const permanentPath = getQuestionMediaPath(file.filename);

        // Move file from temp to permanent location
        await moveFileFromTemp(tempPath, permanentPath);

        // Get additional media info
        const dimensions = await getMediaDimensions(permanentPath, mediaType);
        const duration = await getMediaDuration(permanentPath, mediaType);

        const mediaFile: MediaFile = {
          type: mediaType,
          url: getQuestionMediaUrl(file.filename),
          filename: file.filename,
          size: file.size,
          mimeType: file.mimetype,
          ...(duration && { duration }),
          ...(dimensions && { dimensions })
        };

        processedFiles.push(mediaFile);
        logger.info(`Processed media file: ${file.filename}, type: ${mediaType}`);
      }

      return processedFiles;
    } catch (error) {
      // Clean up any uploaded files on error
      tempFilesToCleanup.push(...files.map(f => f.path));
      cleanupTempFiles(tempFilesToCleanup);

      logger.error("Error processing media files:", error);
      throw new CustomError("Lỗi xử lý file media", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete media files from storage
   */
  private async deleteMediaFiles(mediaFiles: MediaFile[]): Promise<void> {
    for (const mediaFile of mediaFiles) {
      try {
        const filePath = getQuestionMediaPath(mediaFile.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted media file: ${mediaFile.filename}`);
        }
      } catch (error) {
        logger.error(`Error deleting media file ${mediaFile.filename}:`, error);
      }
    }
  }

  /**
   * Get questions with pagination and filtering
   */
  async getQuestions(query: GetQuestionsQuery): Promise<QuestionListResponse> {
    try {
      const {
        page,
        limit,
        search,
        questionTopicId,
        questionType,
        difficulty,
        hasMedia,
        isActive,
        sortBy,
        sortOrder
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};      // Apply filters
      if (search) {
        where.OR = [
          { content: { contains: search } },
          { explanation: { contains: search } }
        ];
      }

      if (questionTopicId) {
        where.questionTopicId = questionTopicId;
      }

      if (questionType) {
        where.questionType = questionType;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (hasMedia !== undefined) {
        if (hasMedia) {
          where.OR = [
            { questionMedia: { not: null } },
            { mediaAnswer: { not: null } }
          ];
        } else {
          where.AND = [
            { questionMedia: null },
            { mediaAnswer: null }
          ];
        }
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get total count
      const total = await this.prisma.question.count({ where });

      // Get questions
      const questions = await this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          questionTopic: {
            select: {
              id: true,
              name: true
            }
          },
          questionDetails: {
            select: {
              questionPackageId: true,
              questionOrder: true,
              questionPackage: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      const totalPages = Math.ceil(total / limit);

      return {
        questions: questions as QuestionResponse[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error("Error getting questions:", error);
      throw new CustomError("Lỗi khi lấy danh sách câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(id: number): Promise<QuestionResponse> {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id },
        include: {
          questionTopic: {
            select: {
              id: true,
              name: true
            }
          },
          questionDetails: {
            select: {
              questionPackageId: true,
              questionOrder: true,
              questionPackage: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!question) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }

      return question as QuestionResponse;
    } catch (error) {
      logger.error("Error getting question by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi lấy thông tin câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create new question
   */
  async createQuestion(data: CreateQuestionData, uploadedFiles?: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] }): Promise<QuestionResponse> {
    try {
      // Validate question topic exists
      const questionTopic = await this.prisma.questionTopic.findUnique({
        where: { id: data.questionTopicId }
      });
      if (!questionTopic) {
        throw new CustomError("Question Topic không tồn tại", 404, ERROR_CODES.QUESTION_TOPIC_NOT_FOUND);      }      // Validate options for multiple choice questions
      if (data.questionType === QuestionType.multiple_choice && !data.options) {
        throw new CustomError("Câu hỏi trắc nghiệm phải có options", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Process uploaded media files
      let questionMedia: MediaFile[] | null = null;
      let mediaAnswer: MediaFile[] | null = null;

      if (uploadedFiles?.questionMedia) {
        questionMedia = await this.processMediaFiles(uploadedFiles.questionMedia);
      }

      if (uploadedFiles?.mediaAnswer) {
        mediaAnswer = await this.processMediaFiles(uploadedFiles.mediaAnswer);
      }

      // Create question
      const question = await this.prisma.question.create({
        data: {
          intro: data.intro,
          defaultTime: data.defaultTime,
          questionType: data.questionType,
          content: data.content,
          questionMedia: questionMedia || undefined,
          options: data.options || undefined,
          correctAnswer: data.correctAnswer,
          mediaAnswer: mediaAnswer || undefined,
          score: data.score,
          difficulty: data.difficulty,
          explanation: data.explanation,
          questionTopicId: data.questionTopicId
        },
        include: {
          questionTopic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Question created successfully with ID: ${question.id}`);
      return question as QuestionResponse;
    } catch (error) {
      logger.error("Error creating question:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi tạo câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update question (PATCH method)
   */
  async updateQuestion(id: number, data: UpdateQuestionData, uploadedFiles?: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] }): Promise<QuestionResponse> {
    try {
      // Check if question exists
      const existingQuestion = await this.prisma.question.findUnique({
        where: { id }
      });
      if (!existingQuestion) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }

      // Validate question topic if provided
      if (data.questionTopicId) {
        const questionTopic = await this.prisma.questionTopic.findUnique({
          where: { id: data.questionTopicId }
        });
        if (!questionTopic) {
          throw new CustomError("Question Topic không tồn tại", 404, ERROR_CODES.QUESTION_TOPIC_NOT_FOUND);
        }      }      // Validate options for multiple choice questions
      if (data.questionType === QuestionType.multiple_choice && data.options === null) {
        throw new CustomError("Câu hỏi trắc nghiệm phải có options", 400, ERROR_CODES.VALIDATION_ERROR);
      }      // Process uploaded media files and handle null values
      let questionMedia: MediaFile[] | null = null;
      let mediaAnswer: MediaFile[] | null = null;
      let shouldUpdateQuestionMedia = false;
      let shouldUpdateMediaAnswer = false;

      // Handle questionMedia updates
      if (uploadedFiles?.questionMedia) {
        // Delete old question media files
        if (existingQuestion.questionMedia) {
          const oldQuestionMedia = existingQuestion.questionMedia as MediaFile[];
          await this.deleteMediaFiles(oldQuestionMedia);
        }
        questionMedia = await this.processMediaFiles(uploadedFiles.questionMedia);
        shouldUpdateQuestionMedia = true;
      } else if (data.questionMedia === null) {
        // Frontend explicitly wants to remove questionMedia
        if (existingQuestion.questionMedia) {
          const oldQuestionMedia = existingQuestion.questionMedia as MediaFile[];
          await this.deleteMediaFiles(oldQuestionMedia);
        }
        questionMedia = null;
        shouldUpdateQuestionMedia = true;
      }

      // Handle mediaAnswer updates
      if (uploadedFiles?.mediaAnswer) {
        // Delete old media answer files
        if (existingQuestion.mediaAnswer) {
          const oldMediaAnswer = existingQuestion.mediaAnswer as MediaFile[];
          await this.deleteMediaFiles(oldMediaAnswer);
        }
        mediaAnswer = await this.processMediaFiles(uploadedFiles.mediaAnswer);
        shouldUpdateMediaAnswer = true;
      } else if (data.mediaAnswer === null) {
        // Frontend explicitly wants to remove mediaAnswer
        if (existingQuestion.mediaAnswer) {
          const oldMediaAnswer = existingQuestion.mediaAnswer as MediaFile[];
          await this.deleteMediaFiles(oldMediaAnswer);
        }
        mediaAnswer = null;
        shouldUpdateMediaAnswer = true;
      }      // Prepare update data
      const updateData: any = {};

      if (data.intro !== undefined) updateData.intro = data.intro;
      if (data.defaultTime !== undefined) updateData.defaultTime = data.defaultTime;
      if (data.questionType !== undefined) updateData.questionType = data.questionType;
      if (data.content !== undefined) updateData.content = data.content;
      if (shouldUpdateQuestionMedia) updateData.questionMedia = questionMedia;
      if (data.options !== undefined) updateData.options = data.options;
      if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
      if (shouldUpdateMediaAnswer) updateData.mediaAnswer = mediaAnswer;
      if (data.score !== undefined) updateData.score = data.score;
      if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
      if (data.explanation !== undefined) updateData.explanation = data.explanation;
      if (data.questionTopicId !== undefined) updateData.questionTopicId = data.questionTopicId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updatedQuestion = await this.prisma.question.update({
        where: { id },
        data: updateData,
        include: {
          questionTopic: {
            select: {
              id: true,
              name: true
            }
          },
          questionDetails: {
            select: {
              questionPackageId: true,
              questionOrder: true,
              questionPackage: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      logger.info(`Question updated successfully with ID: ${updatedQuestion.id}`);
      return updatedQuestion as QuestionResponse;
    } catch (error) {
      logger.error("Error updating question:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi cập nhật câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Soft delete question
   */
  async deleteQuestion(id: number): Promise<void> {
    try {
      const existingQuestion = await this.prisma.question.findUnique({
        where: { id }
      });
      if (!existingQuestion) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }

      await this.prisma.question.update({
        where: { id },
        data: { isActive: !existingQuestion.isActive }
      });

      logger.info(`Question soft deleted successfully with ID: ${id}`);
    } catch (error) {
      logger.error("Error soft deleting question:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi xóa câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Hard delete question
   */
  async hardDeleteQuestion(id: number): Promise<void> {
    try {
      const existingQuestion = await this.prisma.question.findUnique({
        where: { id }
      });
      if (!existingQuestion) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }      // Delete associated media files
      if (existingQuestion.questionMedia) {
        const questionMedia = existingQuestion.questionMedia as MediaFile[];
        await this.deleteMediaFiles(questionMedia);
      }

      if (existingQuestion.mediaAnswer) {
        const mediaAnswer = existingQuestion.mediaAnswer as MediaFile[];
        await this.deleteMediaFiles(mediaAnswer);
      }

      await this.prisma.question.delete({
        where: { id }
      });

      logger.info(`Question hard deleted successfully with ID: ${id}`);
    } catch (error) {
      logger.error("Error hard deleting question:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi xóa vĩnh viễn câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Batch delete questions
   */
  async batchDeleteQuestions(ids: number[], hardDelete: boolean = true): Promise<BatchDeleteResult> {
    try {
      const successIds: number[] = [];
      const failedIds: number[] = [];
      const errors: Array<{ id: number; error: string }> = [];

      for (const id of ids) {
        try {
          if (hardDelete) {
            await this.hardDeleteQuestion(id);
          } else {
            await this.deleteQuestion(id);
          }
          successIds.push(id);
        } catch (error) {
          failedIds.push(id);
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Lỗi không xác định"
          });
          logger.error(`Error deleting question with ID ${id}:`, error);
        }
      }

      const result: BatchDeleteResult = {
        successIds,
        failedIds,
        errors
      };

      logger.info(`Batch delete completed. Success: ${successIds.length}, Failed: ${failedIds.length}, Hard delete: ${hardDelete}`);
      return result;
    } catch (error) {
      logger.error("Error in batch delete questions:", error);
      throw new CustomError("Lỗi khi xóa nhiều câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload media for existing question
   */
  async uploadMediaForQuestion(questionId: number, mediaType: 'questionMedia' | 'mediaAnswer', files: Express.Multer.File[]): Promise<MediaUploadResult> {
    try {
      const existingQuestion = await this.prisma.question.findUnique({
        where: { id: questionId }
      });
      if (!existingQuestion) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }

      // Process uploaded files
      const uploadedFiles = await this.processMediaFiles(files);

      // Delete old media files of the same type
      const existingMediaData = mediaType === 'questionMedia'
        ? existingQuestion.questionMedia
        : existingQuestion.mediaAnswer; if (existingMediaData) {
          const oldMediaFiles = existingMediaData as MediaFile[];
          await this.deleteMediaFiles(oldMediaFiles);
        }

      // Update question with new media
      const updateData: any = {};
      updateData[mediaType] = uploadedFiles;

      await this.prisma.question.update({
        where: { id: questionId },
        data: updateData
      });

      logger.info(`Media uploaded successfully for question ${questionId}, type: ${mediaType}`);

      return {
        success: true,
        uploadedFiles,
        errors: []
      };
    } catch (error) {
      logger.error("Error uploading media for question:", error);

      // Clean up uploaded files on error
      cleanupTempFiles(files.map(f => f.path));

      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Lỗi khi upload media cho câu hỏi", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}
