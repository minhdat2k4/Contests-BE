// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { RescueService } from "@/modules/rescues";
import { logger } from "@/utils/logger";
import { ScreenService } from "@/modules/screen";
import { GroupDivisionService } from "@/modules/groupDivision";
import ContestantService from "@/modules/contestant/contestant.service";

import { matchTimers } from "../events/timer.event";

export const registerQuestionEvents = (io: Server, socket: Socket) => {
  socket.on("currentQuestion:get", async (data, callback) => {
    // console.log("[DEBUG] Admin gửi currentQuestion:get:", data);

    const { match, questionOrder } = data;

    const matchTimer = matchTimers.get(match);
    if (matchTimer?.intervalId) {
      clearInterval(matchTimer.intervalId);
      matchTimer.intervalId = null;
      matchTimer.status = "paused";
    }

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

    const screen = await MatchService.ScreenControl(matchInfo.id);
    if (!screen) {
      return callback({
        success: false,
        message: "Không tìm thấy màn hình",
      });
    }

    await ScreenService.update(screen.id, {
      controlKey: "question",
    });

    await GroupDivisionService.UpdateContestantStatusByIds(matchInfo.id);

    const ListContestant = await MatchService.ListContestant(matchInfo.id);

    const isMatchStarted = matchRaw.status === "ongoing";
    callback?.(null, {
      success: true,
      message: `Đã chuyển sang câu ${currentQuestion.questionOrder}`,
    });

    // Admin luôn nhận cập nhật qua match-control (không ảnh hưởng logic cũ)
    io.of("/match-control").to(roomName).emit("currentQuestion:get", {
      currentQuestion,
      matchInfo,
      ListContestant,
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
      console.log(
        `[DEBUG] ⚠️ KHÔNG gửi câu hỏi cho học sinh (match chưa bắt đầu)`
      );
    }
  });

  // Event để cập nhật status rescue dựa vào câu hỏi hiện tại
  socket.on("rescue:updateStatusByQuestion", async (data, callback) => {
    try {
      const { matchId, currentQuestionOrder, match } = data;

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

      const roomName = `match-${match}`;

      // Trả về kết quả thông qua callback
      callback(null, {
        success: true,
        message: `Đã cập nhật ${result.totalUpdated} rescue`,
        data: result,
      });

      io.of("/match-control").to(roomName).emit("rescue:statusUpdated", {
        success: true,
        data: result,
      });
      const ListRescue = await RescueService.getListRescue(matchId);

      io.of("/match-control").to(roomName).emit("rescue:updateStatus", {
        ListRescue,
      });
    } catch (error) {
      logger.error("Socket error - rescue:updateStatusByQuestion:", error);
      callback({
        success: false,
        message: `Lỗi khi cập nhật trạng thái rescue: ${
          (error as Error).message
        }`,
      });
    }
  });

  // Event để gửi danh sách Top20 Winner lên màn chiếu
  socket.on("winner:showTop20", async (data, callback) => {
    try {
      const { matchId, match } = data;

      if (!matchId) {
        return callback({
          success: false,
          message: "Thiếu thông tin matchId",
        });
      }

      // Lấy danh sách thí sinh đã hoàn thành (completed)
      const result = await ContestantService.getCompletedContestants(
        Number(matchId),
        // Number(limit) // không cần giới hạn, lấy tất cả thí sinh đã hoàn thành
      );

      if (!result) {
        return callback({
          success: false,
          message: "Không thể lấy danh sách thí sinh qua vòng",
        });
      }

      const roomName = `match-${match}`;

      // Cập nhật screen control để hiển thị Top20 Winner
      const matchInfo = await MatchService.MatchControl(match);
      if (matchInfo) {
        const screen = await MatchService.ScreenControl(matchInfo.id);
        if (screen) {
          await ScreenService.update(screen.id, {
            controlKey: "top20Winner",
          });
        }
      }

      // Trả về kết quả thông qua callback
      callback(null, {
        success: true,
        message: `Đã gửi Top thí sinh qua vòng lên màn chiếu`,
        data: result,
      });

      // Gửi dữ liệu lên màn chiếu cho tất cả client đang xem
      io.emit("winner:top20Updated", {
        success: true,
        data: result,
        matchId,
        // limit,
      });

      // Gửi cập nhật screen control cho admin
      io.of("/match-control").to(roomName).emit("screen:update", {
        updatedScreen: {
          controlKey: "top20Winner",
        },
      });

      logger.info(`Đã gửi Top Winner cho match ${matchId}`);
    } catch (error) {
      logger.error("Socket error - winner:showTop20:", error);
      callback({
        success: false,
        message: `Lỗi khi gửi Top20 Winner: ${(error as Error).message}`,
      });
    }
  });

  // Event để ẩn Top20 Winner trên màn chiếu
  socket.on("winner:hideTop20", async (data, callback) => {
    try {
      const { matchId, match } = data;

      if (!matchId) {
        return callback({
          success: false,
          message: "Thiếu thông tin matchId",
        });
      }

      const roomName = `match-${match}`;

      // Cập nhật screen control về trạng thái mặc định
      const matchInfo = await MatchService.MatchControl(match);
      if (matchInfo) {
        const screen = await MatchService.ScreenControl(matchInfo.id);
        if (screen) {
          await ScreenService.update(screen.id, {
            controlKey: "question", // hoặc controlKey mặc định khác
          });
        }
      }

      // Trả về kết quả thông qua callback
      callback(null, {
        success: true,
        message: "Đã ẩn Top20 Winner khỏi màn chiếu",
      });

      // Gửi event ẩn Top20 Winner
      io.emit("winner:top20Hidden", {
        success: true,
        matchId,
      });

      // Gửi cập nhật screen control cho admin
      io.of("/match-control").to(roomName).emit("screen:update", {
        updatedScreen: {
          controlKey: "question",
        },
      });

      logger.info(`Đã ẩn Top20 Winner cho match ${matchId}`);
    } catch (error) {
      logger.error("Socket error - winner:hideTop20:", error);
      callback({
        success: false,
        message: `Lỗi khi ẩn Top20 Winner: ${(error as Error).message}`,
      });
    }
  });
};
