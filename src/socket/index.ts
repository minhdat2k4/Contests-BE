import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerMatchControlEvents } from "./namespaces/matchControl.namespace";
import { ExtendedError } from "socket.io/dist/namespace";
import { socketService } from "./SocketService";
import cookie from "cookie";
import { registerTestEvents } from "./events/test.events";
import { registerStudentEvents } from "./events/student.events";
import { registerMatchEvents } from "./events/match.events";
import { registerAudienceEvents } from "./events/audience.events";
import { timerService } from "./services/timer.service";
import { prisma } from "@/config/database";

// Extend Socket interface to include user and contestant info
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
  contestantId?: number;
  matchId?: number;
}

/**
 * Middleware xác thực kết nối Socket.IO bằng JWT trong cookie httpOnly
 */
export const authMiddleware = async (
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
    
    // Validate user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      logger.warn(`❌ User not found or inactive: ${payload.userId}`);
      return next(new Error("Authentication error: User not found or inactive"));
    }

    // For Student role, validate contestant exists
    if (payload.role === "Student") {
      const contestant = await prisma.contestant.findFirst({
        where: {
          student: {
            id: payload.userId
          }
        },
        include: {
          contest: {
            include: {
              round: {
                include: {
                  matches: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!contestant) {
        logger.warn(`❌ Contestant not found for student: ${payload.userId}`);
        return next(new Error("Authentication error: Contestant not found"));
      }

      // Attach contestant info to socket
      (socket as AuthenticatedSocket).contestantId = contestant.id;
      
      // Find active match for this contestant
      const activeMatch = await prisma.match.findFirst({
        where: {
          round: {
            contestId: contestant.contestId
          },
          // Add more conditions here based on your match logic
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeMatch) {
        (socket as AuthenticatedSocket).matchId = activeMatch.id;
      }

      logger.info(
        `✅ Student authenticated: ${socket.id} | Contestant: ${contestant.id} | Match: ${activeMatch?.id || 'none'}`
      );
    }

    (socket as AuthenticatedSocket).user = payload;
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
  
  // Initialize timer service
  timerService.setIO(io);

  // Namespace điều khiển trận đấu (dành cho Admin/Judge)
  const matchControlNamespace = io.of("/match-control");

  // Enable authentication middleware
  matchControlNamespace.use(authMiddleware);

  matchControlNamespace.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.user;

    logger.info(
      `✅ Connected to /match-control: ${socket.id} | User: ${user.username} (${user.userId}) | Role: ${user.role}`
    );

    // Đăng ký các sự kiện riêng cho namespace này
    registerMatchControlEvents(io, authSocket);
    registerTestEvents(io, authSocket);
    
    // Register match control events
    registerMatchEvents(io, authSocket);
    
    // Register audience control events
    registerAudienceEvents(io, authSocket);

    socket.on("disconnect", reason => {
      logger.info(
        `❌ Disconnected from /match-control: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  // Initialize /student namespace
  const studentNamespace = io.of("/student");
  studentNamespace.use(authMiddleware);
  
  studentNamespace.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.user;

    console.log(
      `✅ [STUDENT] Client connected: ${socket.id} | User: ${user.username} (${user.role})`
    );

    // Only allow students to connect
    if (user.role !== "Student") {
      console.log(`❌ [STUDENT] Access denied for role: ${user.role}`);
      socket.disconnect();
      return;
    }

    // Student room management
    socket.on("joinMatchRoom", (matchId: number, callback?: (response: any) => void) => {
      try {
        console.log(`🏠 [STUDENT] Socket ${socket.id} wants to join matchId: ${matchId}`);
        
        const roomName = `match-${matchId}`;
        socket.join(roomName);
        
        console.log(`✅ [STUDENT] Socket ${socket.id} joined room: ${roomName}`);
        logger.info(`[STUDENT] Socket ${socket.id} joined room: ${roomName}`);

        // Check room size
        const roomSize = studentNamespace.adapter.rooms.get(roomName)?.size || 0;
        console.log(`📊 [STUDENT] Room ${roomName} now has ${roomSize} students`);

        // Send acknowledgement
        if (callback) {
          const response = {
            success: true,
            message: `Successfully joined room ${roomName}`,
            roomSize: roomSize
          };
          console.log(`📨 [STUDENT] Sending response:`, response);
          callback(response);
        }
      } catch (error) {
        console.error(`❌ [STUDENT] Error joining room for match ${matchId}:`, error);
        logger.error(`[STUDENT] Error joining room for match ${matchId}`, error);
        if (callback) {
          callback({ success: false, message: "Failed to join room." });
        }
      }
    });

    socket.on("leaveMatchRoom", (matchId: number) => {
      const roomName = `match-${matchId}`;
      socket.leave(roomName);
      console.log(`🚪 [STUDENT] Socket ${socket.id} left room: ${roomName}`);
      logger.info(`[STUDENT] Socket ${socket.id} left room: ${roomName}`);
    });

    // Register student-specific events
    registerStudentEvents(studentNamespace, authSocket);

    socket.on("disconnect", (reason) => {
      console.log(
        `❌ [STUDENT] Client disconnected: ${socket.id} | Reason: ${reason}`
      );
    });
  });

  logger.info("✅ Socket.IO server initialized with /match-control and /student namespaces.");
};
