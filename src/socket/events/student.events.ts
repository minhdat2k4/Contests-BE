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
  matchId: z.number().int().positive(),
});

const SubmitAnswerSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
  answer: z.string().min(1).max(500),
  submittedAt: z.string().datetime().optional(),
});

const GetQuestionSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
});

// Match control schemas (for admin commands)
const StartMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const NextQuestionSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const TimerControlSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const EndMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

// Helper function to resolve match from either ID or slug
const resolveMatch = async (matchIdentifier: number | string) => {
  if (typeof matchIdentifier === "number") {
    return await prisma.match.findUnique({
      where: { id: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true },
            },
          },
        },
        questionPackage: {
          select: { name: true },
        },
      },
    });
  } else {
    return await prisma.match.findFirst({
      where: { slug: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true },
            },
          },
        },
        questionPackage: {
          select: { name: true },
        },
      },
    });
  }
};

export const registerStudentEvents = (
  namespace: any,
  socket: AuthenticatedSocket
) => {
  console.log(
    "📋 [BE STUDENT EVENTS] Bắt đầu đăng ký events cho student socket:",
    {
      socketId: socket.id,
      username: socket.user.username,
      userId: socket.user.userId,
      role: socket.user.role,
      contestantId: socket.contestantId || "KHÔNG CÓ",
    }
  );

  // Only allow Student role to access these events
  if (socket.user.role !== "Student") {
    console.log(
      "🚫 [BE STUDENT EVENTS] Từ chối đăng ký events - user không phải Student:",
      {
        socketId: socket.id,
        role: socket.user.role,
        username: socket.user.username,
      }
    );
    return;
  }

  console.log(
    "✅ [BE STUDENT EVENTS] Xác nhận user là Student, tiếp tục đăng ký events"
  );

  /**
   * MATCH CONTROL EVENTS FOR STUDENTS
   * These events allow students to also control matches (if they have permission)
   */

  console.log("🎯 [BE STUDENT EVENTS] Đang đăng ký event: match:start");
  /**
   * Event: match:start
   * Start a match and notify all participants
   */
  socket.on("match:start", async (data, callback) => {
    console.log("🚀 [BE STUDENT EVENTS] Nhận event match:start từ student:", {
      data: data,
      socketId: socket.id,
      username: socket.user.username,
    });
    try {
      const validatedData = StartMatchSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log("🔍 [STUDENT] match:start received:", {
        matchIdentifier,
        type: typeof matchIdentifier,
      });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log("🔍 [STUDENT] Match not found:", matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      console.log("🔍 [STUDENT] Match found:", {
        id: match.id,
        slug: match.slug,
        name: match.name,
      });

      // Update match status to active
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "ongoing",
          currentQuestion: 0,
          remainingTime: 0,
        },
      });

      const roomName = `match-${match.id}`;
      console.log(
        "🔍 [STUDENT] About to emit match:started to room:",
        roomName
      );

      // Broadcast to both namespaces
      const io = namespace.server;
      io.of("/match-control").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString(),
      });

      io.of("/student").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString(),
      });

      console.log("🔍 [STUDENT] Event emitted successfully");

      logger.info(
        `✅ Match started by STUDENT: ${match.id} (${match.slug}) by ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Match started successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "ongoing",
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("🔍 [STUDENT] Error in match:start:", errorMessage);
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
      console.log("🔍 [STUDENT] match:nextQuestion received data:", data);

      const validatedData = NextQuestionSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        console.log("🔍 [STUDENT] Match not found:", matchIdentifier);
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Calculate next question order automatically
      const nextQuestionOrder = match.currentQuestion + 1;
      console.log(
        "🔍 [STUDENT] Calculated next question order:",
        nextQuestionOrder
      );

      // Get question details
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: nextQuestionOrder,
        },
        include: {
          question: true,
        },
      });

      if (!questionDetail) {
        const error = "Question not found";
        console.log("🔍 [STUDENT] Question not found:", {
          questionOrder: nextQuestionOrder,
          packageId: match.questionPackageId,
        });
        logger.warn(
          `❌ ${error}: Order ${nextQuestionOrder} in package ${match.questionPackageId}`
        );
        return callback?.({ success: false, message: error });
      }

      // Update match with current question and reset timer
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          currentQuestion: nextQuestionOrder,
          remainingTime: questionDetail.question.defaultTime,
        },
      });

      // Start timer using timer service
      timerService.startTimer(match.id, questionDetail.question.defaultTime);

      const roomName = `match-${match.id}`;

      // Broadcast to both namespaces
      const io = namespace.server;
      io.of("/match-control")
        .to(roomName)
        .emit("match:questionChanged", {
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
              options: questionDetail.question.options
                ? JSON.parse(questionDetail.question.options as string)
                : null,
              correctAnswer: questionDetail.question.correctAnswer,
            },
          },
          changedBy: socket.user.username,
          changedAt: new Date().toISOString(),
        });

      io.of("/student")
        .to(roomName)
        .emit("match:questionChanged", {
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
              options: questionDetail.question.options
                ? JSON.parse(questionDetail.question.options as string)
                : null,
              correctAnswer: questionDetail.question.correctAnswer,
            },
          },
          changedBy: socket.user.username,
          changedAt: new Date().toISOString(),
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
          remainingTime: questionDetail.question.defaultTime,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("🔍 [STUDENT] Error caught:", errorMessage);
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
        pausedAt: new Date().toISOString(),
      });

      io.of("/student").to(roomName).emit("match:timerPaused", {
        matchId: match.id,
        matchSlug: match.slug,
        pausedBy: socket.user.username,
        pausedAt: new Date().toISOString(),
      });

      logger.info(
        `⏸️ Timer paused by STUDENT for match ${match.id} (${match.slug}) by ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Timer paused successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
        resumedAt: new Date().toISOString(),
      });

      io.of("/student").to(roomName).emit("match:timerResumed", {
        matchId: match.id,
        matchSlug: match.slug,
        resumedBy: socket.user.username,
        resumedAt: new Date().toISOString(),
      });

      logger.info(
        `▶️ Timer resumed by STUDENT for match ${match.id} (${match.slug}) by ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: "Timer resumed successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
          remainingTime: 0,
        },
      });

      const roomName = `match-${match.id}`;
      const io = namespace.server;

      // Broadcast to both namespaces
      io.of("/match-control").to(roomName).emit("match:ended", {
        matchId: match.id,
        matchSlug: match.slug,
        status: "finished",
        endedBy: socket.user.username,
        endedAt: new Date().toISOString(),
      });

      io.of("/student").to(roomName).emit("match:ended", {
        matchId: match.id,
        matchSlug: match.slug,
        status: "finished",
        endedBy: socket.user.username,
        endedAt: new Date().toISOString(),
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
          status: "finished",
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
      console.log(
        "📝 [STUDENT JOIN] Event nhận được:",
        data,
        "từ socket:",
        socket.id
      );
      console.log(
        "📝 [STUDENT JOIN] Socket contestantId:",
        socket.contestantId
      );

      // Validate input data
      const validatedData = JoinMatchSchema.parse(data);
      const { matchId } = validatedData;

      // Check if contestant exists
      if (!socket.contestantId) {
        const error = "Contestant not found in socket";
        console.log(`❌ [STUDENT JOIN] ${error} cho socket: ${socket.id}`);
        logger.warn(`❌ ${error}: ${socket.id}`);
        return callback?.({ success: false, message: error });
      }

      // Check if contestant exists and has access to this match
      const contestant = await prisma.contestant.findUnique({
        where: { id: socket.contestantId },
        include: {
          student: {
            select: { fullName: true, studentCode: true },
          },
          contest: {
            include: {
              round: {
                include: {
                  matches: {
                    where: { id: matchId },
                  },
                },
              },
            },
          },
        },
      });

      if (!contestant) {
        const error = "Contestant not found in database";
        console.log(`❌ [STUDENT JOIN] ${error}: ${socket.contestantId}`);
        logger.warn(`❌ ${error}: ${socket.contestantId}`);
        return callback?.({ success: false, message: error });
      }

      console.log("✅ [STUDENT JOIN] Contestant found:", {
        contestantId: contestant.id,
        studentName: contestant.student?.fullName,
        contestId: contestant.contestId,
      });

      // Check if match exists in contestant's contest
      const hasAccess =
        contestant.contest?.round?.some((round: any) =>
          round.matches?.some((match: any) => match.id === matchId)
        ) || false;

      if (!hasAccess) {
        const error = "No access to this match";
        console.log(
          `❌ [STUDENT JOIN] ${error}: Match ${matchId} for contestant ${socket.contestantId}`
        );
        logger.warn(
          `❌ ${error}: Match ${matchId} for contestant ${socket.contestantId}`
        );
        return callback?.({ success: false, message: error });
      }

      // Join the match room
      const roomName = `match-${matchId}`;
      await socket.join(roomName);
      socket.matchId = matchId;

      // DEBUG: Kiểm tra room size sau khi join
      const studentsInRoom = namespace.adapter.rooms.get(roomName);
      console.log(
        `📊 [STUDENT JOIN ROOM] Room ${roomName} status after join:`,
        {
          roomSize: studentsInRoom?.size || 0,
          allSocketsInRoom: studentsInRoom ? Array.from(studentsInRoom) : [],
          currentSocketId: socket.id,
        }
      );

      console.log(
        `✅ [STUDENT JOIN ROOM] Socket ${socket.id} joined room: ${roomName}`
      );
      logger.info(
        `Student socket ${socket.id} joined room: ${roomName} | Contestant: ${contestant.id} | Student: ${contestant.student?.fullName}`
      );

      // Notify other clients in the room
      socket.to(roomName).emit("student:joinedMatch", {
        contestantId: socket.contestantId,
        studentName: contestant.student?.fullName,
        studentCode: contestant.student?.studentCode,
        matchId: matchId,
        timestamp: new Date().toISOString(),
      });

      callback?.({
        success: true,
        message: "Successfully joined match",
        matchId: matchId,
        roomName: roomName,
        contestantId: socket.contestantId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ [STUDENT JOIN] Error:`, errorMessage);
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
      console.log(
        "🚀 [STUDENT EVENTS - SUBMIT DEBUG] ===== XỬ LÝ SUBMIT ANSWER TRONG EVENTS ====="
      );
      console.log("📋 [STUDENT EVENTS - SUBMIT DEBUG] Socket info:", {
        socketId: socket.id,
        userId: socket.user.userId,
        username: socket.user.username,
        contestantId: socket.contestantId,
        matchId: socket.matchId,
      });

      // Validate input data
      console.log(
        "🔍 [STUDENT EVENTS - SUBMIT DEBUG] Bắt đầu validate dữ liệu..."
      );
      const validatedData = SubmitAnswerSchema.parse(data);
      const { matchId, questionOrder, answer } = validatedData;
      console.log("✅ [STUDENT EVENTS - SUBMIT DEBUG] Validation thành công:", {
        matchId,
        questionOrder,
        answer: answer.substring(0, 50) + "...",
        answerLength: answer.length,
      });

      console.log(
        `📝 [SUBMIT] Thí sinh ${socket.contestantId} gửi câu trả lời:`,
        {
          matchId,
          questionOrder,
          answer: answer.substring(0, 50) + "...",
          socketMatchId: socket.matchId,
        }
      );

      // Verify student is in this match
      console.log("🔍 [STUDENT EVENTS - SUBMIT DEBUG] Kiểm tra match ID...");
      if (socket.matchId !== matchId) {
        const error = "Student not in this match";
        console.log("❌ [STUDENT EVENTS - SUBMIT DEBUG] Match ID không khớp:", {
          socketMatchId: socket.matchId,
          submitMatchId: matchId,
        });
        logger.warn(
          `❌ ${error}: Socket match ${socket.matchId} vs submitted ${matchId}`
        );
        return callback?.({ success: false, message: error });
      }
      console.log("✅ [STUDENT EVENTS - SUBMIT DEBUG] Match ID hợp lệ");

      // 🔥 NEW: Check if contestant is eliminated before allowing answer submission
      console.log(
        "🔍 [STUDENT EVENTS - SUBMIT DEBUG] Kiểm tra trạng thái contestant..."
      );
      const contestant = await prisma.contestant.findUnique({
        where: { id: socket.contestantId },
        select: {
          id: true,
          status: true,
          student: {
            select: { fullName: true, studentCode: true },
          },
        },
      });

      if (!contestant) {
        const error = "Contestant not found";
        console.log(
          "❌ [STUDENT EVENTS - SUBMIT DEBUG] Không tìm thấy contestant:",
          socket.contestantId
        );
        logger.warn(`❌ ${error}: ${socket.contestantId}`);
        return callback?.({ success: false, message: error });
      }

      console.log("✅ [STUDENT EVENTS - SUBMIT DEBUG] Thông tin contestant:", {
        id: contestant.id,
        status: contestant.status,
        fullName: contestant.student?.fullName,
        studentCode: contestant.student?.studentCode,
      });

      // 🔥 NEW: Block eliminated students from submitting answers
      if (contestant.status === "eliminate") {
        const error =
          "Bạn đã bị loại khỏi trận đấu và không thể trả lời thêm câu hỏi";
        console.log(
          "🚫 [STUDENT EVENTS - SUBMIT DEBUG] Contestant đã bị loại:",
          contestant.student?.fullName
        );
        logger.warn(
          `🚫 [BLOCKED] Eliminated student tried to submit: ${socket.contestantId} (${contestant.student?.fullName})`
        );
        return callback?.({
          success: false,
          message: error,
          eliminated: true,
        });
      }

      // Check if match is active
      console.log(
        "🔍 [STUDENT EVENTS - SUBMIT DEBUG] Kiểm tra trạng thái match..."
      );
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          round: {
            include: {
              contest: true,
            },
          },
        },
      });

      if (!match) {
        const error = "Match not found";
        console.log(
          "❌ [STUDENT EVENTS - SUBMIT DEBUG] Không tìm thấy match:",
          matchId
        );
        logger.warn(`❌ ${error}: ${matchId}`);
        return callback?.({ success: false, message: error });
      }

      console.log("✅ [STUDENT EVENTS - SUBMIT DEBUG] Thông tin match:", {
        id: match.id,
        name: match.name,
        status: match.status,
        currentQuestion: match.currentQuestion,
        questionPackageId: match.questionPackageId,
      });

      if (match.status !== "ongoing") {
        const error = "Match is not active";
        console.log(
          "❌ [STUDENT EVENTS - SUBMIT DEBUG] Match không active:",
          match.status
        );
        logger.warn(`❌ ${error}: Status ${match.status}`);
        return callback?.({ success: false, message: error });
      }

      // Get question from QuestionDetail table by questionPackage and order
      console.log("🔍 [STUDENT EVENTS - SUBMIT DEBUG] Tìm kiếm câu hỏi...");
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder,
          isActive: true,
        },
        include: {
          question: true,
        },
      });

      if (!questionDetail) {
        const error = "Question not found";
        console.log(
          "❌ [STUDENT EVENTS - SUBMIT DEBUG] Không tìm thấy câu hỏi:",
          {
            questionPackageId: match.questionPackageId,
            questionOrder: questionOrder,
          }
        );
        logger.warn(
          `❌ [VALIDATION] Question not found for match ${matchId}, order ${questionOrder}`
        );
        return callback?.({ success: false, message: error });
      }

      console.log("✅ [STUDENT EVENTS - SUBMIT DEBUG] Thông tin câu hỏi:", {
        questionId: questionDetail.question.id,
        questionType: questionDetail.question.questionType,
        questionOrder: questionDetail.questionOrder,
        correctAnswer:
          questionDetail.question.correctAnswer?.substring(0, 30) + "...",
      });

      // Check if contestant already answered this question
      console.log(
        "🔍 [STUDENT EVENTS - SUBMIT DEBUG] Kiểm tra đã trả lời chưa..."
      );
      const existingResult = await prisma.result.findFirst({
        where: {
          contestantId: socket.contestantId,
          matchId: matchId,
          questionOrder: questionOrder,
        },
      });

      if (existingResult) {
        const error = "Already answered this question";
        console.log(
          "⚠️ [STUDENT EVENTS - SUBMIT DEBUG] Đã trả lời câu hỏi này rồi:",
          {
            resultId: existingResult.id,
            isCorrect: existingResult.isCorrect,
            createdAt: existingResult.createdAt,
          }
        );
        logger.warn(
          `❌ ${error}: Contestant ${socket.contestantId}, Question ${questionOrder}`
        );
        return callback?.({
          success: false,
          message: error,
          result: {
            isCorrect: existingResult.isCorrect,
            questionOrder: questionOrder,
            submittedAt: existingResult.createdAt,
            eliminated: (contestant.status as string) === "eliminate",
          },
        });
      }

      // Validate answer based on question type
      console.log("🔍 [STUDENT EVENTS - SUBMIT DEBUG] Kiểm tra đáp án...");
      let isCorrect = false;
      const question = questionDetail.question;

      console.log(`🔍 [SUBMIT] Checking answer:`, {
        questionType: question.questionType,
        studentAnswer: answer,
        correctAnswer: question.correctAnswer?.substring(0, 50) + "...",
      });

      if (question.questionType === "multiple_choice") {
        // For multiple choice, compare with correctAnswer field
        isCorrect =
          answer.toLowerCase().trim() ===
          question.correctAnswer?.toLowerCase().trim();
      } else {
        // For other types, compare with correctAnswer
        isCorrect =
          answer.toLowerCase().trim() ===
          question.correctAnswer?.toLowerCase().trim();
      }

      console.log(`✅ [SUBMIT] Answer validation result:`, { isCorrect });
      console.log(
        "📊 [STUDENT EVENTS - SUBMIT DEBUG] Kết quả so sánh đáp án:",
        {
          studentAnswer: answer.toLowerCase().trim(),
          correctAnswer: question.correctAnswer?.toLowerCase().trim(),
          isCorrect: isCorrect,
          questionType: question.questionType,
        }
      );

      // Save result to database
      console.log(
        "💾 [STUDENT EVENTS - SUBMIT DEBUG] Bắt đầu lưu kết quả vào database..."
      );
      console.log("💾 [STUDENT EVENTS - SUBMIT DEBUG] Dữ liệu sẽ lưu:", {
        name: answer,
        contestantId: socket.contestantId,
        matchId: matchId,
        isCorrect: isCorrect,
        questionOrder: questionOrder,
      });

      const result = await prisma.result.create({
        data: {
          contestantId: socket.contestantId!,
          matchId: matchId,
          isCorrect: isCorrect,
          questionOrder: questionOrder,
        },
        include: {
          contestant: {
            include: {
              student: {
                select: { fullName: true, studentCode: true },
              },
            },
          },
        },
      });

      console.log(
        "✅ [STUDENT EVENTS - SUBMIT DEBUG] Đã lưu kết quả thành công vào database:",
        {
          resultId: result.id,
          contestantId: result.contestantId,
          isCorrect: result.isCorrect,
          createdAt: result.createdAt,
          studentName: result.contestant.student?.fullName,
        }
      );

      logger.info(
        `✅ Answer submitted: Contestant ${socket.contestantId} (${result.contestant.student?.fullName}) | Question ${questionOrder} | Correct: ${isCorrect}`
      );

      // Get total questions for progress tracking
      console.log("🔍 [STUDENT EVENTS - SUBMIT DEBUG] Tính toán progress...");
      const totalQuestions = await prisma.questionDetail.count({
        where: {
          questionPackageId: match.questionPackageId,
          isActive: true,
        },
      });

      console.log("📊 [STUDENT EVENTS - SUBMIT DEBUG] Progress info:", {
        answeredQuestions: questionOrder,
        totalQuestions: totalQuestions,
        progress: `${questionOrder}/${totalQuestions}`,
      });

      // Broadcast result to all clients in the match room
      console.log(
        "📡 [STUDENT EVENTS - SUBMIT DEBUG] Bắt đầu broadcast kết quả..."
      );
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
          totalQuestions: totalQuestions,
        },
      };

      console.log(
        "📡 [STUDENT EVENTS - SUBMIT DEBUG] Dữ liệu broadcast:",
        answerSubmissionData
      );

      // Broadcast to admin/judge namespace
      io.of("/match-control")
        .to(roomName)
        .emit("match:answerSubmitted", answerSubmissionData);
      console.log(
        "📡 [STUDENT EVENTS - SUBMIT DEBUG] Đã broadcast tới /match-control namespace"
      );

      // Broadcast to students namespace
      io.of("/student")
        .to(roomName)
        .emit("match:answerSubmitted", answerSubmissionData);
      console.log(
        "📡 [STUDENT EVENTS - SUBMIT DEBUG] Đã broadcast tới /student namespace"
      );

      // 🔥 IMPROVED: Handle incorrect answer - Auto-elimination Logic
      let isEliminated = false;
      if (!isCorrect) {
        console.log(
          `⚠️ [ELIMINATION] Thí sinh ${socket.contestantId} trả lời sai - bắt đầu elimination logic`
        );
        console.log(
          "🔥 [STUDENT EVENTS - SUBMIT DEBUG] Bắt đầu xử lý elimination..."
        );

        try {
          // Update contestant status to eliminated
          console.log(
            "💾 [STUDENT EVENTS - SUBMIT DEBUG] Cập nhật trạng thái contestant thành eliminate..."
          );
          const eliminatedContestant = await prisma.contestant.update({
            where: { id: socket.contestantId },
            data: {
              status: "eliminate",
            },
          });

          isEliminated = true;
          console.log(
            `🚫 [ELIMINATION] Thí sinh ${contestant.student?.fullName} đã bị loại`
          );
          console.log(
            "✅ [STUDENT EVENTS - SUBMIT DEBUG] Đã cập nhật trạng thái eliminate thành công"
          );

          // 🔥 IMPROVED: Create elimination log with better error handling
          try {
            console.log(
              "💾 [STUDENT EVENTS - SUBMIT DEBUG] Tạo elimination log..."
            );
            await prisma.$executeRaw`
              INSERT INTO elimination_logs (contestant_id, question_order, elimination_reason, eliminated_at)
              VALUES (${socket.contestantId}, ${questionOrder}, 'incorrect_answer', NOW())
            `;
            console.log(
              "✅ [STUDENT EVENTS - SUBMIT DEBUG] Đã tạo elimination log thành công"
            );
          } catch (logError) {
            console.warn(
              `⚠️ [ELIMINATION] Could not create elimination log: ${logError}`
            );
            console.warn(
              "⚠️ [STUDENT EVENTS - SUBMIT DEBUG] Không thể tạo elimination log nhưng tiếp tục process"
            );
            // Continue with elimination process even if logging fails
          }

          // Prepare elimination data for broadcast
          const eliminationData = {
            contestantId: socket.contestantId,
            studentName: contestant.student?.fullName,
            studentCode: contestant.student?.studentCode,
            questionOrder: questionOrder,
            eliminationReason: "incorrect_answer",
            eliminatedAt: new Date().toISOString(),
            matchId: socket.matchId,
          };

          console.log(
            "📡 [STUDENT EVENTS - SUBMIT DEBUG] Dữ liệu elimination broadcast:",
            eliminationData
          );

          // Broadcast elimination to admin/judge namespace
          io.of("/match-control")
            .to(roomName)
            .emit("contestant:eliminated", eliminationData);
          console.log(
            "📡 [STUDENT EVENTS - SUBMIT DEBUG] Đã broadcast elimination tới /match-control"
          );

          // Broadcast elimination to other students (but not to the eliminated student)
          socket.to(roomName).emit("contestant:eliminated", eliminationData);
          console.log(
            "📡 [STUDENT EVENTS - SUBMIT DEBUG] Đã broadcast elimination tới các student khác"
          );

          // Send special elimination notification to the eliminated student
          socket.emit("student:eliminated", {
            message: "Bạn đã bị loại khỏi trận đấu vì trả lời sai",
            questionOrder: questionOrder,
            eliminatedAt: new Date().toISOString(),
            correctAnswer: question.correctAnswer, // Show correct answer after elimination
            explanation: question.explanation || "Không có giải thích",
            redirectTo: "/student/dashboard", // Suggest redirect
          });
          console.log(
            "📡 [STUDENT EVENTS - SUBMIT DEBUG] Đã gửi thông báo elimination riêng cho thí sinh bị loại"
          );

          logger.info(
            `🚫 Contestant eliminated: ${socket.contestantId} (${contestant.student?.fullName}) | Question ${questionOrder} | Reason: incorrect_answer`
          );
        } catch (eliminationError) {
          console.error(
            "💥 [STUDENT EVENTS - SUBMIT DEBUG] Lỗi trong quá trình elimination:",
            eliminationError
          );
          logger.error(`❌ Error in elimination logic: ${eliminationError}`);
          // Continue with normal flow even if elimination fails
        }
      }

      // Send confirmation to the submitting student
      console.log(
        "📤 [STUDENT EVENTS - SUBMIT DEBUG] Chuẩn bị response cho student..."
      );
      const responseData = {
        success: true,
        message: isCorrect
          ? "Câu trả lời chính xác! 🎉"
          : "Câu trả lời không chính xác 😔",
        result: {
          isCorrect: isCorrect,
          questionOrder: questionOrder,
          submittedAt: result.createdAt,
          correctAnswer: !isCorrect ? question.correctAnswer : undefined, // Show correct answer if wrong
          explanation: !isCorrect ? question.explanation : undefined, // Show explanation if wrong
          score: isCorrect ? question.score : 0,
          eliminated: isEliminated, // 🔥 IMPROVED: Use actual elimination status
        },
      };

      console.log("📤 [STUDENT EVENTS - SUBMIT DEBUG] Response data:", {
        success: responseData.success,
        message: responseData.message,
        isCorrect: responseData.result.isCorrect,
        eliminated: responseData.result.eliminated,
        score: responseData.result.score,
      });

      callback?.(responseData);
      console.log(
        "📤 [STUDENT EVENTS - SUBMIT DEBUG] Đã gửi response callback"
      );

      // Additional statistics logging - Fixed aggregate query
      console.log("📊 [STUDENT EVENTS - SUBMIT DEBUG] Tính toán statistics...");
      const studentStats = await prisma.result.groupBy({
        by: ["contestantId"],
        where: {
          contestantId: socket.contestantId,
          matchId: matchId,
        },
        _count: {
          id: true,
        },
        _sum: {
          questionOrder: true, // Use a numeric field that exists
        },
      });

      // Calculate correct answers separately
      const correctAnswersCount = await prisma.result.count({
        where: {
          contestantId: socket.contestantId,
          matchId: matchId,
          isCorrect: true,
        },
      });

      const totalAnswers = studentStats[0]?._count.id || 0;

      console.log(`📊 [STATS] Thí sinh ${socket.contestantId} stats:`, {
        totalAnswers: totalAnswers,
        correctAnswers: correctAnswersCount,
        accuracy:
          totalAnswers > 0
            ? Math.round((correctAnswersCount / totalAnswers) * 100)
            : 0,
        eliminated: isEliminated,
      });

      console.log(
        "🚀 [STUDENT EVENTS - SUBMIT DEBUG] ===== HOÀN THÀNH XỬ LÝ SUBMIT ANSWER ====="
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ [SUBMIT] Error in student:submitAnswer:`, errorMessage);
      console.error(
        "💥 [STUDENT EVENTS - SUBMIT DEBUG] LỖI TRONG QUÁ TRÌNH XỬ LÝ:",
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : "No stack trace",
        }
      );
      logger.error(`❌ Error in student:submitAnswer: ${errorMessage}`);
      callback?.({
        success: false,
        message: "Không thể gửi câu trả lời. Vui lòng thử lại!",
      });
    }
  });

  /**
   * Event: student:getMatchStatus
   * Get current match status for the student
   */
  socket.on("student:getMatchStatus", async callback => {
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
                select: { name: true, status: true },
              },
            },
          },
        },
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get contestant's results for this match
      const results = await prisma.result.findMany({
        where: {
          contestantId: socket.contestantId,
          matchId: socket.matchId,
        },
        orderBy: { questionOrder: "asc" },
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
            submittedAt: r.createdAt,
          })),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
        logger.warn(
          `❌ ${error}: Socket match ${socket.matchId} vs requested ${matchId}`
        );
        return callback?.({ success: false, message: error });
      }

      // Get match information
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          questionPackage: {
            select: { name: true },
          },
          round: {
            include: {
              contest: {
                select: { name: true, status: true },
              },
            },
          },
        },
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
          questionOrder: questionOrder,
        },
        include: {
          question: {
            include: {
              questionTopic: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!questionDetail) {
        const error = "Question not found";
        logger.warn(
          `❌ [VALIDATION] Question not found for match ${matchId}, order ${questionOrder}`
        );
        return callback?.({ success: false, message: error });
      }

      callback?.({
        success: true,
        data: {
          matchId: match.id,
          matchName: match.name,
          contestName: match.round.contest.name,
          currentQuestion: match.currentQuestion,
          remainingTime: match.remainingTime,
          question: {
            id: questionDetail.question.id,
            intro: questionDetail.question.intro,
            content: questionDetail.question.content,
            questionType: questionDetail.question.questionType,
            difficulty: questionDetail.question.difficulty,
            defaultTime: questionDetail.question.defaultTime,
            score: questionDetail.question.score,
            options: questionDetail.question.options
              ? JSON.parse(questionDetail.question.options as string)
              : null,
            correctAnswer: questionDetail.question.correctAnswer,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ [GET_QUESTION] Error in student:getQuestion:`,
        errorMessage
      );
      logger.error(`❌ Error in student:getQuestion: ${errorMessage}`);
      callback?.({
        success: false,
        message: "Không thể lấy thông tin câu hỏi. Vui lòng thử lại!",
      });
    }
  });

  /**
   * Event: joinMatchRoom
   * Allow student to join a match room for real-time updates
   */
  socket.on(
    "joinMatchRoom",
    async (matchId: number, callback?: (response: any) => void) => {
      try {
        console.log(
          `🏠 [STUDENT JOIN ROOM] Socket ${socket.id} wants to join matchId: ${matchId}`
        );
        console.log(
          `🏠 [STUDENT JOIN ROOM] Socket contestantId: ${socket.contestantId}`
        );

        // Check if contestant exists
        if (!socket.contestantId) {
          const error = "Contestant not found in socket";
          console.log(
            `❌ [STUDENT JOIN ROOM] ${error} cho socket: ${socket.id}`
          );
          logger.warn(`❌ ${error}: ${socket.id}`);
          return callback?.({ success: false, message: error });
        }

        // Check if contestant exists and has access to this match
        const contestant = await prisma.contestant.findUnique({
          where: { id: socket.contestantId },
          include: {
            student: {
              select: { fullName: true, studentCode: true },
            },
            contest: {
              include: {
                round: {
                  include: {
                    matches: {
                      where: { id: matchId },
                    },
                  },
                },
              },
            },
          },
        });

        if (!contestant) {
          const error = "Contestant not found in database";
          console.log(
            `❌ [STUDENT JOIN ROOM] ${error}: ${socket.contestantId}`
          );
          logger.warn(`❌ ${error}: ${socket.contestantId}`);
          return callback?.({ success: false, message: error });
        }

        console.log(`✅ [STUDENT JOIN ROOM] Contestant found:`, {
          contestantId: contestant.id,
          studentName: contestant.student?.fullName,
          contestId: contestant.contestId,
        });

        // Check if match exists in contestant's contest
        const hasAccess =
          contestant.contest?.round?.some((round: any) =>
            round.matches?.some((match: any) => match.id === matchId)
          ) || false;

        if (!hasAccess) {
          const error = "No access to this match";
          console.log(
            `❌ [STUDENT JOIN ROOM] ${error}: Match ${matchId} for contestant ${socket.contestantId}`
          );
          logger.warn(
            `❌ ${error}: Match ${matchId} for contestant ${socket.contestantId}`
          );
          return callback?.({ success: false, message: error });
        }

        const roomName = `match-${matchId}`;

        // DEBUG: Trước khi join
        const studentsInRoomBefore = namespace.adapter.rooms.get(roomName);
        console.log(`📊 [STUDENT JOIN ROOM] Room ${roomName} trước khi join:`, {
          roomSize: studentsInRoomBefore?.size || 0,
          allSocketsInRoom: studentsInRoomBefore
            ? Array.from(studentsInRoomBefore)
            : [],
        });

        socket.join(roomName);

        // DEBUG: Sau khi join
        const studentsInRoomAfter = namespace.adapter.rooms.get(roomName);
        console.log(`📊 [STUDENT JOIN ROOM] Room ${roomName} sau khi join:`, {
          roomSize: studentsInRoomAfter?.size || 0,
          allSocketsInRoom: studentsInRoomAfter
            ? Array.from(studentsInRoomAfter)
            : [],
          currentSocketId: socket.id,
          socketJoined: studentsInRoomAfter
            ? studentsInRoomAfter.has(socket.id)
            : false,
        });

        console.log(
          `✅ [STUDENT JOIN ROOM] Socket ${socket.id} joined room: ${roomName}`
        );
        logger.info(
          `Student socket ${socket.id} joined room: ${roomName} | Contestant: ${contestant.id} | Student: ${contestant.student?.fullName}`
        );

        // Kiểm tra số lượng clients trong room
        const roomSize = namespace.adapter.rooms.get(roomName)?.size || 0;
        console.log(
          `📊 [STUDENT JOIN ROOM] Room ${roomName} now has ${roomSize} students`
        );

        // Response với acknowledgement
        if (callback) {
          const response = {
            success: true,
            message: `Successfully joined room ${roomName}`,
            roomSize: roomSize,
            contestantId: socket.contestantId,
            studentName: contestant.student?.fullName,
          };
          console.log(`📨 [STUDENT JOIN ROOM] Sending response:`, response);
          callback(response);
        }
      } catch (error) {
        console.error(
          `❌ [STUDENT JOIN ROOM] Error joining room for match ${matchId}:`,
          error
        );
        logger.error(`Error joining room for match ${matchId}`, error);
        if (callback) {
          callback({ success: false, message: "Failed to join room." });
        }
      }
    }
  );

  /**
   * Event: leaveMatchRoom
   * Allow student to leave a match room
   */
  socket.on("leaveMatchRoom", (matchId: number) => {
    const roomName = `match-${matchId}`;
    socket.leave(roomName);
    console.log(
      `🚪 [STUDENT LEAVE ROOM] Socket ${socket.id} left room: ${roomName}`
    );
    logger.info(`Student socket ${socket.id} left room: ${roomName}`);
  });
};
