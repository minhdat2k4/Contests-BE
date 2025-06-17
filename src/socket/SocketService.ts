// src/socket/SocketService.ts
import { Server } from "socket.io";
import { logger } from "@/utils/logger";

class SocketService {
    private static instance: SocketService;
    private _io: Server | null = null;

    private constructor() {}

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public setIO(io: Server): void {
        if (this._io) {
            logger.warn("Socket.IO server instance is already set.");
            return;
        }
        this._io = io;
    }

    public getIO(): Server {
        if (!this._io) {
            throw new Error("Socket.IO server has not been initialized. Call setIO() first.");
        }
        return this._io;
    }

    /**
     * Gửi sự kiện đến một room cụ thể.
     * @param room - Tên của room.
     * @param event - Tên của sự kiện.
     * @param data - Dữ liệu cần gửi.
     */
    public emitToRoom(room: string, event: string, data: any): void {
        logger.info(`Emitting event '${event}' to room '${room}'`, { data });
        this.getIO().to(room).emit(event, data);
    }
}

export const socketService = SocketService.getInstance();
