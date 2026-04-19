import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller' | 'admin';
  verificationStatus: 'verified' | 'pending' | 'unverified';
  trustScore: number;
  mfaEnabled: boolean;
  avatar?: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  verificationStatus: { type: String, enum: ['verified', 'pending', 'unverified'], default: 'pending' },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  mfaEnabled: { type: Boolean, default: false },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = { ...ret };
    delete (obj as any).password;
    delete (obj as any).__v;
    return obj;
  },
});

export default mongoose.model<IUser>('User', userSchema);
