import { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { MatchService } from "@/modules/match";
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
const StartMatchSchema = z.object({
  matchId: z.number().int().positive()
});

const NextQuestionSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive()
});

const UpdateTimerSchema = z.object({
  matchId: z.number().int().positive(),
  remainingTime: z.number().int().min(0)
});

const EndMatchSchema = z.object({
  matchId: z.number().int().positive()
});

export const registerMatchEvents = (io: Server, socket: AuthenticatedSocket) => {
  // Only allow Admin and Judge roles to control matches
  if (!["Admin", "Judge"].includes(socket.user.role)) {
    return;
  }

  /**
   * Event: match:start
   * Start a match and notify all participants
   */
  socket.on("match:start", async (data, callback) => {
    try {
      const validatedData = StartMatchSchema.parse(data);
      const { matchId } = validatedData;

      // Get match information
      const match = await prisma.match.findUnique({
        where: { id: matchId },
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

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      // Update match status to active
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { 
          status: "ongoing",
          currentQuestion: 0,
          remainingTime: 0
        }
      });

      const roomName = `match-${matchId}`;

      // Broadcast to all clients in the match room
      io.of("/match-control").to(roomName).emit("match:started", {
        matchId: matchId,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });

      logger.info(
        `✅ Match started: ${matchId} by ${socket.user.username} (${socket.user.role})`
      );

      callback?.({
        success: true,
        message: "Match started successfully",
        data: {
          matchId: matchId,
          status: "ongoing"
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:start: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to start match" });
    }
  });

  /**
   * Event: match:nextQuestion
   * Move to next question and start timer
   */
  socket.on("match:nextQuestion", async (data, callback) => {
    try {
      const validatedData = NextQuestionSchema.parse(data);
      const { matchId, questionOrder } = validatedData;

      // Get match information
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      // Get question details
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

      // Update match with current question and reset timer
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          currentQuestion: questionOrder,
          remainingTime: questionDetail.question.defaultTime
        }
      });

      // Start timer using timer service
      timerService.startTimer(matchId, questionDetail.question.defaultTime);

      const roomName = `match-${matchId}`;

      // Broadcast question change to all clients
      io.of("/match-control").to(roomName).emit("match:questionChanged", {
        matchId: matchId,
        questionOrder: questionOrder,
        remainingTime: questionDetail.question.defaultTime,
        question: {
          id: questionDetail.question.id,
          intro: questionDetail.question.intro,
          content: questionDetail.question.content,
          questionType: questionDetail.question.questionType,
          difficulty: questionDetail.question.difficulty,
          defaultTime: questionDetail.question.defaultTime,
          score: questionDetail.question.score
        },
        changedBy: socket.user.username,
        changedAt: new Date().toISOString()
      });

      logger.info(
        `✅ Question changed: Match ${matchId} | Question ${questionOrder} | By ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Question changed successfully",
        data: {
          matchId: matchId,
          questionOrder: questionOrder,
          remainingTime: questionDetail.question.defaultTime
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:nextQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to change question" });
    }
  });

  /**
   * Event: match:pauseTimer
   * Pause the current question timer
   */
  socket.on("match:pauseTimer", async (data, callback) => {
    try {
      const { matchId } = data;

      // Pause timer
      timerService.pauseTimer(matchId);

      const roomName = `match-${matchId}`;

      // Broadcast timer pause to all clients
      io.of("/match-control").to(roomName).emit("match:timerPaused", {
        matchId: matchId,
        pausedBy: socket.user.username,
        pausedAt: new Date().toISOString()
      });

      logger.info(`⏸️ Timer paused for match ${matchId} by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer paused successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:pauseTimer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to pause timer" });
    }
  });

  /**
   * Event: match:resumeTimer
   * Resume the current question timer
   */
  socket.on("match:resumeTimer", async (data, callback) => {
    try {
      const { matchId } = data;

      // Resume timer
      timerService.resumeTimer(matchId);

      const roomName = `match-${matchId}`;

      // Broadcast timer resume to all clients
      io.of("/match-control").to(roomName).emit("match:timerResumed", {
        matchId: matchId,
        resumedBy: socket.user.username,
        resumedAt: new Date().toISOString()
      });

      logger.info(`▶️ Timer resumed for match ${matchId} by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer resumed successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:resumeTimer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to resume timer" });
    }
  });

  /**
   * Event: match:updateTimer
   * Update remaining time for current question
   */
  socket.on("match:updateTimer", async (data, callback) => {
    try {
      const validatedData = UpdateTimerSchema.parse(data);
      const { matchId, remainingTime } = validatedData;

      // Update match timer
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { remainingTime: remainingTime }
      });

      const roomName = `match-${matchId}`;

      // Broadcast timer update to all clients
      io.of("/match-control").to(roomName).emit("match:timerUpdated", {
        matchId: matchId,
        remainingTime: remainingTime,
        updatedAt: new Date().toISOString()
      });

      // If time is up, emit time up event
      if (remainingTime <= 0) {
        io.of("/match-control").to(roomName).emit("match:timeUp", {
          matchId: matchId,
          questionOrder: updatedMatch.currentQuestion,
          timeUpAt: new Date().toISOString()
        });
      }

      callback?.({
        success: true,
        message: "Timer updated successfully",
        data: {
          matchId: matchId,
          remainingTime: remainingTime
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:updateTimer: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to update timer" });
    }
  });

  /**
   * Event: match:end
   * End the match and calculate results
   */
  socket.on("match:end", async (data, callback) => {
    try {
      const validatedData = EndMatchSchema.parse(data);
      const { matchId } = validatedData;

      // Stop timer
      timerService.stopTimer(matchId);

      // Update match status to completed
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { 
          status: "finished",
          remainingTime: 0
        }
      });

      // Get match results summary
      const results = await prisma.result.findMany({
        where: { matchId: matchId },
        include: {
          contestant: {
            include: {
              student: {
                select: { fullName: true, studentCode: true }
              }
            }
          }
        },
        orderBy: [
          { isCorrect: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      // Calculate summary statistics
      const totalQuestions = await prisma.questionDetail.count({
        where: {
          questionPackageId: updatedMatch.questionPackageId
        }
      });

      const contestantStats = results.reduce((acc, result) => {
        const contestantId = result.contestantId;
        if (!acc[contestantId]) {
          acc[contestantId] = {
            contestantId: contestantId,
            studentName: result.contestant.student?.fullName,
            studentCode: result.contestant.student?.studentCode,
            totalAnswers: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
          };
        }
        acc[contestantId].totalAnswers++;
        if (result.isCorrect) {
          acc[contestantId].correctAnswers++;
        } else {
          acc[contestantId].incorrectAnswers++;
        }
        return acc;
      }, {} as any);

      const roomName = `match-${matchId}`;

      // Broadcast match end to all clients
      io.of("/match-control").to(roomName).emit("match:ended", {
        matchId: matchId,
        status: "finished",
        endedBy: socket.user.username,
        endedAt: new Date().toISOString(),
        summary: {
          totalQuestions: totalQuestions,
          totalContestants: Object.keys(contestantStats).length,
          contestantStats: Object.values(contestantStats)
        }
      });

      logger.info(
        `✅ Match ended: ${matchId} by ${socket.user.username} (${socket.user.role})`
      );

      callback?.({
        success: true,
        message: "Match ended successfully",
        data: {
          matchId: matchId,
          status: "finished",
          summary: {
            totalQuestions: totalQuestions,
            totalContestants: Object.keys(contestantStats).length
          }
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:end: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to end match" });
    }
  });

  /**
   * Event: match:getStatus
   * Get current match status and statistics
   */
  socket.on("match:getStatus", async (data, callback) => {
    try {
      const { matchId } = data;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
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

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get current question if any
      let currentQuestionDetail = null;
      if (match.currentQuestion > 0) {
        currentQuestionDetail = await prisma.questionDetail.findFirst({
          where: {
            questionPackageId: match.questionPackageId,
            questionOrder: match.currentQuestion
          },
          include: {
            question: {
              select: {
                id: true,
                intro: true,
                content: true,
                questionType: true,
                difficulty: true,
                defaultTime: true,
                score: true
              }
            }
          }
        });
      }

      // Get total questions
      const totalQuestions = await prisma.questionDetail.count({
        where: {
          questionPackageId: match.questionPackageId
        }
      });

      // Get connected students count
      const connectedStudents = io.of("/match-control").adapter.rooms.get(`match-${matchId}`)?.size || 0;

      callback?.({
        success: true,
        data: {
          match: {
            id: match.id,
            name: match.name,
            status: match.status,
            currentQuestion: match.currentQuestion,
            remainingTime: match.remainingTime,
            contestName: match.round.contest.name,
            questionPackageName: match.questionPackage.name
          },
          currentQuestion: currentQuestionDetail ? {
            order: match.currentQuestion,
            question: currentQuestionDetail.question
          } : null,
          statistics: {
            totalQuestions: totalQuestions,
            connectedStudents: connectedStudents
          }
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:getStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });
}; 