"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./db/db"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const room_routes_1 = __importDefault(require("./routes/room.routes"));
const socketHandler_1 = require("./socket/socketHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Database Connection
(0, db_1.default)();
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/rooms', room_routes_1.default);
// Socket.io Setup
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all origins for now
        methods: ['GET', 'POST']
    }
});
(0, socketHandler_1.setupSocket)(io);
// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});
// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
