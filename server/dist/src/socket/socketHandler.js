"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('join-room', (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
            socket.to(roomId).emit('user-joined', { userId: socket.id });
        });
        socket.on('draw', ({ roomId, path }) => {
            // Broadcast to everyone ELSE in the room
            socket.to(roomId).emit('draw', path);
        });
        socket.on('clear-canvas', (roomId) => {
            socket.to(roomId).emit('clear-canvas');
        });
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
exports.setupSocket = setupSocket;
