import mongoose, { Document, Schema } from 'mongoose';

export interface IBid extends Document {
  auction: mongoose.Types.ObjectId;
  bidder: mongoose.Types.ObjectId;
  bidderName: string;
  amount: number;
  timestamp: Date;
  status: 'winning' | 'outbid' | 'cancelled';
}

const bidSchema = new Schema<IBid>({
  auction: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
  bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bidderName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['winning', 'outbid', 'cancelled'], default: 'winning' },
});

// Indexes
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ bidder: 1 });
bidSchema.index({ auction: 1, status: 1 });

bidSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = { ...ret, id: ret._id };
    delete (obj as any).__v;
    return obj;
  },
});

export default mongoose.model<IBid>('Bid', bidSchema);
