import express from 'express';
import { createRoom, joinRoom, getCanvas, saveCanvas } from '../controllers/room.controller';

const router = express.Router();

router.post('/create', createRoom);
router.post('/join', joinRoom);
router.get('/:roomId/canvas', getCanvas);
router.post('/save', saveCanvas);

export default router;
