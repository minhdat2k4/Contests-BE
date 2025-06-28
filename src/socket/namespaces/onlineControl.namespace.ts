import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerMatchEvents } from "../events/match.events";
import { prisma } from "@/config/database";
import cookie from "cookie";

// Interface cho authenticated socket
interface AuthenticatedSocket extends Socket {
  user: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  matchId?: number;
}

// Extract user từ socket cookie
const extractUserFromSocket = async (socket: Socket): Promise<JwtPayload | null> => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return null;
    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;
    if (!token) return null;
    const payload = verifyToken(token) as JwtPayload;
    if (!payload) return null;
    return payload;
  } catch {
    return null;
  }
};

// Register online-control namespace events
export const registerOnlineControlNamespaceEvents = async (io: Server, socket: Socket) => {
  const user = await extractUserFromSocket(socket);
  if (!user) {
    socket.disconnect();
    return;
  }
  if (!["Admin", "Judge"].includes(user.role)) {
    socket.disconnect();
    return;
  }
  (socket as AuthenticatedSocket).user = user;
  registerMatchEvents(io, socket as AuthenticatedSocket);

  socket.on("onlineControl:joinMatch", (data: { matchId: number }, callback?: (response: any) => void) => {
    try {
      const { matchId } = data;
      const controlRoomName = `match-${matchId}`;
      socket.join(controlRoomName);
      (socket as AuthenticatedSocket).matchId = matchId;
      if (callback) {
        callback({
          success: true,
          message: `Joined control room ${controlRoomName}`,
          roomName: controlRoomName,
          matchId
        });
      }
    } catch (error) {
      if (callback) {
        callback({
          success: false,
          message: "Failed to join control room"
        });
      }
    }
  });

  socket.on("disconnect", (reason) => {
    const matchId = (socket as AuthenticatedSocket).matchId;
    if (matchId) {
      socket.to(`match-${matchId}`).emit("admin:disconnected", {
        adminId: user.userId,
        adminName: user.username,
        matchId: matchId,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    }
  });
};