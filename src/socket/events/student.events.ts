import { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";
import { timerService } from "../services/timer.service";

// Extended Socket interface for type safety
interface AuthenticatedSocket extends Socket {
  user: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  contestantId?: number;
  matchId?: number;
}

// Validation schemas
const JoinMatchSchema = z.object({
  matchId: z.number().int().positive()
});

const SubmitAnswerSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
  answer: z.string().min(1).max(500),
  submittedAt: z.string().datetime().optional()
});

const GetQuestionSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive()
});

// Match control schemas (for admin commands)
const StartMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const NextQuestionSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const TimerControlSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const EndMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

// Helper function to resolve match from either ID or slug
const resolveMatch = async (matchIdentifier: number | string) => {
  if (typeof matchIdentifier === 'number') {
    return await prisma.match.findUnique({
      where: { id: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true }
            }
          }
        },
        questionPackage: {
          select: { name: true }
        }
      }
    });
  } else {
    return await prisma.match.findFirst({
      where: { slug: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true }
            }
          }
        },
        questionPackage: {
          select: { name: true }
        }
      }
    });
  }
};

export const registerStudentEvents = (namespace: any, socket: AuthenticatedSocket) => {
  // Only allow Student role to access these events
  if (socket.user.role !== "Student") {
    return;
  }

  /**
   * MATCH CONTROL EVENTS FOR STUDENTS
   * These events allow students to also control matches (if they have permission)
   */

  /**
   * Event: match:start
   * Start a match and notify all participants
   */
  socket.on("match:start", async (data, callback) => {
    try {
      const validatedData = StartMatchSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [STUDENT] match:start received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [STUDENT] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      console.log('🔍 [STUDENT] Match found:', { id: match.id, slug: match.slug, name: match.name });

      // Update match status to active
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: { 
          status: "ongoing",
          currentQuestion: 0,
          remainingTime: 0
        }
      });

      const roomName = `match-${match.id}`;
      console.log('🔍 [STUDENT] About to emit match:started to room:', roomName);

      // Broadcast to both namespaces
      const io = namespace.server;
      io.of("/match-control").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });

      io.of("/student").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });

      console.log('🔍 [STUDENT] Event emitted successfully');

      logger.info(
        `✅ Match started by STUDENT: ${match.id} (${match.slug}) by ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Match started successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "ongoing"
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [STUDENT] Error in match:start:', errorMessage);
      logger.error(`❌ Error in student match:start: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to start match" });
    }
  });

  /**
   * Event: match:nextQuestion
   * Move to next question and start timer
   */
  socket.on("match:nextQuestion", async (data, callback) => {
    try {
      console.log('🔍 [STUDENT] match:nextQuestion received data:', data);
      
      const validatedData = NextQuestionSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [STUDENT] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Calculate next question order automatically
      const nextQuestionOrder = match.currentQuestion + 1;
      console.log('🔍 [STUDENT] Calculated next question order:', nextQuestionOrder);

      // Get question details
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: nextQuestionOrder
        },
        include: {
          question: true
        }
      });

      if (!questionDetail) {
        const error = "Question not found";
        console.log('🔍 [STUDENT] Question not found:', { 
          questionOrder: nextQuestionOrder, 
          packageId: match.questionPackageId 
        });
        logger.warn(`❌ ${error}: Order ${nextQuestionOrder} in package ${match.questionPackageId}`);
        return callback?.({ success: false, message: error });
      }

      // Update match with current question and reset timer
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetail.question.defaultTime
        }
      });

      // Start timer using timer service
      timerService.startTimer(match.id, questionDetail.question.defaultTime);

      const roomName = `match-${match.id}`;

      // Broadcast to both namespaces
      const io = namespace.server;
      io.of("/match-control").to(roomName).emit("match:questionChanged", {
        matchId: match.id,
        matchSlug: match.slug,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetail.question.defaultTime,
        currentQuestionData: {
          order: nextQuestionOrder,
          question: {
            id: questionDetail.question.id,
            intro: questionDetail.question.intro,
            content: questionDetail.question.content,
            questionType: questionDetail.question.questionType,
            difficulty: questionDetail.question.difficulty,
            defaultTime: questionDetail.question.defaultTime,
            score: questionDetail.question.score,
            options: questionDetail.question.options ? JSON.parse(questionDetail.question.options as string) : null,
            correctAnswer: questionDetail.question.correctAnswer
          }
        },
        changedBy: socket.user.username,
        changedAt: new Date().toISOString()
      });

      io.of("/student").to(roomName).emit("match:questionChanged", {
        matchId: match.id,
        matchSlug: match.slug,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetail.question.defaultTime,
        currentQuestionData: {
          order: nextQuestionOrder,
          question: {
            id: questionDetail.question.id,
            intro: questionDetail.question.intro,
            content: questionDetail.question.content,
            questionType: questionDetail.question.questionType,
            difficulty: questionDetail.question.difficulty,
            defaultTime: questionDetail.question.defaultTime,
            score: questionDetail.question.score,
            options: questionDetail.question.options ? JSON.parse(questionDetail.question.options as string) : null,
            correctAnswer: questionDetail.question.correctAnswer
          }
        },
        changedBy: socket.user.username,
        changedAt: new Date().toISOString()
      });

      logger.info(
        `✅ Question changed by STUDENT: Match ${match.id} (${match.slug}) | Question ${nextQuestionOrder} | By ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Question changed successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetail.question.defaultTime
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [STUDENT] Error caught:', errorMessage);
      logger.error(`❌ Error in student match:nextQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to change question" });
    }
  });

  /**
   * Event: match:pauseTimer
   * Pause the current question timer
   */
  socket.on("match:pauseTimer", async (data, callback) => {
    try {
      const validatedData = TimerControlSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Pause timer
      timerService.pauseTimer(match.id);

      const roomName = `match-${match.id}`;
      const io = namespace.server;

      // Broadcast to both namespaces
      io.of("/match-control").to(roomName).emit("match:timerPaused", {
        matchId: match.id,
        matchSlug: match.slug,
        pausedBy: socket.user.username,
        pausedAt: new Date().toISOString()
      });

      io.of("/student").to(roomName).emit("match:timerPaused", {
        matchId: match.id,
        matchSlug: match.slug,
        pausedBy: socket.user.username,
        pausedAt: new Date().toISOString()
      });

      logger.info(`⏸️ Timer paused by STUDENT for match ${match.id} (${match.slug}) by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer paused successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student match:pauseTimer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to pause timer" });
    }
  });

  /**
   * Event: match:resumeTimer
   * Resume the current question timer
   */
  socket.on("match:resumeTimer", async (data, callback) => {
    try {
      const validatedData = TimerControlSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Resume timer
      timerService.resumeTimer(match.id);

      const roomName = `match-${match.id}`;
      const io = namespace.server;

      // Broadcast to both namespaces
      io.of("/match-control").to(roomName).emit("match:timerResumed", {
        matchId: match.id,
        matchSlug: match.slug,
        resumedBy: socket.user.username,
        resumedAt: new Date().toISOString()
      });

      io.of("/student").to(roomName).emit("match:timerResumed", {
        matchId: match.id,
        matchSlug: match.slug,
        resumedBy: socket.user.username,
        resumedAt: new Date().toISOString()
      });

      logger.info(`▶️ Timer resumed by STUDENT for match ${match.id} (${match.slug}) by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer resumed successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student match:resumeTimer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to resume timer" });
    }
  });

  /**
   * Event: match:end
   * End the match and calculate results
   */
  socket.on("match:end", async (data, callback) => {
    try {
      const validatedData = EndMatchSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Stop timer
      timerService.stopTimer(match.id);

      // Update match status to completed
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: { 
          status: "finished",
          remainingTime: 0
        }
      });

      const roomName = `match-${match.id}`;
      const io = namespace.server;

      // Broadcast to both namespaces
      io.of("/match-control").to(roomName).emit("match:ended", {
        matchId: match.id,
        matchSlug: match.slug,
        status: "finished",
        endedBy: socket.user.username,
        endedAt: new Date().toISOString()
      });

      io.of("/student").to(roomName).emit("match:ended", {
        matchId: match.id,
        matchSlug: match.slug,
        status: "finished",
        endedBy: socket.user.username,
        endedAt: new Date().toISOString()
      });

      logger.info(
        `✅ Match ended by STUDENT: ${match.id} (${match.slug}) by ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Match ended successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "finished"
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student match:end: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to end match" });
    }
  });

  /**
   * ORIGINAL STUDENT EVENTS
   */

  /**
   * Event: student:joinMatch
   * Allows student to join a specific match room
   */
  socket.on("student:joinMatch", async (data, callback) => {
    try {
      // Validate input data
      const validatedData = JoinMatchSchema.parse(data);
      const { matchId } = validatedData;

      // Check if contestant exists and is part of this match
      const contestant = await prisma.contestant.findUnique({
        where: { id: socket.contestantId },
        include: {
          contest: {
            include: {
              round: {
                include: {
                  matches: {
                    where: { id: matchId }
                  }
                }
              }
            }
          }
        }
      });

      if (!contestant) {
        const error = "Contestant not found";
        logger.warn(`❌ ${error}: ${socket.contestantId}`);
        return callback?.({ success: false, message: error });
      }

      // Check if match exists in contestant's contest
      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          round: {
            contestId: contestant.contestId
          }
        }
      });

      if (!match) {
        const error = "Match not found or not accessible";
        logger.warn(`❌ ${error}: Match ${matchId} for contestant ${socket.contestantId}`);
        return callback?.({ success: false, message: error });
      }

      // Join the match room
      const roomName = `match-${matchId}`;
      await socket.join(roomName);
      socket.matchId = matchId;

      logger.info(
        `✅ Student joined match: ${socket.id} | Contestant: ${socket.contestantId} | Match: ${matchId}`
      );

      // Notify other clients in the room
      socket.to(roomName).emit("student:joinedMatch", {
        contestantId: socket.contestantId,
        studentName: socket.user.username,
        matchId: matchId,
        timestamp: new Date().toISOString()
      });

      callback?.({ 
        success: true, 
        message: "Successfully joined match",
        matchId: matchId,
        roomName: roomName
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student:joinMatch: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to join match" });
    }
  });

  /**
   * Event: student:submitAnswer
   * Handles answer submission from student
   */
  socket.on("student:submitAnswer", async (data, callback) => {
    try {
      // Validate input data
      const validatedData = SubmitAnswerSchema.parse(data);
      const { matchId, questionOrder, answer } = validatedData;

      console.log(`📝 [SUBMIT] Thí sinh ${socket.contestantId} gửi câu trả lời:`, {
        matchId,
        questionOrder,
        answer: answer.substring(0, 50) + '...',
        socketMatchId: socket.matchId
      });

      // Verify student is in this match
      if (socket.matchId !== matchId) {
        const error = "Student not in this match";
        logger.warn(`❌ ${error}: Socket match ${socket.matchId} vs submitted ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      // Check if match is active
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          round: {
            include: {
              contest: true
            }
          }
        }
      });

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      if (match.status !== "ongoing") {
        const error = "Match is not active";
        logger.warn(`❌ ${error}: Status ${match.status}`);
        return callback?.({ success: false, message: error });
      }

      // Get question from QuestionDetail table by questionPackage and order
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder,
          isActive: true
        },
        include: {
          question: true
        }
      });

      if (!questionDetail) {
        const error = "Question not found";
        logger.warn(`❌ ${error}: Order ${questionOrder} in package ${match.questionPackageId}`);
        return callback?.({ success: false, message: error });
      }

      // Check if contestant already answered this question
      const existingResult = await prisma.result.findFirst({
        where: {
          contestantId: socket.contestantId,
          matchId: matchId,
          questionOrder: questionOrder
        }
      });

      if (existingResult) {
        const error = "Already answered this question";
        logger.warn(`❌ ${error}: Contestant ${socket.contestantId}, Question ${questionOrder}`);
        return callback?.({ 
          success: false, 
          message: error,
          result: {
            isCorrect: existingResult.isCorrect,
            questionOrder: questionOrder,
            submittedAt: existingResult.createdAt
          }
        });
      }

      // Validate answer based on question type
      let isCorrect = false;
      const question = questionDetail.question;
      
      console.log(`🔍 [SUBMIT] Checking answer:`, {
        questionType: question.questionType,
        studentAnswer: answer,
        correctAnswer: question.correctAnswer?.substring(0, 50) + '...'
      });

      if (question.questionType === "multiple_choice") {
        // For multiple choice, compare with correctAnswer field
        isCorrect = answer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      } else {
        // For other types, compare with correctAnswer
        isCorrect = answer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      }

      console.log(`✅ [SUBMIT] Answer validation result:`, { isCorrect });

      // Save result to database
      const result = await prisma.result.create({
        data: {
          name: answer, // Store the actual answer
          contestantId: socket.contestantId!,
          matchId: matchId,
          isCorrect: isCorrect,
          questionOrder: questionOrder
        },
        include: {
          contestant: {
            include: {
              student: {
                select: { fullName: true, studentCode: true }
              }
            }
          }
        }
      });

      logger.info(
        `✅ Answer submitted: Contestant ${socket.contestantId} (${result.contestant.student?.fullName}) | Question ${questionOrder} | Correct: ${isCorrect}`
      );

      // Get total questions for progress tracking
      const totalQuestions = await prisma.questionDetail.count({
        where: { 
          questionPackageId: match.questionPackageId,
          isActive: true
        }
      });

      // Broadcast result to all clients in the match room
      const roomName = `match-${matchId}`;
      const io = namespace.server;

      // Prepare answer submission data
      const answerSubmissionData = {
        contestantId: socket.contestantId,
        studentName: result.contestant.student?.fullName,
        studentCode: result.contestant.student?.studentCode,
        questionOrder: questionOrder,
        isCorrect: isCorrect,
        submittedAt: result.createdAt,
        matchId: matchId,
        progress: {
          answeredQuestions: questionOrder,
          totalQuestions: totalQuestions
        }
      };

      // Broadcast to admin/judge namespace
      io.of("/match-control").to(roomName).emit("match:answerSubmitted", answerSubmissionData);

      // Broadcast to students namespace
      io.of("/student").to(roomName).emit("match:answerSubmitted", answerSubmissionData);

      // Handle incorrect answer - Auto-elimination Logic
      if (!isCorrect) {
        console.log(`⚠️ [ELIMINATION] Thí sinh ${socket.contestantId} trả lời sai - bắt đầu elimination logic`);

        try {
          // Update contestant status to eliminated
          const eliminatedContestant = await prisma.contestant.update({
            where: { id: socket.contestantId! },
            data: { 
              status: "eliminated",
              eliminatedAt: new Date()
            },
            include: {
              student: {
                select: { fullName: true, studentCode: true }
              }
            }
          });

          console.log(`🚫 [ELIMINATION] Thí sinh ${eliminatedContestant.student?.fullName} đã bị loại`);

          // Create elimination log for tracking
          await prisma.$executeRaw`
            INSERT INTO elimination_logs (contestant_id, match_id, question_order, elimination_reason, eliminated_at)
            VALUES (${socket.contestantId}, ${matchId}, ${questionOrder}, 'incorrect_answer', NOW())
            ON DUPLICATE KEY UPDATE 
            elimination_reason = VALUES(elimination_reason),
            eliminated_at = VALUES(eliminated_at)
          `;

          // Prepare elimination data
          const eliminationData = {
            contestantId: socket.contestantId,
            studentName: eliminatedContestant.student?.fullName,
            studentCode: eliminatedContestant.student?.studentCode,
            questionOrder: questionOrder,
            eliminationReason: 'incorrect_answer',
            eliminatedAt: new Date().toISOString(),
            matchId: matchId
          };

          // Broadcast elimination to admin/judge namespace
          io.of("/match-control").to(roomName).emit("contestant:eliminated", eliminationData);

          // Broadcast elimination to other students (but not to the eliminated student)
          socket.to(roomName).emit("contestant:eliminated", eliminationData);

          // Send special elimination notification to the eliminated student
          socket.emit("student:eliminated", {
            message: "Bạn đã bị loại khỏi trận đấu vì trả lời sai",
            questionOrder: questionOrder,
            eliminatedAt: new Date().toISOString(),
            correctAnswer: question.correctAnswer, // Show correct answer after elimination
            explanation: question.explanation || "Không có giải thích",
            redirectTo: "/student/dashboard" // Suggest redirect
          });

          logger.info(
            `🚫 Contestant eliminated: ${socket.contestantId} (${eliminatedContestant.student?.fullName}) | Question ${questionOrder} | Reason: incorrect_answer`
          );

        } catch (eliminationError) {
          logger.error(`❌ Error in elimination logic: ${eliminationError}`);
          // Continue with normal flow even if elimination fails
        }
      }

      // Send confirmation to the submitting student
      const responseData = { 
        success: true, 
        message: isCorrect ? "Câu trả lời chính xác! 🎉" : "Câu trả lời không chính xác 😔",
        result: {
          isCorrect: isCorrect,
          questionOrder: questionOrder,
          submittedAt: result.createdAt,
          correctAnswer: !isCorrect ? question.correctAnswer : undefined, // Show correct answer if wrong
          explanation: !isCorrect ? question.explanation : undefined, // Show explanation if wrong
          score: isCorrect ? question.score : 0,
          eliminated: !isCorrect // Let frontend know if student is eliminated
        }
      };

      callback?.(responseData);

      // Additional statistics logging
      const studentStats = await prisma.result.aggregate({
        where: {
          contestantId: socket.contestantId,
          matchId: matchId
        },
        _count: {
          id: true
        },
        _sum: {
          isCorrect: true
        }
      });

      console.log(`📊 [STATS] Thí sinh ${socket.contestantId} stats:`, {
        totalAnswers: studentStats._count.id,
        correctAnswers: studentStats._sum.isCorrect || 0,
        accuracy: studentStats._count.id > 0 ? 
          Math.round(((studentStats._sum.isCorrect || 0) / studentStats._count.id) * 100) : 0
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ [SUBMIT] Error in student:submitAnswer:`, errorMessage);
      logger.error(`❌ Error in student:submitAnswer: ${errorMessage}`);
      callback?.({ 
        success: false, 
        message: "Không thể gửi câu trả lời. Vui lòng thử lại!" 
      });
    }
  });

  /**
   * Event: student:getMatchStatus
   * Get current match status for the student
   */
  socket.on("student:getMatchStatus", async (callback) => {
    try {
      if (!socket.matchId || !socket.contestantId) {
        return callback?.({ success: false, message: "Not in a match" });
      }

      const match = await prisma.match.findUnique({
        where: { id: socket.matchId },
        include: {
          round: {
            include: {
              contest: {
                select: { name: true, status: true }
              }
            }
          }
        }
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get contestant's results for this match
      const results = await prisma.result.findMany({
        where: {
          contestantId: socket.contestantId,
          matchId: socket.matchId
        },
        orderBy: { questionOrder: 'asc' }
      });

      callback?.({
        success: true,
        data: {
          matchId: match.id,
          matchName: match.name,
          contestName: match.round.contest.name,
          currentQuestion: match.currentQuestion,
          remainingTime: match.remainingTime,
          results: results.map(r => ({
            questionOrder: r.questionOrder,
            isCorrect: r.isCorrect,
            submittedAt: r.createdAt
          }))
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student:getMatchStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });

  /**
   * Event: student:getQuestion
   * Get specific question details for the match
   */
  socket.on("student:getQuestion", async (data, callback) => {
    try {
      // Validate input data
      const validatedData = GetQuestionSchema.parse(data);
      const { matchId, questionOrder } = validatedData;

      // Verify student is in this match
      if (socket.matchId !== matchId) {
        const error = "Student not in this match";
        logger.warn(`❌ ${error}: Socket match ${socket.matchId} vs requested ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      // Get match information
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          questionPackage: {
            select: { name: true }
          },
          round: {
            include: {
              contest: {
                select: { name: true, status: true }
              }
            }
          }
        }
      });

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      // Get question from QuestionDetail table
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder
        },
        include: {
          question: {
            include: {
              questionTopic: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!questionDetail) {
        const error = "Question not found";
        logger.warn(`❌ ${error}: Order ${questionOrder} in package ${match.questionPackageId}`);
        return callback?.({ success: false, message: error });
      }

      // Get total questions in package
      const totalQuestions = await prisma.questionDetail.count({
        where: {
          questionPackageId: match.questionPackageId
        }
      });

      // Check if student has answered this question
      const existingResult = await prisma.result.findFirst({
        where: {
          contestantId: socket.contestantId,
          matchId: matchId,
          questionOrder: questionOrder
        }
      });

      const question = questionDetail.question;
      
      // Parse options if it's multiple choice
      let options = null;
      if (question.questionType === "multiple_choice" && question.options) {
        try {
          options = JSON.parse(question.options as string);
        } catch (e) {
          logger.warn(`Error parsing options for question ${question.id}`);
        }
      }

      // Parse question media
      let questionMedia = null;
      if (question.questionMedia) {
        try {
          questionMedia = JSON.parse(question.questionMedia as string);
        } catch (e) {
          logger.warn(`Error parsing question media for question ${question.id}`);
        }
      }

      const responseData = {
        // Contest info
        contest: {
          id: match.round.contest.name,
          name: match.round.contest.name,
          status: match.round.contest.status
        },
        // Round info
        round: {
          name: match.round.name
        },
        // Match info
        match: {
          id: match.id,
          name: match.name,
          currentQuestion: match.currentQuestion,
          remainingTime: match.remainingTime,
          status: match.status
        },
        // Question package info
        questionPackage: {
          name: match.questionPackage.name,
          totalQuestions: totalQuestions,
          currentOrder: questionOrder
        },
        // Question details
        question: {
          id: question.id,
          intro: question.intro,
          content: question.content,
          questionType: question.questionType,
          difficulty: question.difficulty,
          defaultTime: question.defaultTime,
          score: question.score,
          options: options,
          questionMedia: questionMedia,
          topic: question.questionTopic.name
        },
        // Student status
        studentStatus: {
          hasAnswered: !!existingResult,
          answerResult: existingResult ? {
            answer: existingResult.name,
            isCorrect: existingResult.isCorrect,
            submittedAt: existingResult.createdAt
          } : null
        }
      };

      callback?.({ 
        success: true, 
        data: responseData
      });

      logger.info(
        `✅ Question retrieved: Contestant ${socket.contestantId} | Match ${matchId} | Question ${questionOrder}`
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student:getQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get question" });
    }
  });
}; 