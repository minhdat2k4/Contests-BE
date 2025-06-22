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

// Helper function to resolve match from either ID or slug
const resolveMatch = async (matchIdentifier: number | string) => {
  if (typeof matchIdentifier === 'number') {
    // matchIdentifier is a number (matchId)
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
    // matchIdentifier is a string (slug)
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

// Validation schemas - now support both number and string
const StartMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const NextQuestionSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const TimerControlSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
});

const UpdateTimerSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
  remainingTime: z.number().int().min(0)
});

const EndMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)])
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
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [DEBUG] match:start received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      console.log('🔍 [DEBUG] Match found:', { id: match.id, slug: match.slug, name: match.name });

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
      console.log('🔍 [DEBUG] About to emit match:started to room:', roomName);

      // Broadcast to all clients in the match room
      io.of("/match-control").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });

      console.log('🔍 [DEBUG] Event emitted successfully');

      logger.info(
        `✅ Match started: ${match.id} (${match.slug}) by ${socket.user.username} (${socket.user.role})`
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
      console.log('🔍 [DEBUG] Error in match:start:', errorMessage);
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
      console.log('🔍 [DEBUG] match:nextQuestion received data:', data);
      
      const validatedData = NextQuestionSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [DEBUG] Match identifier:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      console.log('🔍 [DEBUG] Match found:', { id: match.id, slug: match.slug, name: match.name });
      console.log('🔍 [DEBUG] Current match state:', {
        currentQuestion: match.currentQuestion,
        status: match.status,
        remainingTime: match.remainingTime
      });

      // Calculate next question order automatically
      const nextQuestionOrder = match.currentQuestion + 1;
      console.log('🔍 [DEBUG] Calculated next question order:', nextQuestionOrder);

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
        console.log('🔍 [DEBUG] Question not found:', { 
          questionOrder: nextQuestionOrder, 
          packageId: match.questionPackageId 
        });
        logger.warn(`❌ ${error}: Order ${nextQuestionOrder} in package ${match.questionPackageId}`);
        return callback?.({ success: false, message: error });
      }

      console.log('🔍 [DEBUG] Found question detail:', {
        id: questionDetail.question.id,
        defaultTime: questionDetail.question.defaultTime
      });

      // Update match with current question and reset timer
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetail.question.defaultTime
        }
      });

      console.log('🔍 [DEBUG] Match updated successfully:', {
        id: updatedMatch.id,
        currentQuestion: updatedMatch.currentQuestion,
        remainingTime: updatedMatch.remainingTime
      });

      // Start timer using timer service
      timerService.startTimer(match.id, questionDetail.question.defaultTime);

      const roomName = `match-${match.id}`;

      console.log('🔍 [DEBUG] About to emit match:questionChanged to room:', roomName);
      console.log('🔍 [DEBUG] Event data:', {
        matchId: match.id,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetail.question.defaultTime
      });

      // Broadcast question change to all clients
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
            score: questionDetail.question.score
          }
        },
        changedBy: socket.user.username,
        changedAt: new Date().toISOString()
      });

      console.log('🔍 [DEBUG] Event emitted successfully');

      logger.info(
        `✅ Question changed: Match ${match.id} (${match.slug}) | Question ${nextQuestionOrder} | By ${socket.user.username}`
      );

      console.log('🔍 [DEBUG] Success response ready');
      callback?.({
        success: true,
        message: "Question changed successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetail.question.defaultTime,
          totalQuestions: await prisma.questionDetail.count({
            where: { questionPackageId: match.questionPackageId }
          })
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [DEBUG] Error caught:', errorMessage);
      console.log('🔍 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
      const validatedData = TimerControlSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [DEBUG] match:pauseTimer received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Pause timer
      timerService.pauseTimer(match.id);

      const roomName = `match-${match.id}`;

      // Broadcast timer pause to all clients
      io.of("/match-control").to(roomName).emit("match:timerPaused", {
        matchId: match.id,
        matchSlug: match.slug,
        pausedBy: socket.user.username,
        pausedAt: new Date().toISOString()
      });

      logger.info(`⏸️ Timer paused for match ${match.id} (${match.slug}) by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer paused successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [DEBUG] Error in match:pauseTimer:', errorMessage);
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
      const validatedData = TimerControlSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [DEBUG] match:resumeTimer received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Resume timer
      timerService.resumeTimer(match.id);

      const roomName = `match-${match.id}`;

      // Broadcast timer resume to all clients
      io.of("/match-control").to(roomName).emit("match:timerResumed", {
        matchId: match.id,
        matchSlug: match.slug,
        resumedBy: socket.user.username,
        resumedAt: new Date().toISOString()
      });

      logger.info(`▶️ Timer resumed for match ${match.id} (${match.slug}) by ${socket.user.username}`);

      callback?.({
        success: true,
        message: "Timer resumed successfully"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [DEBUG] Error in match:resumeTimer:', errorMessage);
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
      const { matchId: matchIdentifier, remainingTime } = validatedData;

      console.log('🔍 [DEBUG] match:updateTimer received:', { matchIdentifier, remainingTime, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Update match timer
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: { remainingTime: remainingTime }
      });

      const roomName = `match-${match.id}`;

      // Broadcast timer update to all clients
      io.of("/match-control").to(roomName).emit("match:timerUpdated", {
        matchId: match.id,
        matchSlug: match.slug,
        remainingTime: remainingTime,
        updatedAt: new Date().toISOString()
      });

      // If time is up, emit time up event
      if (remainingTime <= 0) {
        io.of("/match-control").to(roomName).emit("match:timeUp", {
          matchId: match.id,
          matchSlug: match.slug,
          questionOrder: updatedMatch.currentQuestion,
          timeUpAt: new Date().toISOString()
        });
      }

      callback?.({
        success: true,
        message: "Timer updated successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          remainingTime: remainingTime
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [DEBUG] Error in match:updateTimer:', errorMessage);
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
      const { matchId: matchIdentifier } = validatedData;

      console.log('🔍 [DEBUG] match:end received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
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

      // Get match results summary
      const results = await prisma.result.findMany({
        where: { matchId: match.id },
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

      const roomName = `match-${match.id}`;

      // Broadcast match end to all clients
      io.of("/match-control").to(roomName).emit("match:ended", {
        matchId: match.id,
        matchSlug: match.slug,
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
        `✅ Match ended: ${match.id} (${match.slug}) by ${socket.user.username} (${socket.user.role})`
      );

      callback?.({
        success: true,
        message: "Match ended successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "finished",
          summary: {
            totalQuestions: totalQuestions,
            totalContestants: Object.keys(contestantStats).length
          }
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('🔍 [DEBUG] Error in match:end:', errorMessage);
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
      const { matchId: matchIdentifier } = data;

      console.log('🔍 [DEBUG] match:getStatus received:', { matchIdentifier, type: typeof matchIdentifier });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log('🔍 [DEBUG] Match not found:', matchIdentifier);
        return callback?.({ success: false, message: error });
      }

      console.log('🔍 [DEBUG] Match found for getStatus:', { id: match.id, slug: match.slug, name: match.name });

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
      const connectedStudents = io.of("/match-control").adapter.rooms.get(`match-${match.id}`)?.size || 0;

      callback?.({
        success: true,
        data: {
          match: {
            id: match.id,
            slug: match.slug,
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
      console.log('🔍 [DEBUG] Error in match:getStatus:', errorMessage);
      logger.error(`❌ Error in match:getStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });
}; 