/**
 * LiveChat - Real-time Chat During Live Stream
 *
 * Scrollable chat panel with auto-scroll to bottom,
 * color-coded messages, and input field.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageCircle } from 'lucide-react';
import { ChatMessage } from '../context/LiveStreamContext';

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId?: string;
  disabled?: boolean;
}

// Generate a consistent color from username
function getUserColor(name: string): string {
  const colors = [
    'text-purple-400', 'text-pink-400', 'text-blue-400',
    'text-emerald-400', 'text-amber-400', 'text-cyan-400',
    'text-rose-400', 'text-indigo-400', 'text-teal-400',
    'text-orange-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function LiveChat({ messages, onSendMessage, currentUserId, disabled }: LiveChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/80">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-500 rounded-full animate-pulse opacity-30" />
          <MessageCircle className="w-4 h-4 text-purple-400 relative z-10" />
        </div>
        <h3 className="font-semibold text-sm">Live Chat</h3>
        <span className="ml-auto px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-sm ${
                msg.type === 'system'
                  ? 'text-center py-1'
                  : msg.type === 'bid'
                  ? 'py-1'
                  : ''
              }`}
            >
              {msg.type === 'system' ? (
                <span className="text-xs text-gray-500 italic">{msg.message}</span>
              ) : msg.type === 'bid' ? (
                <div className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <span className="text-purple-400 text-xs font-medium">{msg.message}</span>
                </div>
              ) : (
                <div className={`group ${msg.userId === currentUserId ? '' : ''}`}>
                  <span className={`font-semibold text-xs ${
                    msg.userId === currentUserId
                      ? 'text-emerald-400'
                      : getUserColor(msg.userName)
                  }`}>
                    {msg.userName}
                  </span>
                  <span className="text-gray-500 text-[10px] ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(msg.timestamp)}
                  </span>
                  <span className="text-gray-300 ml-1.5">{msg.message}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Be the first to chat!</p>
          </div>
        )}
      </div>

      {/* Scroll to bottom indicator */}
      {!isAtBottom && messages.length > 5 && (
        <button
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }}
          className="mx-3 mb-2 px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full text-center hover:bg-purple-500/30 transition-colors"
        >
          ↓ New messages
        </button>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Sign in to chat' : 'Say something...'}
            disabled={disabled}
            className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
