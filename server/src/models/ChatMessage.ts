import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  auctionId: string;
  userId: string;
  userName: string;
  message: string;
  type: 'user' | 'system' | 'bid';
  timestamp: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  auctionId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['user', 'system', 'bid'], default: 'user' },
  timestamp: { type: Date, default: Date.now },
});

chatMessageSchema.index({ auctionId: 1, timestamp: 1 });

chatMessageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = { ...ret, id: ret._id };
    delete (obj as any).__v;
    return obj;
  },
});

export default mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
