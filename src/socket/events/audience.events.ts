import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

export const registerAudienceEvents = (io: Server, socket: Socket) => {
  // Event để hiển thị QR Code trên màn hình chiếu
  socket.on("audience:showQR", async (data, callback) => {
    const { match, rescueId, matchSlug } = data;
    
    try {
      // Verify match exists
      const matchRaw = await MatchService.MatchControl(match || matchSlug);
      if (!matchRaw) {
        const errorResponse = { success: false, message: "Không tìm thấy trận đấu" };
        if (callback) callback(errorResponse);
        return;
      }

      const roomName = `match-${match || matchSlug}`;

      // Emit to all clients in the match room to show QR
      io.of("/match-control").to(roomName).emit("audience:showQR", {
        rescueId,
        matchSlug: matchSlug || match,
      });

      const successResponse = {
        success: true,
        message: "Hiển thị QR Code thành công",
      };
      if (callback) callback(successResponse);
    } catch (error) {
      console.error("Error in audience:showQR:", error);
      const errorResponse = {
        success: false,
        message: "Lỗi khi hiển thị QR Code",
      };
      if (callback) callback(errorResponse);
    }
  });

  // Event để hiển thị Chart trên màn hình chiếu
  socket.on("audience:showChart", async (data, callback) => {
    const { match, rescueId, matchSlug } = data;
    
    try {
      // Verify match exists
      const matchRaw = await MatchService.MatchControl(match || matchSlug);
      if (!matchRaw) {
        const errorResponse = { success: false, message: "Không tìm thấy trận đấu" };
        if (callback) callback(errorResponse);
        return;
      }

      const roomName = `match-${match || matchSlug}`;

      // Emit to all clients in the match room to show Chart
      io.of("/match-control").to(roomName).emit("audience:showChart", {
        rescueId,
      });

      const successResponse = {
        success: true,
        message: "Hiển thị thống kê thành công",
      };
      if (callback) callback(successResponse);
    } catch (error) {
      console.error("Error in audience:showChart:", error);
      const errorResponse = {
        success: false,
        message: "Lỗi khi hiển thị thống kê",
      };
      if (callback) callback(errorResponse);
    }
  });

  // Event để ẩn audience display
  socket.on("audience:hide", async (data, callback) => {
    const { match, matchSlug } = data || {};
    
    try {
      // If no match provided, still emit to hide
      let roomName;
      if (match || matchSlug) {
        const matchRaw = await MatchService.MatchControl(match || matchSlug);
        if (!matchRaw) {
          const errorResponse = { success: false, message: "Không tìm thấy trận đấu" };
          if (callback) callback(errorResponse);
          return;
        }
        roomName = `match-${match || matchSlug}`;
      } else {
        // If no specific match, broadcast to all rooms (optional behavior)
        roomName = socket.rooms.values().next().value;
      }

      if (roomName) {
        // Emit to all clients in the match room to hide audience display
        io.of("/match-control").to(roomName).emit("audience:hide");
      } else {
        // Fallback: emit to all connected clients
        io.of("/match-control").emit("audience:hide");
      }

      const successResponse = {
        success: true,
        message: "Ẩn audience display thành công",
      };
      if (callback) callback(successResponse);
    } catch (error) {
      console.error("Error in audience:hide:", error);
      const errorResponse = {
        success: false,
        message: "Lỗi khi ẩn audience display",
      };
      if (callback) callback(errorResponse);
    }
  });

  // Event để refresh chart data (optional)
  socket.on("audience:refreshChart", async (data, callback) => {
    const { match, rescueId, matchSlug } = data;
    
    try {
      // Verify match exists
      const matchRaw = await MatchService.MatchControl(match || matchSlug);
      if (!matchRaw) {
        const errorResponse = { success: false, message: "Không tìm thấy trận đấu" };
        if (callback) callback(errorResponse);
        return;
      }

      const roomName = `match-${match || matchSlug}`;

      // Emit to all clients in the match room to refresh chart
      io.of("/match-control").to(roomName).emit("audience:refreshChart", {
        rescueId,
      });

      const successResponse = {
        success: true,
        message: "Refresh chart thành công",
      };
      if (callback) callback(successResponse);
    } catch (error) {
      console.error("Error in audience:refreshChart:", error);
      const errorResponse = {
        success: false,
        message: "Lỗi khi refresh chart",
      };
      if (callback) callback(errorResponse);
    }
  });
}; 