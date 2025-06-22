import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

interface TimerUpdateData {
  match: string;
  newTime?: number; // Thêm trường này nếu cần cập nhật thời gian mới
}

type TimerStatus = "running" | "paused";

interface MatchTimer {
  timeRemaining: number;
  intervalId: NodeJS.Timeout | null;
  status: TimerStatus;
}

export const matchTimers = new Map<string, MatchTimer>();

export const registerTimerEvents = (io: Server, socket: Socket) => {
  const getRoomName = (match: string) => `match-${match}`;

  socket.on("timer:play", async (data: TimerUpdateData, callback) => {
    try {
      const { match } = data;
      const roomName = getRoomName(match);

      const matchInfo = await MatchService.MatchControl(match);
      if (!matchInfo) {
        return callback(new Error("Không tìm thấy trận đấu"));
      }

      const defaultTime = matchInfo.remainingTime ?? 30;

      let matchTimer = matchTimers.get(match);

      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(match, matchTimer);
      } else if (matchTimer.status === "running") {
        return callback(new Error("Bộ đếm thời gian đang chạy"));
      } else {
        // Nếu đã có timer nhưng đổi câu → cập nhật thời gian mới từ DB
        matchTimer.timeRemaining = defaultTime;
      }

      matchTimer.status = "running";

      matchTimer.intervalId = setInterval(async () => {
        if (matchTimer!.timeRemaining > 0) {
          matchTimer!.timeRemaining -= 1;

          try {
            await MatchService.UpdateMatchBySlug(
              match,
              matchTimer!.timeRemaining
            );
          } catch (error) {
            console.error("Lỗi khi cập nhật DB:", error);
          }

          io.of("/match-control").to(roomName).emit("timer:update", {
            timeRemaining: matchTimer!.timeRemaining,
          });
        } else {
          clearInterval(matchTimer!.intervalId!);
          matchTimer!.intervalId = null;
          matchTimer!.status = "paused";

          io.of("/match-control").to(roomName).emit("timer:ended");

          callback?.(null, {
            success: true,
            message: "Bộ đếm thời gian đã kết thúc",
          });
        }
      }, 1000);

      callback?.(null, {
        success: true,
        message: "Bắt đầu đếm thời gian",
      });
    } catch (err) {
      console.error("timer:play error", err);
      callback?.(new Error("Có lỗi xảy ra khi chạy bộ đếm"));
    }
  });

  socket.on("timer:pause", async (data: TimerUpdateData, callback) => {
    try {
      const { match } = data;
      const roomName = getRoomName(match);
      const matchTimer = matchTimers.get(match);

      if (!matchTimer) {
        return callback(new Error("Không tìm thấy bộ đếm thời gian"));
      }

      clearInterval(matchTimer.intervalId!);
      matchTimer.intervalId = null;
      matchTimer.status = "paused";

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
      });

      callback?.(null, {
        success: true,
        message: "Tạm dừng bộ đếm thời gian thành công",
      });
    } catch (err) {
      console.error("timer:pause error", err);
      callback?.(new Error("Có lỗi xảy ra khi tạm dừng bộ đếm"));
    }
  });

  socket.on("timer:reset", async (data: TimerUpdateData, callback) => {
    try {
      const { match } = data;
      const roomName = getRoomName(match);
      console.log("timer:reset", match);
      const matchInfo = await MatchService.MatchControl(match);

      if (!matchInfo) {
        return callback(new Error("Không tìm thấy trận đấu"));
      }

      const currentQuestion = await MatchService.CurrentQuestion(
        matchInfo.currentQuestion,
        matchInfo.questionPackageId
      );

      const defaultTime = currentQuestion?.defaultTime ?? 30;

      let matchTimer = matchTimers.get(match);
      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(match, matchTimer);
      } else {
        clearInterval(matchTimer.intervalId!);
        matchTimer.intervalId = null;
        matchTimer.status = "paused";
        matchTimer.timeRemaining = defaultTime;
      }

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
      });

      callback?.(null, {
        success: true,
        message: "Reset thời gian thành công",
      });
    } catch (err) {
      console.error("timer:reset error", err);
      callback?.(new Error("Có lỗi xảy ra khi reset thời gian"));
    }
  });

  socket.on("timer:update", async (data: TimerUpdateData, callback) => {
    try {
      const { match } = data;
      const roomName = getRoomName(match);
      const matchInfo = await MatchService.MatchControl(match);

      if (!matchInfo) {
        return callback(new Error("Không tìm thấy trận đấu"));
      }

      const defaultTime = Number(data.newTime) ?? 30;

      let matchTimer = matchTimers.get(match);
      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(match, matchTimer);
      } else {
        clearInterval(matchTimer.intervalId!);
        matchTimer.intervalId = null;
        matchTimer.status = "paused";
        matchTimer.timeRemaining = defaultTime;
      }

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
      });

      callback?.(null, {
        success: true,
        message: "Cập nhật thời gian thành công",
      });
    } catch (err) {
      console.error("timer:update error", err);
      callback?.(new Error("Có lỗi xảy ra khi cập nhật thời gian"));
    }
  });
};
