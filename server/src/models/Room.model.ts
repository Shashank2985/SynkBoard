import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
    roomId: string;
    ownerId: mongoose.Types.ObjectId;
    users: mongoose.Types.ObjectId[];
}

const RoomSchema: Schema = new Schema({
    roomId: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IRoom>('Room', RoomSchema);
