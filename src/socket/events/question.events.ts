// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { RescueService } from "@/modules/rescues";
import { logger } from "@/utils/logger";

import { matchTimers } from "../events/timer.event";

export const registerQuestionEvents = (io: Server, socket: Socket) => {
  socket.on("currentQuestion:get", async (data, callback) => {
    const { match, questionOrder } = data;

    const matchTimer = matchTimers.get(match);
    if (matchTimer?.intervalId) {
      clearInterval(matchTimer.intervalId);
      matchTimer.intervalId = null;
      matchTimer.status = "paused";
    }

    // console.log(data);

    const matchRaw = await MatchService.MatchControl(match);
    if (!matchRaw) {
      return callback({ success: false, message: "Không tìm thấy trận đấu" });
    }

    const currentQuestion = await MatchService.CurrentQuestion(
      questionOrder,
      matchRaw.questionPackageId
    );

    if (!currentQuestion) {
      return callback({ success: false, message: "Câu hỏi không hợp lệ" });
    }

    const roomName = `match-${match}`;

    const updateMatch = await MatchService.update(matchRaw.id, {
      remainingTime: currentQuestion.defaultTime,
      currentQuestion: questionOrder,
    });
    if (!updateMatch) {
      return callback({
        success: false,
        message: "Cập nhật trận đấu thất bại",
      });
    }

    const matchInfo = await MatchService.MatchControl(match);

    if (!matchInfo) {
      return callback({ success: false, message: "Không tìm thấy trận đấu" });
    }

    // 🔥 NEW: Kiểm tra trạng thái match trước khi gửi cho học sinh
    const isMatchStarted = matchRaw.status === "ongoing";

    // ✅ Admin luôn nhận feedback (không ảnh hưởng logic cũ)
    callback?.(null, {
      success: true,
      message: `Đã chuyển sang câu ${currentQuestion.questionOrder}`,
    });

    // Admin luôn nhận cập nhật qua match-control (không ảnh hưởng logic cũ)
    io.of("/match-control").to(roomName).emit("currentQuestion:get", {
      currentQuestion,
      matchInfo,
    });

    // 🔥 NEW: CHỈ gửi cho học sinh khi match đã bắt đầu
    if (isMatchStarted) {
      io.of("/student")
        .to(roomName)
        .emit("match:questionShown", {
          matchId: matchInfo.id,
          matchSlug: matchInfo.slug,
          currentQuestion: questionOrder,
          remainingTime: currentQuestion.defaultTime,
          currentQuestionData: {
            order: questionOrder,
            question: {
              id: currentQuestion.id,
              intro: currentQuestion.intro,
              content: currentQuestion.content,
              questionType: currentQuestion.questionType,
              difficulty: currentQuestion.difficulty,
              defaultTime: currentQuestion.defaultTime,
              score: currentQuestion.score,
              options: Array.isArray(currentQuestion.options)
                ? currentQuestion.options
                : typeof currentQuestion.options === "string"
                ? JSON.parse(currentQuestion.options)
                : [],
              media: Array.isArray((currentQuestion as any).media)
                ? (currentQuestion as any).media
                : [],
            },
          },
        });
    } else {
    }
  });

  // Event để cập nhật status rescue dựa vào câu hỏi hiện tại
  socket.on("rescue:updateStatusByQuestion", async (data, callback) => {
    try {
      const { matchId, currentQuestionOrder } = data;

      if (!matchId || currentQuestionOrder === undefined) {
        return callback({
          success: false,
          message: "Thiếu thông tin matchId hoặc currentQuestionOrder",
        });
      }

      // Gọi service để cập nhật trạng thái rescue
      const result = await RescueService.updateRescueStatusByCurrentQuestion(
        Number(matchId),
        Number(currentQuestionOrder)
      );

      if (!result) {
        return callback({
          success: false,
          message: "Cập nhật trạng thái rescue thất bại",
        });
      }

      const roomName = `match-${matchId}`;

      // Trả về kết quả thông qua callback
      callback(null, {
        success: true,
        message: `Đã cập nhật ${result.totalUpdated} rescue`,
        data: result,
      });

      // Emit event tới tất cả client trong room
      io.of("/match-control").to(roomName).emit("rescue:statusUpdated", {
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Socket error - rescue:updateStatusByQuestion:", error);
      callback({
        success: false,
        message: `Lỗi khi cập nhật trạng thái rescue: ${(error as Error).message}`,
      });
    }
  });
};
