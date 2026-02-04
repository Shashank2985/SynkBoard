import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io('http://localhost:5000', {
            transports: ['websocket'],
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        // socket = null; // Can't easily nullify typical singleton let in all module systems but this works for simple usage
    }
}
