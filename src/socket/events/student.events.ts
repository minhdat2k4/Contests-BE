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

  // REMOVED: All match control events (match:start, match:nextQuestion, match:pauseTimer, match:resumeTimer, match:end)
  // These events are security vulnerabilities when handled by students

  console.log("🎯 [BE STUDENT EVENTS] Đang đăng ký event: match:start");
  /**
   * Event: student:getMatchStatus
   * Get current match status and results
   */
  socket.on("student:getMatchStatus", async (callback) => {
    console.log('📊 [BE STUDENT EVENTS] Nhận event student:getMatchStatus từ student:', {
      socketId: socket.id,
      username: socket.user.username,
      contestantId: socket.contestantId
    });

    try {
      if (!socket.contestantId || !socket.matchId) {
        return callback?.({ 
          success: false, 
          message: "Not joined to any match. Please join a match first." 
        });
      }

      // Get match data
      const match = await prisma.match.findUnique({
        where: { id: socket.matchId },
        include: {
          round: {
            include: {
              contest: true,
            },
          },
        },
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get student's results
      const results = await prisma.result.findMany({
        where: {
          contestantId: socket.contestantId,
          matchId: socket.matchId
        },
        select: {
          questionOrder: true,
          isCorrect: true,
          createdAt: true
        },
        orderBy: {
          questionOrder: 'asc'
        }
      });

      callback?.({
        success: true,
        message: "Match status retrieved successfully",
        data: {
          matchData: {
            matchId: match.id,
            matchName: match.name,
            contestName: match.round.contest.name,
            currentQuestion: match.currentQuestion,
            remainingTime: match.remainingTime,
            status: match.status
          },
          results: results.map((result: any) => ({
            questionOrder: result.questionOrder,
            isCorrect: result.isCorrect,
            submittedAt: result.createdAt.toISOString()
          }))
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('❌ [BE STUDENT EVENTS] Error in student:getMatchStatus:', errorMessage);
      logger.error(`❌ Error in student getMatchStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });

  console.log('🎯 [BE STUDENT EVENTS] Đang đăng ký event: student:getQuestion');
  /**
   * Event: student:getQuestion  
   * Get specific question data
   */
  socket.on("student:getQuestion", async (data, callback) => {
    console.log('❓ [BE STUDENT EVENTS] Nhận event student:getQuestion từ student:', {
      data: data,
      socketId: socket.id,
      username: socket.user.username
    });

    try {
      const validatedData = GetQuestionSchema.parse(data);
      const { matchId, questionOrder } = validatedData;

      // Verify the student is in this match
      if (socket.matchId !== matchId) {
        return callback?.({ success: false, message: "Not authorized for this match" });
      }

      // Get the question using questionDetail
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          questionPackageId: true
        }
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get question through questionDetail
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder,
          isActive: true
        },
        include: {
          question: {
            select: {
              id: true,
              content: true,
              options: true
            }
          }
        }
      });

      if (!questionDetail) {
        return callback?.({ success: false, message: "Question not found" });
      }

      const question = questionDetail.question;
      let choices: any[] = [];

      // Parse options if they exist
      if (question.options) {
        try {
          choices = JSON.parse(question.options as string);
        } catch (e) {
          choices = [];
        }
      }

      callback?.({
        success: true,
        message: "Question retrieved successfully",
        data: {
          id: question.id,
          order: questionDetail.questionOrder,
          text: question.content,
          choices: choices.map((choice: any, index: number) => ({
            id: index,
            text: choice.text || choice,
            isCorrect: false // Don't expose correct answer to students
          }))
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('❌ [BE STUDENT EVENTS] Error in student:getQuestion:', errorMessage);
      logger.error(`❌ Error in student getQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get question" });
    }
  });

  console.log('🎯 [BE STUDENT EVENTS] Đang đăng ký event: joinMatchRoom');
  /**
   * Event: joinMatchRoom
   * Legacy event for joining match rooms
   */
  socket.on("joinMatchRoom", async (matchId: number, callback?: (response: any) => void) => {
    console.log('🏠 [BE STUDENT EVENTS] Nhận event joinMatchRoom từ student:', {
      matchId,
      socketId: socket.id,
      username: socket.user.username
    });

    try {
      const roomName = `match-${matchId}`;
      await socket.join(roomName);
      socket.matchId = matchId;

      console.log('✅ [BE STUDENT EVENTS] Student joined match room:', {
        matchId,
        roomName,
        username: socket.user.username
      });

      callback?.({
        success: true,
        message: `Joined match room: ${roomName}`,
        roomName: roomName
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('❌ [BE STUDENT EVENTS] Error in joinMatchRoom:', errorMessage);
      logger.error(`❌ Error in joinMatchRoom: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to join room" });
    }
  });

  console.log('🎯 [BE STUDENT EVENTS] Đang đăng ký event: leaveMatchRoom');
  /**
   * Event: leaveMatchRoom
   * Leave a match room
   */
  socket.on("leaveMatchRoom", (matchId: number) => {
    console.log('🚪 [BE STUDENT EVENTS] Nhận event leaveMatchRoom từ student:', {
      matchId,
      socketId: socket.id,
      username: socket.user.username
    });

    const roomName = `match-${matchId}`;
    socket.leave(roomName);
    
    if (socket.matchId === matchId) {
      socket.matchId = undefined;
    }

    console.log('✅ [BE STUDENT EVENTS] Student left match room:', {
      matchId,
      roomName,
      username: socket.user.username
    });
  });

  console.log('✅ [BE STUDENT EVENTS] Hoàn thành đăng ký tất cả events cho student:', {
    socketId: socket.id,
    username: socket.user.username,
    eventsRegistered: [
      'student:getMatchStatus', 
      'student:getQuestion',
      'joinMatchRoom',
      'leaveMatchRoom'
    ]
  });
};
