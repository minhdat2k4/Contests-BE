// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";

export const registerScreenEvents = (io: Server, socket: Socket) => {
  socket.on("screen:update", async (data, callback) => {
    const { match, controlKey, controlValue, media } = data;
    const matchRaw = await MatchService.MatchControl(match);
    if (!matchRaw) {
      return callback({ success: false, message: "Không tìm thấy trận đấu" });
    }

    const screen = await MatchService.ScreenControl(matchRaw.id);
    if (!screen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const roomName = `match-${match}`;

    const updatePayload: UpdateScreenInput = {
      media: media,
      controlKey: controlKey,
      controlValue: controlValue,
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    callback(null, {
      message: "Cập nhật màn hình thành công",
    });

    io.of("/match-control").to(roomName).emit("screen:update", {
      updatedScreen,
    });
  });
};
