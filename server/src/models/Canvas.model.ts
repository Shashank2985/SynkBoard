import mongoose, { Document, Schema } from 'mongoose';

// Interface for individual canvas elements with versioning
export interface ICanvasElement {
    id: string;
    type: string;
    properties: any;
    version: number;
    nonce: number;
    lastModified: Date;
}

export interface ICanvas extends Document {
    roomId: string;
    elements: ICanvasElement[]; // State-based: store current state of all elements
    sceneVersion: number; // Overall scene version
    lastCheckpoint: Date; // For lazy checkpointing
    encryptedData?: string; // For E2E encryption (future step)
}

const CanvasElementSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    properties: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true, default: 0 },
    nonce: { type: Number, required: true },
    lastModified: { type: Date, default: Date.now }
}, { _id: false });

const CanvasSchema: Schema = new Schema({
    roomId: { type: String, required: true, unique: true },
    elements: [CanvasElementSchema],
    sceneVersion: { type: Number, default: 0 },
    lastCheckpoint: { type: Date, default: Date.now },
    encryptedData: { type: String },
}, { timestamps: true });

export default mongoose.model<ICanvas>('Canvas', CanvasSchema);
