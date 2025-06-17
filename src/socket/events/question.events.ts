// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { z } from "zod";

// Dùng Zod để validate payload của sự kiện
const questionEventSchema = z.object({
    matchId: z.number().positive(),
    questionOrder: z.number().positive(),
});

const answerEventSchema = questionEventSchema.extend({
    answer: z.any()
});


export const registerQuestionEvents = (io: Server, socket: Socket) => {
    // Sự kiện khi ban giám khảo hiển thị câu hỏi tiếp theo
    socket.on("showNextQuestion", (data: unknown) => {
        const validation = questionEventSchema.safeParse(data);
        if (!validation.success) {
            logger.warn("Invalid payload for 'showNextQuestion'", { errors: validation.error.errors });
            return;
        }

        const { matchId, questionOrder } = validation.data;
        const roomName = `match-${matchId}`;

        logger.info(`Broadcasting 'newQuestionDisplayed' to room ${roomName}`, { questionOrder });

        // Gửi sự kiện đến tất cả client trong room của trận đấu
        io.to(roomName).emit("newQuestionDisplayed", { questionOrder });
    });

    // Sự kiện khi hiển thị đáp án
    socket.on("showAnswer", (data: unknown) => {
        const validation = answerEventSchema.safeParse(data);
        if (!validation.success) {
            logger.warn("Invalid payload for 'showAnswer'", { errors: validation.error.errors });
            return;
        }

        const { matchId, questionOrder, answer } = validation.data;
        const roomName = `match-${matchId}`;

        logger.info(`Broadcasting 'answerRevealed' to room ${roomName}`, { questionOrder });
        io.to(roomName).emit("answerRevealed", { questionOrder, answer });
    });
};
