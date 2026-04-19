import { Bid } from '../data/mockData';
import { TrendingUp, User, Crown } from 'lucide-react';
import { motion } from 'motion/react';

interface BidHistoryTimelineProps {
  bids: Bid[];
}

export function BidHistoryTimeline({ bids }: BidHistoryTimelineProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold">Bid History</h3>
        <span className="ml-auto text-sm text-gray-400">{bids.length} bids</span>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {bids.map((bid, index) => (
          <motion.div
            key={`${bid.bidder_id}-${bid.timestamp}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative pl-8 pb-4 ${
              index !== bids.length - 1 ? 'border-l-2 border-white/10' : ''
            }`}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full border-2 ${
                bid.status === 'winning'
                  ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50'
                  : bid.status === 'outbid'
                  ? 'bg-slate-600 border-slate-500'
                  : 'bg-yellow-500 border-yellow-400'
              }`}
            >
              {bid.status === 'winning' && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>

            {/* Bid content */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-sm">{bid.bidder_name}</span>
                  {bid.status === 'winning' && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{formatTime(bid.timestamp)}</p>
              </div>

              <div className="text-right">
                <p className={`font-bold ${
                  bid.status === 'winning'
                    ? 'text-emerald-400 text-lg'
                    : 'text-gray-300'
                }`}>
                  ${bid.amount.toLocaleString()}
                </p>
                {bid.status === 'winning' && (
                  <p className="text-xs text-emerald-400">Leading</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {bids.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No bids yet. Be the first to bid!</p>
        </div>
      )}
    </div>
  );
}
