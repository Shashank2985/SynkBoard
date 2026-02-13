// Types for state-based synchronization

export interface CanvasElement {
    id: string;
    type: string;
    properties: any;
    version: number;
    nonce: number;
    lastModified: number;
}

export interface CanvasState {
    elements: Map<string, CanvasElement>;
    sceneVersion: number;
}

export interface SyncMessage {
    type: 'full-sync' | 'partial-sync' | 'element-update' | 'element-delete';
    roomId: string;
    elements?: CanvasElement[];
    elementIds?: string[];
    timestamp: number;
}

export interface UserPresence {
    socketId: string;
    userName?: string;
    userColor?: string;
    cursor?: { x: number; y: number };
    activeElement?: string;
    lastUpdate: number;
}

export interface RoomState {
    roomId: string;
    canvasState: CanvasState;
    users: Map<string, UserPresence>;
    lastBroadcast: number;
}
