// src/socket/namespaces/matchControl.namespace.ts
import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { registerQuestionEvents } from "../events/question.events";
import { registerScreenEvents } from "../events/screen.events";
// Import các handlers sự kiện khác nếu có
// import { registerScoreEvents } from "../events/score.events";

export const registerMatchControlEvents = (io: Server, socket: Socket) => {
  // Sự kiện khi client muốn tham gia (xem) một trận đấu cụ thể
  socket.on(
    "joinMatchRoom",
    (matchId: number, callback?: (response: any) => void) => {
      try {
        console.log(`🏠 [JOIN ROOM] Socket ${socket.id} wants to join matchId: ${matchId}`);
        
        const roomName = `match-${matchId}`;
        socket.join(roomName);
        
        console.log(`✅ [JOIN ROOM] Socket ${socket.id} joined room: ${roomName}`);
        logger.info(`Socket ${socket.id} joined room: ${roomName}`);

        // Kiểm tra số lượng clients trong room
        const roomSize = io.of("/match-control").adapter.rooms.get(roomName)?.size || 0;
        console.log(`📊 [JOIN ROOM] Room ${roomName} now has ${roomSize} clients`);

        // Sử dụng acknowledgement để báo lại cho client là đã join thành công
        if (callback) {
          const response = {
            success: true,
            message: `Successfully joined room ${roomName}`,
            roomSize: roomSize
          };
          console.log(`📨 [JOIN ROOM] Sending response:`, response);
          callback(response);
        }
      } catch (error) {
        console.error(`❌ [JOIN ROOM] Error joining room for match ${matchId}:`, error);
        logger.error(`Error joining room for match ${matchId}`, error);
        if (callback) {
          callback({ success: false, message: "Failed to join room." });
        }
      }
    }
  );

  // Sự kiện khi client rời phòng
  socket.on("leaveMatchRoom", (matchId: number) => {
    const roomName = `match-${matchId}`;
    socket.leave(roomName);
    console.log(`🚪 [LEAVE ROOM] Socket ${socket.id} left room: ${roomName}`);
    logger.info(`Socket ${socket.id} left room: ${roomName}`);
  });

  // Đăng ký các sự kiện con cho namespace này
  registerQuestionEvents(io, socket);
  registerScreenEvents(io, socket);
  // registerScoreEvents(io, socket);
  // ...
};
