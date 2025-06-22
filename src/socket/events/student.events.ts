import { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";

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

export const registerStudentEvents = (io: Server, socket: AuthenticatedSocket) => {
  // Only allow Student role to access these events
  if (socket.user.role !== "Student") {
    return;
  }

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

      // Get question from QuestionDetail table by questionPackage and order
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder
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
        return callback?.({ success: false, message: error });
      }

      // Validate answer based on question type
      let isCorrect = false;
      const question = questionDetail.question;
      
      if (question.questionType === "multiple_choice") {
        // For multiple choice, compare with correctAnswer field
        isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      } else {
        // For other types, compare with correctAnswer
        isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      }

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
        `✅ Answer submitted: Contestant ${socket.contestantId} | Question ${questionOrder} | Correct: ${isCorrect}`
      );

      // Broadcast result to all clients in the match room
      const roomName = `match-${matchId}`;
      io.of("/match-control").to(roomName).emit("match:answerSubmitted", {
        contestantId: socket.contestantId,
        studentName: result.contestant.student?.fullName,
        questionOrder: questionOrder,
        isCorrect: isCorrect,
        submittedAt: result.createdAt,
        matchId: matchId
      });

      // Send confirmation to the submitting student
      callback?.({ 
        success: true, 
        message: "Answer submitted successfully",
        result: {
          isCorrect: isCorrect,
          questionOrder: questionOrder,
          submittedAt: result.createdAt
        }
      });

      // If answer is incorrect, trigger elimination logic (Phase 3)
      if (!isCorrect) {
        // TODO: Implement elimination logic in Phase 3
        logger.info(`⚠️ Incorrect answer - elimination logic will be implemented in Phase 3`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in student:submitAnswer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to submit answer" });
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