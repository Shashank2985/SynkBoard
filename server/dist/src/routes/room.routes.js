"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const room_controller_1 = require("../controllers/room.controller");
const router = express_1.default.Router();
router.post('/create', room_controller_1.createRoom);
router.post('/join', room_controller_1.joinRoom);
router.get('/:roomId/canvas', room_controller_1.getCanvas);
router.post('/save', room_controller_1.saveCanvas);
exports.default = router;
