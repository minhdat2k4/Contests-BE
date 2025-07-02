// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

export const registerQuestionEvents = (io: Server, socket: Socket) => {
  socket.on("currentQuestion:get", async (data, callback) => {
    console.log('[DEBUG] Admin gửi currentQuestion:get:', data);

    const { match, questionOrder } = data;

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

    callback?.(null, {
      success: true,
      message: `Đã chuyển sang câu ${currentQuestion.questionOrder}`,
    });
    
    io.of("/match-control").to(roomName).emit("currentQuestion:get", {
      currentQuestion,
      matchInfo,
    });

    io.of("/student").to(roomName).emit("match:questionShown", {
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
          : typeof currentQuestion.options === 'string'
            ? JSON.parse(currentQuestion.options)
            : [],
        media: Array.isArray((currentQuestion as any).media)
          ? (currentQuestion as any).media
          : []
      }
      }
    });
  });
};
