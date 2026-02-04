'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, PencilBrush, util, Rect, Circle, Triangle, IText } from 'fabric';
import api from '@/services/api';
import { getSocket } from '@/services/socket';
// Import shared type if possible, or redefine. 
// Just redefine for now to avoid circular deps if ToolType is in Toolbar which imports icons. 
// Ideally type should be in separate file. 

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
    const isDrawingRef = useRef(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Fabric Canvas
        const canvas = new FabricCanvas(canvasRef.current, {
            width: window.innerWidth,
            height: window.innerHeight,
        });

        fabricCanvas.current = canvas;

        // Ensure brush initialized
        canvas.freeDrawingBrush = new PencilBrush(canvas);

        // Socket Events
        socket.emit('join-room', roomId);

        socket.on('draw', (data: any) => {
            isDrawingRef.current = true;
            util.enlivenObjects([data]).then((enlivenedObjects: any[]) => {
                enlivenedObjects.forEach((obj) => {
                    // Check if object already exists (e.g. by comparing someID if we had one, but we don't)
                    // Simple MVP: Just add. 
                    // ISSUE: If 'draw' event is sent for MODIFY, we shouldn't just ADD. 
                    // We need a way to identifying objects. Fabric doesn't enforce IDs.
                    // For MVP: 'draw' event = NEW object.
                    // We will need a new event for 'modify'.
                    canvas.add(obj);
                });
                canvas.renderAll();
                isDrawingRef.current = false;
            });
        });

        socket.on('clear-canvas', () => {
            isDrawingRef.current = true;
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            isDrawingRef.current = false;
        });

        // Event for new objects (Free drawing OR Shapes)
        canvas.on('object:added', (e: any) => {
            if (isDrawingRef.current) return;

            const object = e.target;
            if (!object) return;

            // if it's already on remote, we shouldn't emit? 
            // We rely on isDrawingRef flag. 
            // When we receive 'draw', we set flag=true, then add object. So this listener fires. 
            // But flag is true, so we return. Correct.

            // Serialize
            const json = object.toJSON();
            socket.emit('draw', { roomId, path: json });
        });

        // TODO: Handle 'object:modified' for moving/resizing shapes.
        // Requires unique IDs for objects to sync updates. 
        // For this step, we'll focus on ADDING shapes.

        // Window Resize
        const handleResize = () => {
            canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            canvas.dispose();
            socket.off('draw');
            socket.off('clear-canvas');
            window.removeEventListener('resize', handleResize);
        };
    }, [roomId]);

    // Handle Tool Changes & Inputs
    useEffect(() => {
        if (!fabricCanvas.current) return;

        const canvas = fabricCanvas.current;

        // Update Brush (Always update brush properties even if not in drawing mode, just in case)
        if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = lineWidth;
            canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
        }

        // Mode Switching
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

        // Shape Adding Logic (One-off actions on tool select for simplicity, 
        // OR wait for click? User asked for "Enhance toolbar". 
        // Best UX: Click tool -> Click canvas to place.
        // Implementation: Global click listener on canvas?)

        // Let's implement "Click to add" logic using fabric events.
        // We need to store 'currentTool' in a ref accessible by event handler, 
        // or re-bind handler when tool changes.
    }, [tool, color, lineWidth]);

    // Shape placement handler
    useEffect(() => {
        if (!fabricCanvas.current) return;
        const canvas = fabricCanvas.current;

        const handleMouseDown = (opt: any) => {
            if (canvas.isDrawingMode) return;

            // Only add if we clicked on empty space (not selecting existing object) 
            // AND we have a shape tool selected. 
            // Fabric 'mouse:down' fires before selection? 
            // If target is null, we clicked empty space.

            if (tool === 'rect' || tool === 'circle' || tool === 'triangle' || tool === 'text') {
                if (opt.target) return; // Selected something, don't add.

                const pointer = canvas.getScenePoint(opt.e);
                // Fallback or check
                // const pointer = canvas.getPointer(opt.e);
                // Fabric v6: getScenePoint instead of getPointer for absolute coords?
                // Actually `getPointer` is often deprecated.
                // Let's use getScenePoint.
                let shape: any;

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
                    canvas.add(shape);
                    canvas.setActiveObject(shape); // Select it immediately
                    // object:added event will fire and sync it.
                }
            }
        };

        canvas.on('mouse:down', handleMouseDown);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
        };
    }, [tool, color]); // Re-bind when tool/color changes


    // Load initial canvas data
    useEffect(() => {
        const loadCanvas = async () => {
            if (!fabricCanvas.current) return;
            try {
                const res = await api.get(`/rooms/${roomId}/canvas`);
                if (res.data.dataJSON) {
                    fabricCanvas.current.loadFromJSON(res.data.dataJSON, () => {
                        fabricCanvas.current?.renderAll();
                    });
                }
            } catch (error) {
                console.error("Failed to load canvas", error);
            }
        };
        loadCanvas();
    }, [roomId]);

    // Expose save method
    useEffect(() => {
        if (onSaveRef) {
            onSaveRef.current = async () => {
                if (!fabricCanvas.current) return;
                const json = JSON.stringify(fabricCanvas.current.toJSON());
                try {
                    await api.post('/rooms/save', { roomId, dataJSON: json });
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
        </div>
    );
};

export default Canvas;
