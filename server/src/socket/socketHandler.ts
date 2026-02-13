import { Server, Socket } from 'socket.io';
import Canvas from '../models/Canvas.model';
import Room from '../models/Room.model';
import {
    CanvasElement,
    CanvasState,
    SyncMessage,
    UserPresence,
    RoomState
} from '../types/sync.types';
import {
    reconcileState,
    getChangedElements,
    getDeletedElementIds,
    createSnapshot,
    elementsToMap,
    generateNonce
} from '../utils/stateReconciliation';

// In-memory state for active rooms
const roomStates = new Map<string, RoomState>();

// Shadow copies for incremental broadcasting (Strategy 7)
const shadowStates = new Map<string, Map<string, CanvasElement>>();

// Lazy checkpointing timers (Strategy 4)
const checkpointTimers = new Map<string, NodeJS.Timeout>();
const CHECKPOINT_INTERVAL = 20000; // 20 seconds

/**
 * Strategy 4: Smart Persistence (Lazy Checkpointing)
 * Persist state to database approximately every 20 seconds
 */
function scheduleCheckpoint(roomId: string) {
    // Clear existing timer
    if (checkpointTimers.has(roomId)) {
        clearTimeout(checkpointTimers.get(roomId)!);
    }

    // Schedule new checkpoint
    const timer = setTimeout(async () => {
        await saveCheckpoint(roomId);
    }, CHECKPOINT_INTERVAL);

    checkpointTimers.set(roomId, timer);
}

/**
 * Save current room state to database
 */
async function saveCheckpoint(roomId: string): Promise<void> {
    const roomState = roomStates.get(roomId);
    if (!roomState) return;

    try {
        const elements = createSnapshot(roomState.canvasState);

        await Canvas.findOneAndUpdate(
            { roomId },
            {
                elements: elements.map(e => ({
                    id: e.id,
                    type: e.type,
                    properties: e.properties,
                    version: e.version,
                    nonce: e.nonce,
                    lastModified: new Date(e.lastModified)
                })),
                sceneVersion: roomState.canvasState.sceneVersion,
                lastCheckpoint: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`✓ Checkpoint saved for room ${roomId}`);
    } catch (error) {
        console.error(`✗ Failed to save checkpoint for room ${roomId}:`, error);
    }
}

/**
 * Strategy 3: Multi-Layered Late Joiner Support
 * Load state from database (Layer 1: Persistent Database)
 */
async function loadStateFromDatabase(roomId: string): Promise<CanvasElement[]> {
    try {
        const canvas = await Canvas.findOne({ roomId });
        if (!canvas || !canvas.elements) return [];

        return canvas.elements.map(e => ({
            id: e.id,
            type: e.type,
            properties: e.properties,
            version: e.version,
            nonce: e.nonce,
            lastModified: new Date(e.lastModified).getTime()
        }));
    } catch (error) {
        console.error('Failed to load from database:', error);
        return [];
    }
}

/**
 * Initialize or get room state
 */
function getRoomState(roomId: string): RoomState {
    if (!roomStates.has(roomId)) {
        roomStates.set(roomId, {
            roomId,
            canvasState: {
                elements: new Map(),
                sceneVersion: 0
            },
            users: new Map(),
            lastBroadcast: Date.now()
        });
        shadowStates.set(roomId, new Map());
    }
    return roomStates.get(roomId)!;
}

/**
 * Strategy 7: Incremental Broadcasting
 * Broadcast only changed elements to reduce bandwidth
 */
function broadcastIncrementalUpdate(io: Server, roomId: string) {
    const roomState = getRoomState(roomId);
    const shadow = shadowStates.get(roomId)!;

    const changedElements = getChangedElements(roomState.canvasState.elements, shadow);
    const deletedIds = getDeletedElementIds(roomState.canvasState.elements, shadow);

    if (changedElements.length > 0) {
        io.to(roomId).emit('state-update', {
            type: 'partial-sync',
            elements: changedElements,
            timestamp: Date.now()
        } as SyncMessage);

        // Update shadow
        changedElements.forEach(e => shadow.set(e.id, e));
    }

    if (deletedIds.length > 0) {
        io.to(roomId).emit('state-update', {
            type: 'element-delete',
            elementIds: deletedIds,
            timestamp: Date.now()
        } as SyncMessage);

        // Update shadow
        deletedIds.forEach(id => shadow.delete(id));
    }

    roomState.lastBroadcast = Date.now();
}

export const setupSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('✓ User connected:', socket.id);

        /**
         * Strategy 3: Multi-Layered Late Joiner Support
         * Handle user joining a room
         */
        socket.on('join-room', async ({ roomId, userName, userColor }: {
            roomId: string;
            userName?: string;
            userColor?: string;
        }) => {
            socket.join(roomId);
            console.log(`✓ User ${socket.id} joined room ${roomId}`);

            // Initialize room state
            const roomState = getRoomState(roomId);

            // Layer 1: Load from database if room state is empty
            if (roomState.canvasState.elements.size === 0) {
                const dbElements = await loadStateFromDatabase(roomId);
                if (dbElements.length > 0) {
                    roomState.canvasState.elements = elementsToMap(dbElements);
                    roomState.canvasState.sceneVersion = Math.max(...dbElements.map(e => e.version), 0);
                    console.log(`✓ Loaded ${dbElements.length} elements from database`);
                }
            }

            // Add user presence (Strategy 5: Minimal User Tracking)
            const userPresence: UserPresence = {
                socketId: socket.id,
                userName: userName || `User-${socket.id.substring(0, 4)}`,
                userColor: userColor || generateRandomColor(),
                lastUpdate: Date.now()
            };
            roomState.users.set(socket.id, userPresence);

            // Update database with active user
            await Room.findOneAndUpdate(
                { roomId },
                {
                    $addToSet: {
                        activeUsers: {
                            socketId: socket.id,
                            userName: userPresence.userName,
                            userColor: userPresence.userColor,
                            joinedAt: new Date(),
                            lastSeen: new Date()
                        }
                    }
                },
                { upsert: false }
            );

            // Layer 2: Request state from peers
            socket.to(roomId).emit('request-state-broadcast', { requesterId: socket.id });

            // Send current state to the new joiner
            const currentSnapshot = createSnapshot(roomState.canvasState);
            socket.emit('full-state', {
                type: 'full-sync',
                elements: currentSnapshot,
                users: Array.from(roomState.users.values()),
                timestamp: Date.now()
            });

            // Notify others about new user
            socket.to(roomId).emit('user-joined', userPresence);
        });

        /**
         * Strategy 2: State-Based Synchronization
         * Handle state updates from clients
         */
        socket.on('state-update', (message: SyncMessage) => {
            const { roomId, elements } = message;
            if (!elements) return;

            const roomState = getRoomState(roomId);

            // Reconcile incoming state with current state
            const { mergedState, changedIds } = reconcileState(
                roomState.canvasState,
                elements
            );

            roomState.canvasState = mergedState;

            // Broadcast changes to other clients (excluding sender)
            if (changedIds.length > 0) {
                const changedElements = changedIds
                    .map(id => mergedState.elements.get(id))
                    .filter(e => e !== undefined) as CanvasElement[];

                socket.to(roomId).emit('state-update', {
                    type: 'partial-sync',
                    elements: changedElements,
                    timestamp: Date.now()
                } as SyncMessage);

                // Update shadow for incremental broadcasting
                const shadow = shadowStates.get(roomId)!;
                changedElements.forEach(e => shadow.set(e.id, e));
            }

            // Schedule checkpoint
            scheduleCheckpoint(roomId);
        });

        /**
         * Handle element deletion
         */
        socket.on('delete-elements', ({ roomId, elementIds }: {
            roomId: string;
            elementIds: string[];
        }) => {
            const roomState = getRoomState(roomId);

            elementIds.forEach(id => roomState.canvasState.elements.delete(id));

            // Broadcast deletion
            socket.to(roomId).emit('state-update', {
                type: 'element-delete',
                elementIds,
                timestamp: Date.now()
            } as SyncMessage);

            // Update shadow
            const shadow = shadowStates.get(roomId)!;
            elementIds.forEach(id => shadow.delete(id));

            // Schedule checkpoint
            scheduleCheckpoint(roomId);
        });

        /**
         * Layer 2: Peer Broadcasting
         * Respond to state broadcast requests from late joiners
         */
        socket.on('broadcast-my-state', ({ roomId, requesterId }: {
            roomId: string;
            requesterId: string;
        }) => {
            const roomState = getRoomState(roomId);
            const snapshot = createSnapshot(roomState.canvasState);

            // Send state directly to requester
            io.to(requesterId).emit('peer-state', {
                type: 'full-sync',
                elements: snapshot,
                senderId: socket.id,
                timestamp: Date.now()
            });
        });

        /**
         * Clear entire canvas
         */
        socket.on('clear-canvas', (roomId: string) => {
            const roomState = getRoomState(roomId);
            roomState.canvasState.elements.clear();
            roomState.canvasState.sceneVersion++;

            io.to(roomId).emit('clear-canvas');

            // Clear shadow
            shadowStates.get(roomId)?.clear();

            // Schedule checkpoint
            scheduleCheckpoint(roomId);
        });

        /**
         * Strategy 5: Minimal User Tracking - Update user presence
         */
        socket.on('update-presence', ({ roomId, cursor, activeElement }: {
            roomId: string;
            cursor?: { x: number; y: number };
            activeElement?: string;
        }) => {
            const roomState = getRoomState(roomId);
            const user = roomState.users.get(socket.id);

            if (user) {
                user.cursor = cursor;
                user.activeElement = activeElement;
                user.lastUpdate = Date.now();

                // Broadcast presence update (will be optimized in Strategy 8)
                socket.to(roomId).emit('presence-update', {
                    socketId: socket.id,
                    cursor,
                    activeElement,
                    timestamp: Date.now()
                });
            }
        });

        /**
         * Handle disconnection
         */
        socket.on('disconnect', async () => {
            console.log('✗ User disconnected:', socket.id);

            // Remove user from all rooms
            for (const [roomId, roomState] of roomStates.entries()) {
                if (roomState.users.has(socket.id)) {
                    roomState.users.delete(socket.id);

                    // Update database
                    await Room.findOneAndUpdate(
                        { roomId },
                        { $pull: { activeUsers: { socketId: socket.id } } }
                    );

                    // Notify others
                    socket.to(roomId).emit('user-left', { socketId: socket.id });

                    // Clean up room if empty
                    if (roomState.users.size === 0) {
                        // Save final checkpoint
                        await saveCheckpoint(roomId);

                        // Clean up
                        roomStates.delete(roomId);
                        shadowStates.delete(roomId);
                        if (checkpointTimers.has(roomId)) {
                            clearTimeout(checkpointTimers.get(roomId)!);
                            checkpointTimers.delete(roomId);
                        }
                        console.log(`✓ Room ${roomId} cleaned up`);
                    }
                }
            }
        });
    });

    // Periodic full resynchronization (Strategy 7)
    setInterval(() => {
        for (const [roomId, roomState] of roomStates.entries()) {
            // Every 60 seconds, clear shadow and force full resync
            if (Date.now() - roomState.lastBroadcast > 60000) {
                shadowStates.get(roomId)?.clear();
                roomState.lastBroadcast = Date.now();
            }
        }
    }, 60000);
};

/**
 * Utility: Generate random color for user
 */
function generateRandomColor(): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
