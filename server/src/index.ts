import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './db/db';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import { setupSocket } from './socket/socketHandler';

dotenv.config();

const app: Express = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for now
        methods: ['GET', 'POST']
    }
});

setupSocket(io);

// Health Check
app.get('/', (req: Request, res: Response) => {
    res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
