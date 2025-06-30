// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { GroupDivisionService } from "@/modules/groupDivision";
import { ResultService } from "@/modules/result";
import { ScreenService } from "@/modules/screen";

import { z } from "zod";
import { UserService } from "@/modules/user";

export const updateEliminated = z.object({
  match: z.string(),
  questionOrder: z.number(),
});

export const updateRescued = z.object({
  match: z.string(),
});

export type UpdateEliminatedData = z.infer<typeof updateEliminated>;
export type UpdateRescuedData = z.infer<typeof updateRescued>;

export const registerMatchDiagramEvents = (io: Server, socket: Socket) => {
  socket.on("update:Eliminated", async (rawData: unknown, callback) => {
    const validation = updateEliminated.safeParse(rawData);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;

    try {
      const match = await MatchService.MatchControl(payload.match);
      if (!match) {
        return callback({
          success: false,
          message: "Không tìm thấy trận đấu",
        });
      }

      const UpdateEliminated =
        await GroupDivisionService.UpdateContestantStatusEliminated(match.id);
      if (!UpdateEliminated) {
        return callback({
          success: false,
          message: "Cập nhật thí sinh loại thất bại",
        });
      }

      const in_progress: number[] = (
        await GroupDivisionService.getContestantMatchByStatus(
          match.id,
          "in_progress",
          payload.questionOrder
        )
      ).map(c => c.contestantId);

      if (!in_progress) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh đang thi",
        });
      }

      const eliminated: number[] = (
        await GroupDivisionService.getContestantMatchByStatus(
          match.id,
          "eliminated",
          payload.questionOrder
        )
      ).map(c => c.contestantId);

      if (!eliminated) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh bị loại",
        });
      }

      await ResultService.deleted(match.id, payload.questionOrder);

      const resultTrue = await ResultService.createIsCorrectTrues(
        match.id,
        payload.questionOrder,
        in_progress
      );

      if (!resultTrue) {
        return callback({
          success: false,
          message: "Cập nhật kết quả thí sinh đúng thất bại",
        });
      }

      const resultFalse = await ResultService.createIsCorrectFalses(
        match.id,
        payload.questionOrder,
        eliminated
      );

      if (!resultFalse) {
        return callback({
          success: false,
          message: "Cập nhật kết quả thí sinh sai thất bại",
        });
      }

      const ListContestant = await MatchService.ListContestant(match.id);

      if (!ListContestant) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const countInProgress = await MatchService.countIn_progress(match.id);

      const screen = await MatchService.ScreenControl(match.id);

      if (!screen)
        return callback({
          success: false,
          message: "Không tìm thấy màn hình",
        });

      const updatedScreen = await ScreenService.update(screen.id, {
        controlValue: "Eliminated",
      });

      if (!updatedScreen) {
        return callback({
          success: false,
          message: "Cập nhật màn hình không thành công",
        });
      }

      console.log(
        "Updated Screen:",
        updatedScreen,
        ListContestant,
        countInProgress
      );

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("update:Eliminated", {
        ListContestant,
        countInProgress,
        updatedScreen,
      });

      const judges = await UserService.ListJudgeByMatchId(match.id);
      if (judges) {
        judges.forEach(async judge => {
          const judgeRoom = `match-${payload.match}-judge-${judge.id}`;
          const data =
            await GroupDivisionService.getContestantByJudgeIdAndMatchId(
              judge.id,
              match.id
            );
          io.of("/match-control")
            .to(judgeRoom)
            .emit("contestant:status-update-judge", {
              data,
            });
        });
      }
      if (!judges) {
        return callback({
          success: false,
          message: "Không tìm thấy danh sách giám khảo",
        });
      }

      callback(null, {
        message: "Hiển thị thí sinh loại thành công",
        success: true,
      });
    } catch (error) {
      console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
      callback(new Error("Đã xảy ra lỗi nội bộ"));
    }
  });

  socket.on("update:Rescued", async (rawData: unknown, callback) => {
    const validation = updateRescued.safeParse(rawData);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;

    try {
      const match = await MatchService.MatchControl(payload.match);
      if (!match) {
        return callback({
          success: false,
          message: "Không tìm thấy trận đấu",
        });
      }

      const updateScreen = await ScreenService.update(match.id, {
        controlValue: "Rescued",
      });
      if (!updateScreen) {
        return callback({
          success: false,
          message: "Cập nhật màn hình không thành công",
        });
      }

      const ListContestant = await MatchService.ListContestant(match.id);
      if (!ListContestant) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const countInProgress = await MatchService.countIn_progress(match.id);

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("update:Rescused", {
        ListContestant,
        countInProgress,
        updateScreen,
      });
      callback(null, {
        message: "Hiển thị thí sinh cứu thành công",
        success: true,
      });
    } catch (error) {
      console.error("Lỗi khi tìm trận đấu:", error);
      return callback({
        success: false,
        message: "Đã xảy ra lỗi nội bộ",
      });
    }
  });
};
