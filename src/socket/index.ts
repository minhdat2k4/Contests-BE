// src/socket/index.ts
import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerMatchControlEvents } from "./namespaces/matchControl.namespace";
import { ExtendedError } from "socket.io/dist/namespace";
import { socketService } from "./SocketService";

/**
 * Middleware để xác thực kết nối Socket.IO bằng JWT token.
 * Token được gửi từ client qua `socket.handshake.auth`.
 */
const authMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        logger.warn(`Socket connection rejected. Reason: No token provided. Socket ID: ${socket.id}`);
        return next(new Error("Authentication error: Token not provided"));
    }

    try {
        const payload = verifyToken(token) as JwtPayload;
        // Gắn thông tin user đã được xác thực vào đối tượng socket để sử dụng sau này.
        (socket as any).user = payload;
        next();
    } catch (error) {
        logger.error(`Socket authentication error: Invalid token. Socket ID: ${socket.id}`, error);
        next(new Error("Authentication error: Invalid token"));
    }
};

/**
 * Khởi tạo và cấu hình server Socket.IO.
 * @param io - Instance của Socket.IO Server.
 */
export const initializeSocketIO = (io: Server) => {
    logger.info("🔌 Initializing Socket.IO server...");

    // Gán instance `io` vào SocketService để có thể truy cập từ các module khác
    socketService.setIO(io);

    // Áp dụng middleware xác thực cho tất cả các kết nối đến
    io.use(authMiddleware);

    // --- Định nghĩa các Namespaces ---

    // Namespace cho việc điều khiển và hiển thị trong trận đấu
    const matchControlNamespace = io.of("/match-control");

    matchControlNamespace.on("connection", (socket: Socket) => {
        const user = (socket as any).user as JwtPayload;
        logger.info(`Client connected to /match-control: ${socket.id} | User: ${user.username} (ID: ${user.userId})`);

        // Đăng ký các sự kiện cho namespace này
        registerMatchControlEvents(io, socket);

        socket.on("disconnect", (reason) => {
            logger.info(`Client disconnected from /match-control: ${socket.id}. Reason: ${reason}`);
        });
    });

    // Ví dụ: Thêm một namespace khác cho quản trị viên
    // const adminNamespace = io.of("/admin");
    // adminNamespace.on("connection", (socket) => {
    //   if ((socket as any).user.role !== 'Admin') {
    //     logger.warn(`Non-admin user ${socket.id} tried to connect to /admin. Disconnecting.`);
    //     socket.disconnect();
    //     return;
    //   }
    //   logger.info(`Admin client connected: ${socket.id}`);
    //   // Register admin events...
    // });

    logger.info("✅ Socket.IO server initialized successfully.");
};
