import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerStudentEvents } from "../events/student.events";
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
  contestantId?: number;
  matchId?: number;
}

// Extract user từ socket cookie và lấy thông tin contestant
const extractUserAndContestantFromSocket = async (socket: Socket): Promise<{ user: JwtPayload; contestantId?: number } | null> => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    console.log('🍪 [BE NAMESPACE] Cookie nhận được:', rawCookie);
    
    if (!rawCookie) {
      console.log('❌ [BE NAMESPACE] Không có cookie');
      return null;
    }

    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;
    
    if (!token) {
      console.log('❌ [BE NAMESPACE] Không có accessToken trong cookie');
      return null;
    }

    console.log('🔑 [BE NAMESPACE] AccessToken nhận được:', token.substring(0, 50) + '...');

    const payload = verifyToken(token) as JwtPayload;
    
    if (!payload) {
      console.log('❌ [BE NAMESPACE] Token không hợp lệ');
      return null;
    }

    console.log('✅ [BE NAMESPACE] Token hợp lệ cho user:', payload.username, 'userId:', payload.userId);

    // Nếu là Student, tìm contestant
    if (payload.role === "Student") {
      console.log('🔍 [BE NAMESPACE] Tìm contestant cho Student userId:', payload.userId);
      
      const contestant = await prisma.contestant.findFirst({
        where: {
          student: {
            userId: payload.userId
          }
        },
        include: {
          student: {
            select: { id: true, fullName: true, studentCode: true }
          }
        }
      });

      if (contestant) {
        console.log('✅ [BE NAMESPACE] Đã tìm thấy contestant:', contestant.id, 'cho student:', contestant.student.fullName);
        return { user: payload, contestantId: contestant.id };
      } else {
        console.log('❌ [BE NAMESPACE] Không tìm thấy contestant cho userId:', payload.userId);
        return { user: payload }; // Vẫn trả về user nhưng không có contestantId
      }
    }

    return { user: payload };
  } catch (error) {
    console.error("❌ [BE NAMESPACE] Error extracting user from socket:", error);
    logger.error("Error extracting user from socket:", error);
    return null;
  }
};

// Register student namespace events
export const registerStudentNamespaceEvents = async (io: Server, socket: Socket) => {
  console.log('🔌 [BE NAMESPACE] Bắt đầu xử lý kết nối socket mới:', socket.id);
  console.log('🔍 [BE NAMESPACE] Socket headers:', socket.handshake.headers);
  console.log('🔌 [BE NAMESPACE] Xử lý kết nối mới socket:', socket.id);
  
  const userInfo = await extractUserAndContestantFromSocket(socket);
  
  if (!userInfo) {
    console.log('❌ [BE NAMESPACE] Không thể xác thực socket, đóng kết nối:', socket.id);
    logger.warn(`❌ Cannot authenticate socket: ${socket.id}`);
    socket.disconnect();
    return;
  }

  const { user, contestantId } = userInfo;
  
  console.log('🎯 [BE NAMESPACE] Thông tin user đã xác thực:', {
    userId: user.userId,
    username: user.username,
    role: user.role,
    contestantId: contestantId || 'KHÔNG CÓ'
  });
  
  // Chỉ cho phép user có role Student
  if (user.role !== "Student") {
    console.log('🚫 [BE NAMESPACE] User không phải Student cố gắng kết nối:', {
      socketId: socket.id,
      role: user.role,
      username: user.username
    });
    logger.warn(`❌ Non-student user attempted to connect to student namespace: ${socket.id}`);
    socket.disconnect();
    return;
  }

  // Gán user và contestant vào socket
  (socket as AuthenticatedSocket).user = user;
  (socket as AuthenticatedSocket).contestantId = contestantId;
  
  console.log('🎉 [BE NAMESPACE] Student kết nối thành công vào namespace:', {
    socketId: socket.id,
    username: user.username,
    userId: user.userId,
    contestantId: contestantId,
    timestamp: new Date().toISOString()
  });
  
  logger.info(`✅ Student connected to namespace: ${user.username} (${socket.id}) | ContestantId: ${contestantId || 'none'}`);

  console.log('📋 [BE NAMESPACE] Đang đăng ký events cho student...');
  // Register all student events from student.events.ts
  const studentNamespace = io.of("/student");
  registerStudentEvents(studentNamespace, socket as AuthenticatedSocket);
  console.log('✅ [BE NAMESPACE] Đã đăng ký xong các student events');

  // Join match for answering nhận các event từ admin ( start, pause, nextQuestion, endMatch)
  socket.on("student:joinMatch", (data: { matchSlug: string }, callback?: (response: any) => void) => {
    try {
      console.log('📝 [BE NAMESPACE] Nhận event student:joinMatch:', {
        data: data,
        socketId: socket.id,
        username: user.username,
        contestantId: contestantId
      });
      
      const { matchSlug } = data;
      
      // 🔥 FIX: Sử dụng slug trực tiếp làm room name để đồng bộ với admin
      const mainRoomName = `match-${matchSlug}`;
      socket.join(mainRoomName);
      console.log(`🏠 [BE NAMESPACE] Student ${user.username} tham gia phòng chính: ${mainRoomName}`);
      
      // Log debug để xem room size
      const room = studentNamespace.adapter.rooms.get(mainRoomName);
      const roomSize = room ? room.size : 0;
      const memberSocketIds = room ? Array.from(room) : [];
      
      console.log(`🔍 [BE NAMESPACE] Debug room info:`, {
        roomName: mainRoomName,
        roomSize: roomSize,
        memberSocketIds: memberSocketIds,
        newJoinerSocketId: socket.id,
        newJoinerUsername: user.username
      });
      
      // Tham gia phòng trả lời riêng cho việc submit answers
      const answerRoomName = `match-${matchSlug}-answers`;
      socket.join(answerRoomName);
      console.log(`🏠 [BE NAMESPACE] Student ${user.username} tham gia phòng trả lời: ${answerRoomName}`);
      
      console.log('✅ [BE NAMESPACE] Student đã tham gia cả hai phòng thành công:', {
        mainRoom: mainRoomName,
        answerRoom: answerRoomName,
        matchSlug: matchSlug,
        studentName: user.username
      });
      logger.info(`📝 Student ${user.username} joined rooms: ${mainRoomName} & ${answerRoomName}`);
      
      if (callback) {
        const response = {
          success: true,
          message: `Joined match room ${mainRoomName}`,
          roomName: mainRoomName,
          matchSlug
        };
        console.log('📤 [BE NAMESPACE] Gửi callback response:', response);
        callback(response);
      }
    } catch (error) {
      console.error('💥 [BE NAMESPACE] Lỗi khi tham gia rooms:', {
        error: error,
        socketId: socket.id,
        username: user.username,
        matchSlug: data?.matchSlug
      });
      logger.error(`Error joining rooms:`, error);
      if (callback) {
        callback({
          success: false,
          message: "Failed to join match rooms"
        });
      }
    }
  });

  console.log('👂 [BE NAMESPACE] Đã đăng ký listener cho disconnect event');
  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log('🔌 [BE NAMESPACE] Student ngắt kết nối:', {
      socketId: socket.id,
      username: user.username,
      reason: reason,
      contestantId: contestantId,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`🔌 Student ${user.username} disconnected from namespace: ${reason}`);
    
    // Notify admin about student disconnect if they were in a match
    const matchId = (socket as AuthenticatedSocket).matchId;
    if (matchId) {
      console.log(`📢 [BE NAMESPACE] Thông báo admin về student disconnect từ match ${matchId}`);
      socket.to(`match-${matchId}`).emit("student:disconnected", {
        studentId: user.userId,
        studentName: user.username,
        contestantId: contestantId,
        matchId: matchId,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 🔥 NEW: Handle leave match room với matchSlug
  socket.on("leaveMatchRoom", (matchSlug: string) => {
    try {
      console.log('🚪 [BE NAMESPACE] Student rời match room:', {
        matchSlug: matchSlug,
        socketId: socket.id,
        username: user.username,
        contestantId: contestantId
      });
      
      const mainRoomName = `match-${matchSlug}`;
      const answerRoomName = `match-${matchSlug}-answers`;
      
      socket.leave(mainRoomName);
      socket.leave(answerRoomName);
      
      console.log('✅ [BE NAMESPACE] Student đã rời khỏi cả hai phòng:', {
        mainRoom: mainRoomName,
        answerRoom: answerRoomName,
        matchSlug: matchSlug,
        studentName: user.username
      });
      
      logger.info(`🚪 Student ${user.username} left rooms: ${mainRoomName} & ${answerRoomName}`);
    } catch (error) {
      console.error('💥 [BE NAMESPACE] Lỗi khi rời khỏi rooms:', {
        error: error,
        socketId: socket.id,
        username: user.username,
        matchSlug: matchSlug
      });
      logger.error(`Error leaving rooms:`, error);
    }
  });
  
  console.log('🎯 [BE NAMESPACE] Hoàn thành đăng ký tất cả events cho student:', user.username);
}; 