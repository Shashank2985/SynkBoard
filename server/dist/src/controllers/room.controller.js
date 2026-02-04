"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCanvas = exports.getCanvas = exports.joinRoom = exports.createRoom = void 0;
const uuid_1 = require("uuid");
const Room_model_1 = __importDefault(require("../models/Room.model"));
const Canvas_model_1 = __importDefault(require("../models/Canvas.model"));
const createRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body; // Assuming sent from frontend or middleware
        const roomId = (0, uuid_1.v4)();
        const newRoom = new Room_model_1.default({
            roomId,
            ownerId: userId,
            users: [userId]
        });
        yield newRoom.save();
        // Initialize empty canvas for the room
        const newCanvas = new Canvas_model_1.default({ roomId, dataJSON: '' });
        yield newCanvas.save();
        res.status(201).json({ roomId, message: 'Room created successfully' });
    }
    catch (error) {
        console.error("Create Room Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.createRoom = createRoom;
const joinRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId, userId } = req.body;
        const room = yield Room_model_1.default.findOne({ roomId });
        if (!room) {
            res.status(404).json({ message: 'Room not found' });
            return;
        }
        if (!room.users.includes(userId)) {
            room.users.push(userId);
            yield room.save();
        }
        res.status(200).json({ message: 'Joined room successfully', roomId });
    }
    catch (error) {
        console.error("Join Room Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.joinRoom = joinRoom;
const getCanvas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const canvas = yield Canvas_model_1.default.findOne({ roomId });
        if (!canvas) {
            res.status(404).json({ message: 'Canvas not found' });
            return;
        }
        res.status(200).json({ dataJSON: canvas.dataJSON });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getCanvas = getCanvas;
const saveCanvas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId, dataJSON } = req.body;
        let canvas = yield Canvas_model_1.default.findOne({ roomId });
        if (!canvas) {
            canvas = new Canvas_model_1.default({ roomId, dataJSON });
        }
        else {
            canvas.dataJSON = dataJSON;
        }
        yield canvas.save();
        res.status(200).json({ message: 'Canvas saved' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.saveCanvas = saveCanvas;
