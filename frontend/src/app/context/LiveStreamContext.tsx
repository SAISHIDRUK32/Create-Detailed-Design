/**
 * LiveStreamContext - Live Stream State Management
 *
 * Manages live streaming sessions for auctions:
 * - Tracks active streams and their metadata
 * - Real-time chat messages during streams
 * - Viewer counts and stream duration
 * - Start/end stream lifecycle
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'bid';
}

export interface LiveStream {
  id: string;
  auctionId: string;
  sellerId: string;
  sellerName: string;
  title: string;
  viewerCount: number;
  startedAt: Date;
  isActive: boolean;
  messages: ChatMessage[];
}

interface LiveStreamContextType {
  activeStreams: LiveStream[];
  getStream: (auctionId: string) => LiveStream | undefined;
  startStream: (auctionId: string, title: string) => LiveStream;
  endStream: (auctionId: string) => void;
  sendMessage: (auctionId: string, message: string) => void;
  addSystemMessage: (auctionId: string, message: string, type?: 'system' | 'bid') => void;
  getMessages: (auctionId: string) => ChatMessage[];
}

const LiveStreamContext = createContext<LiveStreamContextType | null>(null);

export function useLiveStream() {
  const context = useContext(LiveStreamContext);
  if (!context) {
    throw new Error('useLiveStream must be used within a LiveStreamProvider');
  }
  return context;
}

// Simulated chat messages for demo
const simulatedMessages = [
  "This looks amazing! 🔥",
  "How old is this piece?",
  "What's the condition of the back?",
  "Can you show a close-up?",
  "I'm definitely bidding on this",
  "Incredible quality!",
  "Is shipping included?",
  "Any scratches visible?",
  "Love the color 😍",
  "Does it come with original box?",
  "What's the provenance?",
  "Beautiful item!",
  "Can you turn it around?",
  "How long have you had this?",
  "This is a steal at this price",
];

const simulatedUsers = [
  'Sarah K.', 'Michael Z.', 'Emma W.', 'David C.',
  'Olivia M.', 'James L.', 'Sophie R.', 'Ryan T.',
];

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);

  // Simulate incoming chat messages for active streams
  useEffect(() => {
    const interval = setInterval(() => {
      setStreams(prev => prev.map(stream => {
        if (!stream.isActive) return stream;

        // ~30% chance of new message each tick
        if (Math.random() > 0.3) return stream;

        const randomUser = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
        const randomMessage = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];

        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: `sim-${randomUser.toLowerCase().replace(' ', '-')}`,
          userName: randomUser,
          message: randomMessage,
          timestamp: new Date(),
          type: 'user',
        };

        return {
          ...stream,
          messages: [...stream.messages, newMessage].slice(-100), // Keep last 100
          viewerCount: Math.max(1, stream.viewerCount + Math.floor(Math.random() * 5) - 2),
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStream = useCallback((auctionId: string) => {
    return streams.find(s => s.auctionId === auctionId);
  }, [streams]);

  const startStream = useCallback((auctionId: string, title: string): LiveStream => {
    const newStream: LiveStream = {
      id: `stream-${Date.now()}`,
      auctionId,
      sellerId: user?.id || 'unknown',
      sellerName: user?.name || 'Unknown',
      title,
      viewerCount: Math.floor(Math.random() * 20) + 5,
      startedAt: new Date(),
      isActive: true,
      messages: [
        {
          id: `msg-welcome`,
          userId: 'system',
          userName: 'AURA',
          message: '🔴 Live stream started! Welcome everyone.',
          timestamp: new Date(),
          type: 'system',
        },
      ],
    };

    setStreams(prev => [...prev, newStream]);
    return newStream;
  }, [user]);

  const endStream = useCallback((auctionId: string) => {
    setStreams(prev => prev.map(s => {
      if (s.auctionId !== auctionId) return s;
      return {
        ...s,
        isActive: false,
        messages: [
          ...s.messages,
          {
            id: `msg-end-${Date.now()}`,
            userId: 'system',
            userName: 'AURA',
            message: '⬛ Stream has ended. Thank you for watching!',
            timestamp: new Date(),
            type: 'system',
          },
        ],
      };
    }));
  }, []);

  const sendMessage = useCallback((auctionId: string, message: string) => {
    if (!user || !message.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user.id,
      userName: user.name,
      message: message.trim(),
      timestamp: new Date(),
      type: 'user',
    };

    setStreams(prev => prev.map(s => {
      if (s.auctionId !== auctionId) return s;
      return {
        ...s,
        messages: [...s.messages, newMsg].slice(-100),
      };
    }));
  }, [user]);

  const addSystemMessage = useCallback((auctionId: string, message: string, type: 'system' | 'bid' = 'system') => {
    const newMsg: ChatMessage = {
      id: `msg-sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: 'system',
      userName: 'AURA',
      message,
      timestamp: new Date(),
      type,
    };

    setStreams(prev => prev.map(s => {
      if (s.auctionId !== auctionId) return s;
      return {
        ...s,
        messages: [...s.messages, newMsg].slice(-100),
      };
    }));
  }, []);

  const getMessages = useCallback((auctionId: string): ChatMessage[] => {
    return streams.find(s => s.auctionId === auctionId)?.messages || [];
  }, [streams]);

  return (
    <LiveStreamContext.Provider
      value={{
        activeStreams: streams.filter(s => s.isActive),
        getStream,
        startStream,
        endStream,
        sendMessage,
        addSystemMessage,
        getMessages,
      }}
    >
      {children}
    </LiveStreamContext.Provider>
  );
}
