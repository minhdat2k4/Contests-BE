// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

export const registerQuestionEvents = (io: Server, socket: Socket) => {
  socket.on("currentQuestion:get", async data => {
    const { match, questionOrder } = data;

    // console.log(data);

    const matchRaw = await MatchService.MatchControl(match);
    if (!matchRaw) {
      return;
    }

    const currentQuestion = await MatchService.CurrentQuestion(
      questionOrder,
      matchRaw.questionPackageId
    );

    // console.log("data", data);

    const roomName = `match-${match}`;

    const updateMatch = await MatchService.update(matchRaw.id, {
      remainingTime: currentQuestion.defaultTime,
      currentQuestion: questionOrder,
    });
    if (!updateMatch) return;
    const matchInfo = await MatchService.MatchControl(match);
    io.of("/match-control").to(roomName).emit("currentQuestion:get", {
      currentQuestion,
      matchInfo,
    });
  });
};
