// src/socket/namespaces/matchControl.namespace.ts
import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { registerQuestionEvents } from "../events/question.events";
import { registerScreenEvents } from "../events/screen.events";
import { registerTimerEvents } from "../events/timer.event";
import { registerUpdateStatusByAdminEvents } from "../events/Admin/updateStatus.events";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import cookie from "cookie";

const extractUserFromSocket = (socket: Socket): JwtPayload | null => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return null;

    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;
    if (!token) return null;

    const payload = verifyToken(token) as JwtPayload;

    return payload || null;
  } catch (error) {
    return null;
  }
};

export const registerMatchControlEvents = (io: Server, socket: Socket) => {
  // Tham gia phòng của một trận đấu
  socket.on(
    "joinMatchRoom",
    (matchId: number, callback?: (response: any) => void) => {
      try {
        console.log(`🏠 [JOIN ROOM] Socket ${socket.id} wants to join matchId: ${matchId}`);
        
        const roomName = `match-${matchId}`;
        socket.join(roomName);

        
        logger.info(`✅ Socket ${socket.id} joined room: ${roomName}`);

        const user = extractUserFromSocket(socket);
        if (user) {
          (socket as any).user = user; // lưu để dùng lại
          if (user.role === "Judge" && user.userId) {
            const judgeRoom = `match-${matchId}-judge-${user.userId}`;
            socket.join(judgeRoom);
            logger.info(` Judge ${user.userId} joined room: ${judgeRoom}`);
          }
        } else {
          logger.info(`Public viewer joined match ${matchId}`);
        }

        if (callback) {
          callback({
            success: true,
            message: `Joined match room ${roomName}`,
          });
        }
      } catch (err) {
        logger.error(`Failed to join room for match ${matchId}`, err);
        if (callback)
          callback({ success: false, message: "Failed to join match room." });
      }
    }
  );

  socket.on("leaveMatchRoom", (matchId: number) => {
    const roomName = `match-${matchId}`;
    socket.leave(roomName);
    logger.info(`🚪 Socket ${socket.id} left room: ${roomName}`);
  });

  // Rời khỏi phòng judge riêng
  socket.on("leaveJudgeRoom", (matchId: number) => {
    const user = (socket as any).user as JwtPayload;
    if (user && user.role === "Judge" && user.userId) {
      const judgeRoom = `match-${matchId}-judge-${user.userId}`;
      socket.leave(judgeRoom);
      logger.info(`🚪 Socket ${socket.id} left judge room: ${judgeRoom}`);
    } else {
      logger.warn(
        `⚠️ Socket ${socket.id} tried to leave judge room without being judge`
      );
    }
  });

  // Đăng ký các module con trong namespace matchControl
  registerQuestionEvents(io, socket);
  registerScreenEvents(io, socket);
  registerTimerEvents(io, socket);
  registerUpdateStatusByAdminEvents(io, socket);
};
