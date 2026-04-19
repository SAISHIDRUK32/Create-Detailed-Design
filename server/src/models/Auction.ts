import mongoose, { Document, Schema } from 'mongoose';

export interface IAuction extends Document {
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  startingPrice: number;
  currentBid: number;
  reservePrice: number;
  buyNowPrice: number;
  minIncrement: number;
  seller: mongoose.Types.ObjectId;
  sellerName: string;
  startTime: Date;
  endTime: Date;
  status: 'draft' | 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'sold' | 'cancelled';
  bidCount: number;
  watchers: mongoose.Types.ObjectId[];
  winnerId?: mongoose.Types.ObjectId;
  winnerName?: string;
  enableAntiSnipe: boolean;
  reserveMet: boolean;
  isLiveStream: boolean;
  createdAt: Date;
}

const auctionSchema = new Schema<IAuction>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  condition: { type: String, default: 'good' },
  images: [{ type: String }],
  startingPrice: { type: Number, required: true, min: 0 },
  currentBid: { type: Number, default: 0 },
  reservePrice: { type: Number, default: 0 },
  buyNowPrice: { type: Number, default: 0 },
  minIncrement: { type: Number, default: 10 },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'live', 'ending_soon', 'ended', 'sold', 'cancelled'],
    default: 'live',
  },
  bidCount: { type: Number, default: 0 },
  watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  winnerName: { type: String },
  enableAntiSnipe: { type: Boolean, default: true },
  reserveMet: { type: Boolean, default: false },
  isLiveStream: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for common queries
auctionSchema.index({ status: 1 });
auctionSchema.index({ category: 1 });
auctionSchema.index({ seller: 1 });
auctionSchema.index({ endTime: 1 });

auctionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = { ...ret, id: ret._id };
    delete (obj as any).__v;
    return obj;
  },
});

export default mongoose.model<IAuction>('Auction', auctionSchema);
