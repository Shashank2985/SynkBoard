'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, PencilBrush, util, Rect, Circle, Triangle, IText, FabricObject } from 'fabric';
import api from '@/services/api';
import { getSocket, updateCursorPosition, updateActiveElement } from '@/services/socket';
import { 
    CanvasElement, 
    CanvasState, 
    SyncMessage, 
    UserPresence,
    FullStateMessage 
} from '@/types/sync.types';
import {
    reconcileState,
    fabricObjectToElement,
    elementToFabricProperties,
    generateElementId,
    getChangedElements,
    getDeletedElementIds,
    generateNonce
} from '@/utils/stateReconciliation';

type CanvasTool = 'pen' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'text';

interface CanvasProps {
    roomId: string;
    tool: CanvasTool;
    color: string;
    lineWidth: number;
    onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const Canvas: React.FC<CanvasProps> = ({ roomId, tool, color, lineWidth, onSaveRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvas = useRef<FabricCanvas | null>(null);
    const socket = getSocket();
    
    // State-based synchronization
    const canvasState = useRef<CanvasState>({
        elements: new Map(),
        sceneVersion: 0
    });
    
    // Shadow copy for incremental broadcasting
    const shadowState = useRef<Map<string, CanvasElement>>(new Map());
    
    // Track actively edited elements
    const activeElements = useRef<Set<string>>(new Set());
    
    // Track other users
    const [users, setUsers] = useState<Map<string, UserPresence>>(new Map());
    
    // Flag to prevent event loops
    const isUpdatingFromSync = useRef(false);
    
    // Broadcast throttling
    const broadcastTimer = useRef<NodeJS.Timeout | null>(null);
    const BROADCAST_THROTTLE = 100; // 100ms

    /**
     * Initialize Fabric Canvas
     */
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new FabricCanvas(canvasRef.current, {
            width: window.innerWidth,
            height: window.innerHeight,
        });

        fabricCanvas.current = canvas;
        canvas.freeDrawingBrush = new PencilBrush(canvas);

        // Window Resize
        const handleResize = () => {
            canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            canvas.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    /**
     * Join room and setup socket listeners
     */
    useEffect(() => {
        if (!fabricCanvas.current) return;

        const userName = `User-${Math.random().toString(36).substring(7)}`;
        const userColor = generateRandomColor();

        // Join room with user info
        socket.emit('join-room', { roomId, userName, userColor });

        /**
         * Strategy 3: Multi-Layered Late Joiner Support
         * Layer 1 & 2: Receive full state from database or peers
         */
        socket.on('full-state', (message: FullStateMessage) => {
            console.log('✓ Received full state:', message.elements?.length, 'elements');
            
            if (message.elements && message.elements.length > 0) {
                applyFullState(message.elements);
            }
            
            if (message.users) {
                const userMap = new Map(message.users.map(u => [u.socketId, u]));
                setUsers(userMap);
            }
        });

        /**
         * Layer 2: Receive state from peers
         */
        socket.on('peer-state', (message: SyncMessage) => {
            console.log('✓ Received peer state from:', message.senderId);
            
            if (message.elements) {
                // Reconcile with existing state
                const { mergedState, changedIds } = reconcileState(
                    canvasState.current,
                    message.elements,
                    activeElements.current
                );
                
                if (changedIds.length > 0) {
                    canvasState.current = mergedState;
                    applyChangedElements(changedIds);
                }
            }
        });

        /**
         * Handle state updates from other clients
         */
        socket.on('state-update', (message: SyncMessage) => {
            if (message.type === 'partial-sync' && message.elements) {
                // Reconcile incoming elements
                const { mergedState, changedIds } = reconcileState(
                    canvasState.current,
                    message.elements,
                    activeElements.current
                );
                
                if (changedIds.length > 0) {
                    canvasState.current = mergedState;
                    applyChangedElements(changedIds);
                }
            } else if (message.type === 'element-delete' && message.elementIds) {
                handleRemoteDelete(message.elementIds);
            }
        });

        /**
         * Handle clear canvas
         */
        socket.on('clear-canvas', () => {
            isUpdatingFromSync.current = true;
            fabricCanvas.current?.clear();
            fabricCanvas.current!.backgroundColor = '#ffffff';
            canvasState.current.elements.clear();
            shadowState.current.clear();
            isUpdatingFromSync.current = false;
        });

        /**
         * User presence updates
         */
        socket.on('user-joined', (user: UserPresence) => {
            setUsers(prev => new Map(prev).set(user.socketId, user));
            console.log('✓ User joined:', user.userName);
        });

        socket.on('user-left', ({ socketId }: { socketId: string }) => {
            setUsers(prev => {
                const next = new Map(prev);
                next.delete(socketId);
                return next;
            });
        });

        socket.on('presence-update', (data: {
            socketId: string;
            cursor?: { x: number; y: number };
            activeElement?: string;
            timestamp: number;
        }) => {
            setUsers(prev => {
                const next = new Map(prev);
                const user = next.get(data.socketId);
                if (user) {
                    next.set(data.socketId, { ...user, ...data, lastUpdate: data.timestamp });
                }
                return next;
            });
        });

        /**
         * Layer 2: Respond to state broadcast requests
         */
        socket.on('request-state-broadcast', ({ requesterId }: { requesterId: string }) => {
            const elements = Array.from(canvasState.current.elements.values());
            socket.emit('broadcast-my-state', { roomId, requesterId });
        });

        return () => {
            socket.off('full-state');
            socket.off('peer-state');
            socket.off('state-update');
            socket.off('clear-canvas');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('presence-update');
            socket.off('request-state-broadcast');
        };
    }, [roomId]);

    /**
     * Apply full state to canvas
     */
    const applyFullState = (elements: CanvasElement[]) => {
        if (!fabricCanvas.current) return;
        
        isUpdatingFromSync.current = true;
        const canvas = fabricCanvas.current;
        
        // Clear and rebuild
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        
        // Update state
        canvasState.current.elements = new Map(elements.map(e => [e.id, e]));
        
        // Add all elements to canvas
        elements.forEach(element => {
            const props = elementToFabricProperties(element);
            util.enlivenObjects([props]).then((enlivenedObjects: FabricObject[]) => {
                enlivenedObjects.forEach((obj) => {
                    (obj as any).id = element.id;
                    canvas.add(obj);
                });
                canvas.renderAll();
            });
        });
        
        // Update shadow
        shadowState.current = new Map(elements.map(e => [e.id, e]));
        
        isUpdatingFromSync.current = false;
    };

    /**
     * Apply changed elements to canvas
     */
    const applyChangedElements = (changedIds: string[]) => {
        if (!fabricCanvas.current) return;
        
        isUpdatingFromSync.current = true;
        const canvas = fabricCanvas.current;
        
        changedIds.forEach(id => {
            const element = canvasState.current.elements.get(id);
            if (!element) return;
            
            // Find existing object on canvas
            const existing = canvas.getObjects().find((obj: any) => obj.id === id);
            
            if (existing) {
                // Update existing object
                const props = elementToFabricProperties(element);
                existing.set(props);
                existing.setCoords();
            } else {
                // Add new object
                const props = elementToFabricProperties(element);
                util.enlivenObjects([props]).then((enlivenedObjects: FabricObject[]) => {
                    enlivenedObjects.forEach((obj) => {
                        (obj as any).id = id;
                        canvas.add(obj);
                    });
                    canvas.renderAll();
                });
            }
        });
        
        canvas.renderAll();
        isUpdatingFromSync.current = false;
    };

    /**
     * Handle remote element deletion
     */
    const handleRemoteDelete = (elementIds: string[]) => {
        if (!fabricCanvas.current) return;
        
        isUpdatingFromSync.current = true;
        const canvas = fabricCanvas.current;
        
        elementIds.forEach(id => {
            canvasState.current.elements.delete(id);
            shadowState.current.delete(id);
            
            const obj = canvas.getObjects().find((o: any) => o.id === id);
            if (obj) {
                canvas.remove(obj);
            }
        });
        
        canvas.renderAll();
        isUpdatingFromSync.current = false;
    };

    /**
     * Broadcast state changes to other clients
     */
    const broadcastStateUpdate = () => {
        if (broadcastTimer.current) return;
        
        broadcastTimer.current = setTimeout(() => {
            const changed = getChangedElements(
                canvasState.current.elements,
                shadowState.current
            );
            
            const deleted = getDeletedElementIds(
                canvasState.current.elements,
                shadowState.current
            );
            
            if (changed.length > 0) {
                socket.emit('state-update', {
                    type: 'partial-sync',
                    roomId,
                    elements: changed,
                    timestamp: Date.now()
                } as SyncMessage);
                
                // Update shadow
                changed.forEach(e => shadowState.current.set(e.id, e));
            }
            
            if (deleted.length > 0) {
                socket.emit('delete-elements', { roomId, elementIds: deleted });
                deleted.forEach(id => shadowState.current.delete(id));
            }
            
            broadcastTimer.current = null;
        }, BROADCAST_THROTTLE);
    };

    /**
     * Fabric event listeners for state tracking
     */
    useEffect(() => {
        if (!fabricCanvas.current) return;
        const canvas = fabricCanvas.current;

        const handleObjectAdded = (e: any) => {
            if (isUpdatingFromSync.current) return;
            
            const obj = e.target;
            if (!obj) return;
            
            // Assign ID if not exists
            if (!(obj as any).id) {
                (obj as any).id = generateElementId();
            }
            
            // Create versioned element
            const element = fabricObjectToElement(obj);
            canvasState.current.elements.set(element.id, element);
            
            broadcastStateUpdate();
        };

        const handleObjectModified = (e: any) => {
            if (isUpdatingFromSync.current) return;
            
            const obj = e.target;
            if (!obj) return;
            
            const id = (obj as any).id;
            if (!id) return;
            
            const existing = canvasState.current.elements.get(id);
            const updated = fabricObjectToElement(obj, existing);
            canvasState.current.elements.set(id, updated);
            
            // Remove from active
            activeElements.current.delete(id);
            updateActiveElement(roomId, undefined);
            
            broadcastStateUpdate();
        };

        const handleObjectRemoved = (e: any) => {
            if (isUpdatingFromSync.current) return;
            
            const obj = e.target;
            const id = (obj as any).id;
            if (!id) return;
            
            canvasState.current.elements.delete(id);
            activeElements.current.delete(id);
            
            broadcastStateUpdate();
        };

        const handleSelectionCreated = (e: any) => {
            const obj = e.selected?.[0];
            if (obj) {
                const id = (obj as any).id;
                if (id) {
                    activeElements.current.add(id);
                    updateActiveElement(roomId, id);
                }
            }
        };

        const handleSelectionCleared = () => {
            activeElements.current.clear();
            updateActiveElement(roomId, undefined);
        };

        // Mouse move for cursor tracking
        const handleMouseMove = (e: any) => {
            const pointer = canvas.getScenePoint(e.e);
            updateCursorPosition(roomId, { x: pointer.x, y: pointer.y });
        };

        canvas.on('object:added', handleObjectAdded);
        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:removed', handleObjectRemoved);
        canvas.on('selection:created', handleSelectionCreated);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('mouse:move', handleMouseMove);

        return () => {
            canvas.off('object:added', handleObjectAdded);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:removed', handleObjectRemoved);
            canvas.off('selection:created', handleSelectionCreated);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('mouse:move', handleMouseMove);
        };
    }, [roomId]);

    /**
     * Handle tool changes
     */
    useEffect(() => {
        if (!fabricCanvas.current) return;

        const canvas = fabricCanvas.current;

        if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = lineWidth;
            canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
        }

        if (tool === 'pen' || tool === 'eraser') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new PencilBrush(canvas);
            canvas.freeDrawingBrush.width = tool === 'eraser' ? 20 : lineWidth;
            canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
            canvas.defaultCursor = 'crosshair';
        } else {
            canvas.isDrawingMode = false;
            canvas.defaultCursor = 'default';
        }
    }, [tool, color, lineWidth]);

    /**
     * Shape placement handler
     */
    useEffect(() => {
        if (!fabricCanvas.current) return;
        const canvas = fabricCanvas.current;

        const handleMouseDown = (opt: any) => {
            if (canvas.isDrawingMode) return;

            if (tool === 'rect' || tool === 'circle' || tool === 'triangle' || tool === 'text') {
                if (opt.target) return;

                const pointer = canvas.getScenePoint(opt.e);
                let shape: any;
                const id = generateElementId();

                if (tool === 'rect') {
                    shape = new Rect({
                        left: pointer.x,
                        top: pointer.y,
                        fill: color,
                        width: 100,
                        height: 100
                    });
                } else if (tool === 'circle') {
                    shape = new Circle({
                        left: pointer.x,
                        top: pointer.y,
                        fill: color,
                        radius: 50
                    });
                } else if (tool === 'triangle') {
                    shape = new Triangle({
                        left: pointer.x,
                        top: pointer.y,
                        fill: color,
                        width: 100,
                        height: 100
                    });
                } else if (tool === 'text') {
                    shape = new IText('Type here', {
                        left: pointer.x,
                        top: pointer.y,
                        fill: color,
                        fontSize: 20
                    });
                }

                if (shape) {
                    (shape as any).id = id;
                    canvas.add(shape);
                    canvas.setActiveObject(shape);
                }
            }
        };

        canvas.on('mouse:down', handleMouseDown);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
        };
    }, [tool, color]);

    /**
     * Expose save method
     */
    useEffect(() => {
        if (onSaveRef) {
            onSaveRef.current = async () => {
                const elements = Array.from(canvasState.current.elements.values());
                try {
                    await api.post('/rooms/save', { 
                        roomId, 
                        elements,
                        sceneVersion: canvasState.current.sceneVersion
                    });
                    alert('Canvas Saved!');
                } catch (error) {
                    console.error("Failed to save", error);
                    alert('Failed to save');
                }
            };
        }
    }, [roomId, onSaveRef]);

    return (
        <div className="absolute inset-0 z-0">
            <canvas ref={canvasRef} />
            
            {/* Render remote cursors */}
            {Array.from(users.values()).map(user => (
                user.cursor && (
                    <div
                        key={user.socketId}
                        className="absolute pointer-events-none z-50"
                        style={{
                            left: user.cursor.x,
                            top: user.cursor.y,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path
                                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                                fill={user.userColor || '#000'}
                            />
                        </svg>
                        <div
                            className="ml-4 px-2 py-1 rounded text-white text-xs whitespace-nowrap"
                            style={{ backgroundColor: user.userColor || '#000' }}
                        >
                            {user.userName}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

function generateRandomColor(): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

export default Canvas;
