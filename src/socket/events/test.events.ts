// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";

export type test = {
  matchId: number;
  role: string;
};

export const registerTestEvents = (io: Server, socket: Socket) => {
  socket.on("test", (data: test) => {
    const { matchId, role } = data;
    const roomName = `match-${matchId}`;
    console.log("nhansdnđ");
    io.to(roomName).emit("tes_on", { role });
  });
};
