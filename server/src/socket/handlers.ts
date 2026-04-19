/**
 * Socket.IO Event Handlers
 *
 * Real-time events for:
 * - Auction room management (join/leave)
 * - Live chat during streams
 * - Viewer count tracking
 */

import { Server, Socket } from 'socket.io';
import ChatMessage from '../models/ChatMessage';

// Track viewer counts per auction room
const viewerCounts: Map<string, Set<string>> = new Map();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    /**
     * Join an auction room for real-time updates
     */
    socket.on('join-auction', (auctionId: string) => {
      const room = `auction:${auctionId}`;
      socket.join(room);

      // Track viewer
      if (!viewerCounts.has(auctionId)) {
        viewerCounts.set(auctionId, new Set());
      }
      viewerCounts.get(auctionId)!.add(socket.id);

      const count = viewerCounts.get(auctionId)!.size;
      io.to(room).emit('viewer-count', { auctionId, count });

      console.log(`👁 ${socket.id} joined auction ${auctionId} (${count} viewers)`);
    });

    /**
     * Leave an auction room
     */
    socket.on('leave-auction', (auctionId: string) => {
      const room = `auction:${auctionId}`;
      socket.leave(room);

      // Remove viewer
      viewerCounts.get(auctionId)?.delete(socket.id);
      const count = viewerCounts.get(auctionId)?.size || 0;
      io.to(room).emit('viewer-count', { auctionId, count });

      console.log(`👋 ${socket.id} left auction ${auctionId} (${count} viewers)`);
    });

    /**
     * Live chat message during stream
     */
    socket.on('chat-message', async (data: {
      auctionId: string;
      userId: string;
      userName: string;
      message: string;
      type?: 'user' | 'system' | 'bid';
    }) => {
      try {
        const { auctionId, userId, userName, message, type } = data;

        if (!auctionId || !message?.trim()) return;

        // Save to database
        const chatMsg = new ChatMessage({
          auctionId,
          userId: userId || 'anonymous',
          userName: userName || 'Anonymous',
          message: message.trim(),
          type: type || 'user',
        });
        await chatMsg.save();

        // Broadcast to auction room
        io.to(`auction:${auctionId}`).emit('chat-message', chatMsg.toJSON());
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    /**
     * Get chat history for an auction
     */
    socket.on('get-chat-history', async (auctionId: string) => {
      try {
        const messages = await ChatMessage.find({ auctionId })
          .sort({ timestamp: 1 })
          .limit(100);

        socket.emit('chat-history', {
          auctionId,
          messages: messages.map(m => m.toJSON()),
        });
      } catch (error) {
        console.error('Chat history error:', error);
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      // Remove from all viewer counts
      viewerCounts.forEach((viewers, auctionId) => {
        if (viewers.has(socket.id)) {
          viewers.delete(socket.id);
          io.to(`auction:${auctionId}`).emit('viewer-count', {
            auctionId,
            count: viewers.size,
          });
        }
      });

      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}
