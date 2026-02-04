import mongoose, { Document, Schema } from 'mongoose';

export interface ICanvas extends Document {
    roomId: string; // Linking by roomId (string) instead of Room ObjectId for easier lookup during socket events? Or should be consistent. Keeping roomId string as per simple MVP.
    dataJSON: string;
}

const CanvasSchema: Schema = new Schema({
    roomId: { type: String, required: true, unique: true },
    dataJSON: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<ICanvas>('Canvas', CanvasSchema);
