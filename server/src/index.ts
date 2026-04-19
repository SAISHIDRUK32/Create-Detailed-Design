/**
 * AURA-Auction Backend Server
 *
 * Express + Socket.IO + MongoDB
 * Handles: Authentication, Auction CRUD, Bidding, Real-time events
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import auctionRoutes from './routes/auctions';
import bidRoutes from './routes/bids';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Make io accessible in routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   🔨 AURA-Auction Backend Server         ║
║                                          ║
║   Port:     ${String(PORT).padEnd(27)}║
║   MongoDB:  Connected ✅                 ║
║   Socket:   Ready ✅                     ║
║                                          ║
╚══════════════════════════════════════════╝
    `);
  });
};

startServer().catch(console.error);

export { io };
