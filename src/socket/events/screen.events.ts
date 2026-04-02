// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";
import { ControlKey, ControlValue } from "@prisma/client";
import { z } from "zod";
import { Logger } from "winston";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";

export const updateScreen = z.object({
  controlKey: z.nativeEnum(ControlKey).optional(),
  controlValue: z.nativeEnum(ControlValue).optional(),
  media: z.string().optional(),
  match: z.string(),
  value: z.string().optional(),
});

export type UpdateScreenData = z.infer<typeof updateScreen>;

export const registerScreenEvents = (io: Server, socket: Socket) => {
  socket.on("screen:update", async (data, callback) => {
    const validation = updateScreen.safeParse(data);
    if (!validation.success) {
      return callback({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    const payload = validation.data;

    const matchRaw = await MatchService.MatchControl(payload.match);
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

    const roomName = `match-${payload.match}`;

    const updatePayload: UpdateScreenInput = {
      media: payload.media,
      controlKey: payload.controlKey,
      controlValue: payload.controlValue,
      value: payload.value,
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
    var ListContestant = await MatchService.ListContestant(matchRaw.id);
    // const CPListContestant  =ListContestant;
    if (!ListContestant) {
      return callback({
        success: false,
        message: "Không tìm thấy thí sinh",
      });
    }
    if (payload.controlKey === ControlKey.matchDiagram) {
      //tuankiet auto band null result
      const toEliminate = await prisma.contestantMatch.findMany({
        where: {
          matchId: matchRaw.id,
          contestant: {
            results: {
              none: {
                matchId: matchRaw.id,
                questionOrder: matchRaw.currentQuestion
              }
            }
          }
        }
      });

      await Promise.all(
        toEliminate.map(c =>
          prisma.contestantMatch.update({
            where: {
              contestantId_matchId: {
                contestantId: c.contestantId,
                matchId: matchRaw.id,
              }
            },
            data: {
              status: c.status == "rescued" ? "rescued"
                :
                c.status == "banned" ? "banned" : "eliminated",
              // eliminatedAtQuestionOrder: c.status == "rescued" ? null : matchRaw.currentQuestion,
              rescuedAtQuestionOrder: c.status == "rescued" ? matchRaw.currentQuestion : null,
            }
          })
        )
      );
    }
    ListContestant = await MatchService.ListContestant(matchRaw.id);
    // const CPListContestant  =ListContestant;
    if (!ListContestant) {
      return callback({
        success: false,
        message: "Không tìm thấy thí sinh",
      });
    }
    logger.info("DSTS trc khi emit ", ListContestant[0].contestantMatches)
    io.of("/match-control").to(roomName).emit("screen:update", {
      updatedScreen,
      ListContestant,
    });
  });
};
