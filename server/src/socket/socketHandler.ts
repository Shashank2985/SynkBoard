import { Server, Socket } from 'socket.io';

export const setupSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
            socket.to(roomId).emit('user-joined', { userId: socket.id });
        });

        socket.on('draw', ({ roomId, path }: { roomId: string; path: any }) => {
            // Broadcast to everyone ELSE in the room
            socket.to(roomId).emit('draw', path);
        });

        socket.on('clear-canvas', (roomId: string) => {
            socket.to(roomId).emit('clear-canvas');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
