// src/socket/namespaces/matchControl.namespace.ts
import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { registerQuestionEvents } from "../events/question.events";
// Import các handlers sự kiện khác nếu có
// import { registerScoreEvents } from "../events/score.events";

export const registerMatchControlEvents = (io: Server, socket: Socket) => {
    // Sự kiện khi client muốn tham gia (xem) một trận đấu cụ thể
    socket.on("joinMatchRoom", (matchId: number, callback: (response: any) => void) => {
        try {
            const roomName = `match-${matchId}`;
            socket.join(roomName);
            logger.info(`Socket ${socket.id} joined room: ${roomName}`);

            // Sử dụng acknowledgement để báo lại cho client là đã join thành công
            if (callback) callback({ success: true, message: `Successfully joined room ${roomName}` });
        } catch (error) {
            logger.error(`Error joining room for match ${matchId}`, error);
            if (callback) callback({ success: false, message: "Failed to join room." });
        }
    });

    // Sự kiện khi client rời phòng
    socket.on("leaveMatchRoom", (matchId: number) => {
        const roomName = `match-${matchId}`;
        socket.leave(roomName);
        logger.info(`Socket ${socket.id} left room: ${roomName}`);
    });

    // Đăng ký các sự kiện con cho namespace này
    registerQuestionEvents(io, socket);
    // registerScoreEvents(io, socket);
    // ...
};
