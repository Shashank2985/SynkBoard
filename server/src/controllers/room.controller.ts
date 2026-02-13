import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room.model';
import Canvas from '../models/Canvas.model';

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body; // Assuming sent from frontend or middleware
        const roomId = uuidv4();

        const newRoom = new Room({
            roomId,
            ownerId: userId,
            users: [userId],
            activeUsers: []
        });
        await newRoom.save();

        // Initialize empty canvas for the room (state-based)
        const newCanvas = new Canvas({ 
            roomId, 
            elements: [],
            sceneVersion: 0,
            lastCheckpoint: new Date()
        });
        await newCanvas.save();

        res.status(201).json({ roomId, message: 'Room created successfully' });
    } catch (error: any) {
        console.error("Create Room Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const joinRoom = async (req: Request, res: Response) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findOne({ roomId });

        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return
        }

        if (!room.users.includes(userId)) {
            room.users.push(userId);
            await room.save();
        }

        res.status(200).json({ message: 'Joined room successfully', roomId });
    } catch (error: any) {
        console.error("Join Room Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCanvas = async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const canvas = await Canvas.findOne({ roomId });

        if (!canvas) {
            res.status(404).json({ message: 'Canvas not found' });
            return
        }

        // Return state-based canvas data
        res.status(200).json({ 
            elements: canvas.elements || [],
            sceneVersion: canvas.sceneVersion || 0
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const saveCanvas = async (req: Request, res: Response) => {
    try {
        const { roomId, elements, sceneVersion } = req.body;
        let canvas = await Canvas.findOne({ roomId });

        if (!canvas) {
            canvas = new Canvas({ 
                roomId, 
                elements: elements || [],
                sceneVersion: sceneVersion || 0,
                lastCheckpoint: new Date()
            });
        } else {
            canvas.elements = elements || [];
            canvas.sceneVersion = sceneVersion || 0;
            canvas.lastCheckpoint = new Date();
        }

        await canvas.save();
        res.status(200).json({ message: 'Canvas saved' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error' });
    }
}
