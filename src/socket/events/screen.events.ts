// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";

export const registerScreenEvents = (io: Server, socket: Socket) => {
  socket.on("screen:update", async data => {
    const { match, controlKey, controlValue, media } = data;
    const matchRaw = await MatchService.MatchControl(match);
    if (!matchRaw) {
      console.log("Lấy thông tin trận đấu thất bại");
      return;
    }

    const screen = await MatchService.ScreenControl(matchRaw.id);
    if (!screen) return;

    const roomName = `match-${match}`;

    const updatePayload: UpdateScreenInput = {
      media: media,
      controlKey: controlKey,
      controlValue: controlValue,
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) return;

    io.of("/match-control").to(roomName).emit("screen:update", {
      updatedScreen,
    });
  });
};
