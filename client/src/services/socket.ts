import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Global connection handlers
        socket.on('connect', () => {
            console.log('✓ Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('✗ Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('✗ Socket connection error:', error);
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
    }
};

/**
 * Strategy 8: Cursor & Presence Optimization
 * Throttled cursor position updates
 */
let cursorUpdateTimer: NodeJS.Timeout | null = null;
const CURSOR_UPDATE_THROTTLE = 50; // 50ms = 20 updates per second

export const updateCursorPosition = (
    roomId: string,
    cursor: { x: number; y: number }
) => {
    if (cursorUpdateTimer) return; // Throttle
    
    cursorUpdateTimer = setTimeout(() => {
        const sock = getSocket();
        sock.emit('update-presence', { roomId, cursor });
        cursorUpdateTimer = null;
    }, CURSOR_UPDATE_THROTTLE);
};

/**
 * Update active element being edited
 */
export const updateActiveElement = (
    roomId: string,
    activeElement: string | undefined
) => {
    const sock = getSocket();
    sock.emit('update-presence', { roomId, activeElement });
};
