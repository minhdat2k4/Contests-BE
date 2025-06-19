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
    console.log('=== DEBUG: Bắt đầu processMediaFiles ===');
    console.log('Số lượng files:', files.length);
    
    const processedFiles: MediaFile[] = [];
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 giây
    
    // Hàm helper để delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Hàm helper để retry operation
    const retryOperation = async <T>(
      operation: () => Promise<T>,
      retries: number = MAX_RETRIES,
      delayMs: number = RETRY_DELAY
    ): Promise<T> => {
      try {
        return await operation();
      } catch (error: any) {
        if (retries === 0) throw error;
        console.log(`Operation failed, retrying... (${retries} attempts left)`);
        await delay(delayMs);
        return retryOperation(operation, retries - 1, delayMs);
      }
    };

    try {
      // Đảm bảo thư mục uploads/questions tồn tại
      const uploadDir = path.join(process.cwd(), 'uploads', 'questions');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      
      for (const file of files) {
        try {
          console.log(`Đang xử lý file: ${file.originalname}`);
          console.log('File details:', {
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          });

          // Kiểm tra file tạm có tồn tại không với retry
          await retryOperation(async () => {
            try {
              await fs.promises.access(file.path, fs.constants.F_OK);
            } catch (error: any) {
              throw new Error(`File tạm không tồn tại: ${file.path}`);
            }
          });

          // Validate file size
          validateFileSize(file);
          console.log('File size validation passed:', file.originalname);

          // Move file from temp to uploads directory
          const permanentPath = getQuestionMediaPath(file.filename);
          
          // Đảm bảo thư mục đích tồn tại
          const destDir = path.dirname(permanentPath);
          await fs.promises.mkdir(destDir, { recursive: true });

          // Xử lý file với retry
          await retryOperation(async () => {
            // Đọc file tạm
            const fileContent = await fs.promises.readFile(file.path);
            
            // Ghi file vào thư mục đích
            await fs.promises.writeFile(permanentPath, fileContent);
            
            // Xóa file tạm sau khi copy thành công
            await fs.promises.unlink(file.path);
          });
          
          console.log('File processed successfully:', {
            from: file.path,
            to: permanentPath
          });

          // Detect media type
          const mediaType = detectMediaTypeFromMime(file.mimetype);
          console.log('Media type detected:', mediaType);

          // Get media dimensions/duration if applicable
          let dimensions;
          let duration;
          
          if (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO) {
            dimensions = await retryOperation(async () => 
              getMediaDimensions(permanentPath, mediaType)
            );
            console.log('Media dimensions:', dimensions);
          }
          
          if (mediaType === MediaType.VIDEO || mediaType === MediaType.AUDIO) {
            duration = await retryOperation(async () => 
              getMediaDuration(permanentPath, mediaType)
            );
            console.log('Media duration:', duration);
          }

          const mediaFile: MediaFile = {
            type: mediaType,
            url: getQuestionMediaUrl(file.filename),
            filename: file.filename,
            size: file.size,
            mimeType: file.mimetype,
            ...(dimensions && { dimensions }),
            ...(duration && { duration })
          };

          console.log('Processed media file:', {
            filename: mediaFile.filename,
            type: mediaFile.type,
            size: mediaFile.size
          });

          processedFiles.push(mediaFile);
        } catch (error: any) {
          console.error(`Error processing file ${file.originalname}:`, {
            error: error.message,
            code: error.code,
            path: file.path
          });
          
          // Clean up the file if it exists
          try {
            await fs.promises.access(file.path, fs.constants.F_OK);
            await fs.promises.unlink(file.path);
          } catch (cleanupError: any) {
            console.error(`Failed to cleanup file ${file.path}:`, cleanupError);
          }
          
          throw new CustomError(
            `Lỗi xử lý file media: ${error.message}`,
            500,
            ERROR_CODES.INTERNAL_SERVER_ERROR
          );
        }
      }

      console.log('=== DEBUG: Kết thúc processMediaFiles ===');
      console.log('Số lượng files đã xử lý:', processedFiles.length);
      return processedFiles;
    } catch (error: any) {
      console.error('Error in processMediaFiles:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new CustomError(
        `Lỗi xử lý file media: ${error.message}`,
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Hàm helper để chuẩn hóa tên file
   */
  private normalizeFilename(filename: string | string[]): string[] {
    // Nếu filename là mảng, xử lý từng phần tử
    if (Array.isArray(filename)) {
      return filename.flatMap(f => this.normalizeFilename(f));
    }

    // Nếu filename là string
    if (typeof filename === 'string') {
      try {
        // Loại bỏ dấu ngoặc vuông và dấu ngoặc kép nếu có
        let cleanFilename = filename.replace(/^\["|"\]$/g, '');
        
        // Nếu có nhiều file được phân tách bằng dấu phẩy và dấu ngoặc kép
        if (cleanFilename.includes('","')) {
          return cleanFilename.split('","').map(f => f.replace(/^"|"$/g, ''));
        }
        
        // Thử parse JSON nếu còn dấu ngoặc kép
        if (cleanFilename.startsWith('"') && cleanFilename.endsWith('"')) {
          const parsed = JSON.parse(cleanFilename);
          if (typeof parsed === 'string') {
            return [parsed];
          } else if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string');
          }
        }
        
        return [cleanFilename];
      } catch (e) {
        // Nếu không parse được, thử tách chuỗi bằng dấu phẩy
        const parts = filename.split(',');
        if (parts.length > 1) {
          return parts.map(part => part.trim().replace(/^\["|"\]$/g, ''));
        }
        return [filename.replace(/^\["|"\]$/g, '')];
      }
    }
    return [filename];
  }

  /**
   * Delete media files from storage
   */
  private async deleteMediaFiles(mediaFiles: MediaFile[]): Promise<void> {
    for (const mediaFile of mediaFiles) {
      try {
        // Chuẩn hóa tên file trước khi xóa
        const normalizedFilenames = this.normalizeFilename(mediaFile.filename);
        
        for (const normalizedFilename of normalizedFilenames) {
          const filePath = getQuestionMediaPath(normalizedFilename);
          
          console.log('Attempting to delete file:', {
            originalFilename: mediaFile.filename,
            normalizedFilename,
            fullPath: filePath
          });
  
          try {
            // Kiểm tra file có tồn tại không
            await fs.promises.access(filePath, fs.constants.F_OK);
            console.log('File exists, proceeding with deletion');
  
            // Thử xóa file
            await fs.promises.unlink(filePath);
            console.log('Successfully deleted file:', normalizedFilename);
            logger.info(`Deleted media file: ${normalizedFilename}`);
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              console.log('File does not exist:', normalizedFilename);
              logger.info(`Media file not found for deletion: ${normalizedFilename}`);
            } else {
              console.error('Error deleting file:', {
                filename: normalizedFilename,
                error: error.message,
                code: error.code
              });
              logger.error(`Error deleting media file ${normalizedFilename}:`, error);
            }
          }
        }
      } catch (error: any) {
        console.error('Unexpected error in deleteMediaFiles:', {
          filename: mediaFile.filename,
          error: error.message,
          code: error.code
        });
        logger.error(`Unexpected error deleting media file ${mediaFile.filename}:`, error);
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
      console.log('=== DEBUG: Bắt đầu updateQuestion ===');
      console.log('Question ID:', id);
      console.log('Data:', data);
      console.log('Uploaded files:', {
        questionMedia: uploadedFiles?.questionMedia?.length || 0,
        mediaAnswer: uploadedFiles?.mediaAnswer?.length || 0
      });

      // Check if question exists
      const existingQuestion = await this.prisma.question.findUnique({
        where: { id }
      });
      if (!existingQuestion) {
        throw new CustomError("Câu hỏi không tồn tại", 404, ERROR_CODES.QUESTION_NOT_FOUND);
      }
      console.log('Existing question found:', existingQuestion.id);

      // Validate question topic if provided
      if (data.questionTopicId) {
        const questionTopic = await this.prisma.questionTopic.findUnique({
          where: { id: data.questionTopicId }
        });
        if (!questionTopic) {
          throw new CustomError("Question Topic không tồn tại", 404, ERROR_CODES.QUESTION_TOPIC_NOT_FOUND);
        }
        console.log('Question topic validated:', questionTopic.id);
      }

      // Process uploaded media files
      let questionMedia: MediaFile[] | null = null;
      let mediaAnswer: MediaFile[] | null = null;

      // Xử lý xóa media khi có deleteQuestionMedia hoặc deleteMediaAnswer
      if (data.deleteQuestionMedia && Array.isArray(data.deleteQuestionMedia)) {
        console.log('Deleting specified questionMedia files:', data.deleteQuestionMedia);
        
        // Chuẩn hóa tên file trước khi xử lý
        const normalizedFilenames = data.deleteQuestionMedia.flatMap(filename => 
          this.normalizeFilename(filename)
        ).filter(filename => filename && filename.trim() !== ''); // Filter ra filename rỗng
        console.log('Normalized filenames for deletion:', normalizedFilenames);
        
        if (normalizedFilenames.length > 0) {
          const filesToDelete = normalizedFilenames.map(filename => ({
            filename,
            type: detectMediaType(filename),
            url: getQuestionMediaUrl(filename),
            size: 0,
            mimeType: ''
          }));
          await this.deleteMediaFiles(filesToDelete);
          
          // Cập nhật questionMedia bằng cách loại bỏ các file đã xóa
          if (existingQuestion.questionMedia) {
            const existingMedia = existingQuestion.questionMedia as MediaFile[];
            questionMedia = existingMedia.filter(media => 
              !normalizedFilenames.includes(media.filename)
            );
          }
        }
      } else {
        // Nếu không có deleteQuestionMedia, giữ nguyên questionMedia hiện có
        questionMedia = existingQuestion.questionMedia as MediaFile[] || [];
      }

      if (data.deleteMediaAnswer && Array.isArray(data.deleteMediaAnswer)) {
        console.log('Deleting specified mediaAnswer files:', data.deleteMediaAnswer);
        
        // Chuẩn hóa tên file trước khi xử lý
        const normalizedFilenames = data.deleteMediaAnswer.flatMap(filename => 
          this.normalizeFilename(filename)
        ).filter(filename => filename && filename.trim() !== ''); // Filter ra filename rỗng
        console.log('Normalized filenames for deletion:', normalizedFilenames);
        
        if (normalizedFilenames.length > 0) {
          const filesToDelete = normalizedFilenames.map(filename => ({
            filename,
            type: detectMediaType(filename),
            url: getQuestionMediaUrl(filename),
            size: 0,
            mimeType: ''
          }));
          await this.deleteMediaFiles(filesToDelete);
          
          // Cập nhật mediaAnswer bằng cách loại bỏ các file đã xóa
          if (existingQuestion.mediaAnswer) {
            const existingMedia = existingQuestion.mediaAnswer as MediaFile[];
            mediaAnswer = existingMedia.filter(media => 
              !normalizedFilenames.includes(media.filename)
            );
          }
        }
      } else {
        // Nếu không có deleteMediaAnswer, giữ nguyên mediaAnswer hiện có
        mediaAnswer = existingQuestion.mediaAnswer as MediaFile[] || [];
      }

      // Xử lý merge questionMedia từ frontend với questionMedia hiện có (sau khi xóa)
      if (data.questionMedia && Array.isArray(data.questionMedia)) {
        console.log('Merging questionMedia from frontend:', data.questionMedia.length);
        // Merge questionMedia hiện có với questionMedia từ frontend
        const frontendMedia = data.questionMedia as MediaFile[];
        questionMedia = [...(questionMedia || []), ...frontendMedia];
        console.log('Total questionMedia after merge:', questionMedia.length);
      }

      // Xử lý merge mediaAnswer từ frontend với mediaAnswer hiện có (sau khi xóa)
      if (data.mediaAnswer && Array.isArray(data.mediaAnswer)) {
        console.log('Merging mediaAnswer from frontend:', data.mediaAnswer.length);
        // Merge mediaAnswer hiện có với mediaAnswer từ frontend
        const frontendMediaAnswer = data.mediaAnswer as MediaFile[];
        mediaAnswer = [...(mediaAnswer || []), ...frontendMediaAnswer];
        console.log('Total mediaAnswer after merge:', mediaAnswer.length);
      }

      // Xử lý xóa media khi data.questionMedia hoặc data.mediaAnswer được set thành null
      if (data.questionMedia === null) {
        if (existingQuestion.questionMedia) {
          const oldQuestionMedia = existingQuestion.questionMedia as MediaFile[];
          console.log('Deleting all questionMedia files:', oldQuestionMedia.length);
          await this.deleteMediaFiles(oldQuestionMedia);
        }
        questionMedia = null;
      }

      if (data.mediaAnswer === null) {
        if (existingQuestion.mediaAnswer) {
          const oldMediaAnswer = existingQuestion.mediaAnswer as MediaFile[];
          console.log('Deleting all mediaAnswer files:', oldMediaAnswer.length);
          await this.deleteMediaFiles(oldMediaAnswer);
        }
        mediaAnswer = null;
      }

      // Chỉ xử lý file nếu có uploadedFiles
      if (uploadedFiles) {
        if (uploadedFiles.questionMedia) {
          console.log('Processing questionMedia files...');
          const newQuestionMedia = await this.processMediaFiles(uploadedFiles.questionMedia);
          console.log('New questionMedia files processed:', newQuestionMedia.length);
          // Merge với questionMedia hiện có
          questionMedia = [...(questionMedia || []), ...newQuestionMedia];
          console.log('Total questionMedia after adding new files:', questionMedia.length);
        }

        if (uploadedFiles.mediaAnswer) {
          console.log('Processing mediaAnswer files...');
          const newMediaAnswer = await this.processMediaFiles(uploadedFiles.mediaAnswer);
          console.log('New mediaAnswer files processed:', newMediaAnswer.length);
          // Merge với mediaAnswer hiện có
          mediaAnswer = [...(mediaAnswer || []), ...newMediaAnswer];
          console.log('Total mediaAnswer after adding new files:', mediaAnswer.length);
        }
      }

      // Prepare update data
      const updateData: any = {};
      console.log('Preparing update data...');

      if (data.intro !== undefined) updateData.intro = data.intro;
      if (data.defaultTime !== undefined) updateData.defaultTime = data.defaultTime;
      if (data.questionType !== undefined) updateData.questionType = data.questionType;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.options !== undefined) updateData.options = data.options;
      if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
      if (data.score !== undefined) updateData.score = data.score;
      if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
      if (data.explanation !== undefined) updateData.explanation = data.explanation;
      if (data.questionTopicId !== undefined) updateData.questionTopicId = data.questionTopicId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Luôn cập nhật questionMedia và mediaAnswer nếu đã được xử lý
      if (questionMedia !== null) updateData.questionMedia = questionMedia;
      if (mediaAnswer !== null) updateData.mediaAnswer = mediaAnswer;

      console.log('Update data prepared:', {
        fields: Object.keys(updateData),
        hasQuestionMedia: !!updateData.questionMedia,
        hasMediaAnswer: !!updateData.mediaAnswer
      });

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

      console.log('=== DEBUG: Kết thúc updateQuestion ===');
      console.log('Question updated successfully:', updatedQuestion.id);
      return updatedQuestion as QuestionResponse;
    } catch (error) {
      console.error('=== DEBUG: Lỗi trong updateQuestion ===');
      console.error('Error details:', error);
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
