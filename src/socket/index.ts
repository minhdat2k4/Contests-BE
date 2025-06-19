import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerMatchControlEvents } from "./namespaces/matchControl.namespace";
import { ExtendedError } from "socket.io/dist/namespace";
import { socketService } from "./SocketService";
import cookie from "cookie";
import { registerTestEvents } from "./events/test.events";

/**
 * Middleware xác thực kết nối Socket.IO bằng JWT trongc ookie httpOnly
 */
const authMiddleware = (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;

    if (!rawCookie) {
      logger.warn(`❌ No cookie provided. Socket ID: ${socket.id}`);
      return next(new Error("Authentication error: No cookie"));
    }

    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;

    if (!token) {
      logger.warn(`❌ No accessToken found in cookie. Socket ID: ${socket.id}`);
      return next(new Error("Authentication error: Token not found"));
    }

    const payload = verifyToken(token) as JwtPayload;
    (socket as any).user = payload;

    next();
  } catch (err) {
    logger.error(`❌ Token verification failed: ${(err as Error).message}`);
    next(new Error("Authentication error"));
  }
};

/**
 * Khởi tạo và cấu hình Socket.IO server với namespace và xác thực
 */
export const initializeSocketIO = (io: Server) => {
  logger.info("🔌 Initializing Socket.IO server...");

  // Gán instance để dùng toàn cục
  socketService.setIO(io);

  // Namespace điều khiển trận đấu
  const matchControlNamespace = io.of("/match-control");

  // ⚠️ Gắn middleware auth vào namespace
  // matchControlNamespace.use(authMiddleware);

  matchControlNamespace.on("connection", (socket: Socket) => {
    // const user = (socket as any).user as JwtPayload;

    // logger.info(
    //   `✅ Connected to /match-control: ${socket.id} | User: ${user.username} (${user.userId})`
    // );

    // Đăng ký các sự kiện riêng cho namespace này
    registerMatchControlEvents(io, socket);
    registerTestEvents(io, socket);

    socket.on("disconnect", reason => {
      logger.info(
        `❌ Disconnected from /match-control: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  logger.info("✅ Socket.IO server initialized.");
};
