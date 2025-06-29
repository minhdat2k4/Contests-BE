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

const GetMatchStatusSchema = z.object({
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

      // Debug: Check who is in the room
      const studentsInRoom = io.of("/student").adapter.rooms.get(roomName);
      const adminInRoom = io.of("/match-control").adapter.rooms.get(roomName);
      
      console.log('🔍 [DEBUG] Room population before emit:', {
        roomName,
        studentsCount: studentsInRoom?.size || 0,
        studentIds: studentsInRoom ? Array.from(studentsInRoom) : [],
        adminCount: adminInRoom?.size || 0,
        adminIds: adminInRoom ? Array.from(adminInRoom) : []
      });

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

      // Also broadcast to students namespace
      io.of("/student").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });

      console.log('🔍 [DEBUG] Event emitted successfully to', studentsInRoom?.size || 0, 'students and', adminInRoom?.size || 0, 'admins');

      // Fallback: Also emit globally to all students in the namespace as backup
      io.of("/student").emit("match:globalStarted", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString()
      });
      
      console.log('🌍 [DEBUG] Global match:globalStarted event emitted to all students');

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
          questionOrder: nextQuestionOrder,
          isActive: true
        },
        include: {
          question: true // Không cần include options vì nó là Json field
        }
      });

      if (!questionDetail) {
        callback({
          success: false,
          message: `Không tìm thấy câu hỏi ${nextQuestionOrder}`
        });
        return;
      }

      // Type assertion để TypeScript hiểu include relationship
      const questionDetailWithRelation = questionDetail as any;

      console.log('🔍 [DEBUG] Found question detail:', {
        id: questionDetailWithRelation.question.id,
        defaultTime: questionDetailWithRelation.question.defaultTime,
        optionsCount: Array.isArray(questionDetailWithRelation.question.options) ? questionDetailWithRelation.question.options.length : 0
      });

      // Update match with current question and reset timer
      await prisma.match.update({
        where: { id: match.id },
        data: {
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetailWithRelation.question.defaultTime
        }
      });

      console.log(`🔄 [DB] Updated match ${match.id} to question ${nextQuestionOrder}`);

      // Start timer using timer service
      timerService.startTimer(match.id, questionDetailWithRelation.question.defaultTime);

      const roomName = `match-${match.id}`;

      console.log(`⏭️ [SOCKET] Broadcasting to room ${roomName}:`, {
        matchId: match.id,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetailWithRelation.question.defaultTime,
        optionsCount: Array.isArray(questionDetailWithRelation.question.options) ? questionDetailWithRelation.question.options.length : 0
      });

      // Chuẩn bị data câu hỏi với options
      const questionData = {
        id: questionDetailWithRelation.question.id,
        intro: questionDetailWithRelation.question.intro,
        content: questionDetailWithRelation.question.content,
        questionType: questionDetailWithRelation.question.questionType,
        difficulty: questionDetailWithRelation.question.difficulty,
        defaultTime: questionDetailWithRelation.question.defaultTime,
        score: questionDetailWithRelation.question.score,
        questionMedia: questionDetailWithRelation.question.questionMedia,
        // Xử lý options từ Json field
        options: Array.isArray(questionDetailWithRelation.question.options) ? questionDetailWithRelation.question.options : [],
        // Không gửi correctAnswer và explanation để tránh gian lận
      };

      // Emit to match-control namespace (for admins)
      io.of('/match-control').to(roomName).emit('match:questionChanged', {
        matchId: match.id,
        matchSlug: match.slug,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetailWithRelation.question.defaultTime,
        currentQuestionData: {
          order: nextQuestionOrder,
          question: questionData
        }
      });

      // Emit to student namespace (for students) - DEBUG ADDED
      const studentNamespace = io.of('/student');
      const studentsInRoom = studentNamespace.adapter.rooms.get(roomName);
      console.log(`📊 [DEBUG] Students in room ${roomName}:`, {
        roomSize: studentsInRoom?.size || 0,
        studentIds: studentsInRoom ? Array.from(studentsInRoom) : []
      });

      // Debug: Liệt kê tất cả rooms trong student namespace
      console.log(`🔍 [DEBUG] All rooms in student namespace:`, Array.from(studentNamespace.adapter.rooms.keys()));
      
      // Debug: Liệt kê tất cả sockets trong student namespace
      const allStudentSockets = Array.from(studentNamespace.sockets.keys());
      console.log(`👥 [DEBUG] All connected student sockets:`, allStudentSockets);

      io.of('/student').to(roomName).emit('match:questionChanged', {
        matchId: match.id,
        matchSlug: match.slug,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetailWithRelation.question.defaultTime,
        currentQuestionData: {
          order: nextQuestionOrder,
          question: questionData
        }
      });

      console.log(`✅ [DEBUG] Event match:questionChanged emitted to room ${roomName} for ${studentsInRoom?.size || 0} students`);
      
      // Debug: Thêm global emit cho tất cả students
      console.log(`🌍 [DEBUG] Emitting global questionChanged to all students...`);
      io.of('/student').emit('match:globalQuestionChanged', {
        matchId: match.id,
        matchSlug: match.slug,
        currentQuestion: nextQuestionOrder,
        remainingTime: questionDetailWithRelation.question.defaultTime,
        currentQuestionData: {
          order: nextQuestionOrder,
          question: questionData
        }
      });
      console.log(`🌍 [DEBUG] Global questionChanged emitted to ${allStudentSockets.length} total students`);

      // Send event to all students in /student namespace (global notification)
      io.of('/student').emit('match:globalUpdate', {
        eventType: 'questionChanged',
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetailWithRelation.question.defaultTime,
          totalQuestions: await prisma.questionDetail.count({
            where: { questionPackageId: match.questionPackageId }
          })
        }
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
          remainingTime: questionDetailWithRelation.question.defaultTime,
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

      // Also broadcast to students
      io.of("/student").to(roomName).emit("match:timerPaused", {
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

      // Also broadcast to students
      io.of("/student").to(roomName).emit("match:timerResumed", {
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

      // Also broadcast to students
      io.of("/student").to(roomName).emit("match:timerUpdated", {
        matchId: match.id,
        matchSlug: match.slug,
        remainingTime: remainingTime,
        updatedAt: new Date().toISOString()
      });

      // 🔥 NEW: Also broadcast to online-control namespace
      io.of("/online-control").to(roomName).emit("match:timerUpdated", {
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

        // Also to students
        io.of("/student").to(roomName).emit("match:timeUp", {
          matchId: match.id,
          matchSlug: match.slug,
          questionOrder: updatedMatch.currentQuestion,
          timeUpAt: new Date().toISOString()
        });

        // 🔥 NEW: Also to online-control
        io.of("/online-control").to(roomName).emit("match:timeUp", {
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

      // Also broadcast to students
      io.of("/student").to(roomName).emit("match:ended", {
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
      const validatedData = GetMatchStatusSchema.parse(data);
      const match = await resolveMatch(validatedData.matchId);

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Type assertion cho match object
      const matchWithRelations = match as any;

      const totalQuestions = await prisma.questionDetail.count({
        where: { questionPackageId: match.questionPackageId }
      });

      // Get current question detail if match has started
      const currentQuestionDetail = match.currentQuestion > 0 ? await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: match.currentQuestion,
          isActive: true
        },
        include: {
          question: true // Include question relation
        }
      }) : null;

      // Type assertion để TypeScript hiểu include relationship
      const questionDetailWithRelation = currentQuestionDetail as any;

      const currentQuestionData = questionDetailWithRelation ? {
        order: match.currentQuestion,
        question: {
          id: questionDetailWithRelation.question.id,
          intro: questionDetailWithRelation.question.intro,
          content: questionDetailWithRelation.question.content,
          questionType: questionDetailWithRelation.question.questionType,
          difficulty: questionDetailWithRelation.question.difficulty,
          defaultTime: questionDetailWithRelation.question.defaultTime,
          score: questionDetailWithRelation.question.score,
          questionMedia: questionDetailWithRelation.question.questionMedia,
          // Xử lý options từ Json field
          options: Array.isArray(questionDetailWithRelation.question.options) ? questionDetailWithRelation.question.options : []
        }
      } : null;

      callback?.({
        success: true,
        data: {
          match: {
            id: match.id,
            name: match.name,
            status: match.status,
            currentQuestion: match.currentQuestion,
            remainingTime: match.remainingTime,
            contestName: matchWithRelations.round.contest.name,
            questionPackageName: matchWithRelations.questionPackage.name
          },
          currentQuestion: currentQuestionData,
          statistics: {
            totalQuestions,
            connectedStudents: 0
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