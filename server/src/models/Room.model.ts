import mongoose, { Document, Schema } from 'mongoose';

// Interface for active user presence
export interface IActiveUser {
    socketId: string;
    userId?: mongoose.Types.ObjectId;
    userName?: string;
    userColor?: string;
    joinedAt: Date;
    lastSeen: Date;
}

export interface IRoom extends Document {
    roomId: string;
    ownerId: mongoose.Types.ObjectId;
    users: mongoose.Types.ObjectId[];
    activeUsers: IActiveUser[];
    accessKey?: string; 
}

const ActiveUserSchema = new Schema({
    socketId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userColor: { type: String },
    joinedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now }
}, { _id: false });

const RoomSchema: Schema = new Schema({
    roomId: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    activeUsers: [ActiveUserSchema],
    accessKey: { type: String },
}, { timestamps: true });

export default mongoose.model<IRoom>('Room', RoomSchema);
