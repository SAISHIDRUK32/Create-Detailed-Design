import { Link } from 'react-router';
import { Heart, Clock, TrendingUp, Shield, Eye } from 'lucide-react';
import { Auction } from '../context/AuctionContext';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface AuctionCardProps {
  auction: Auction;
  onToggleWatchlist?: (id: string) => void;
  isWatched?: boolean;
}

export function AuctionCard({ auction, onToggleWatchlist, isWatched }: AuctionCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const end = new Date(auction.endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [auction.endTime]);

  const isEndingSoon = auction.status === 'ending_soon';
  const isLive = auction.status === 'live' || auction.status === 'ending_soon';
  const isTrending = auction.bidCount > 30;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all duration-300"
    >
      {/* Image */}
      <Link to={`/auction/${auction.id}`} className="block relative aspect-[4/3] overflow-hidden">
        {auction.images[0] ? (
          <img
            src={auction.images[0]}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-60" />

        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {isTrending && (
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/90 to-purple-500/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Trending
            </span>
          )}
          {isEndingSoon && (
            <span className="px-3 py-1 rounded-full bg-red-500/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" />
              Ending Soon
            </span>
          )}
          {isLive && !isEndingSoon && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Live
            </span>
          )}
        </div>

        {/* Watchlist button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWatchlist?.(auction.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
            isWatched
              ? 'bg-pink-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Heart className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link to={`/auction/${auction.id}`}>
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
            {auction.title}
          </h3>
        </Link>

        {/* Price Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-400">Current Bid</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ${auction.currentBid.toLocaleString()}
            </span>
          </div>
          {!auction.reserveMet && (
            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Reserve not met
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {auction.bidCount} bids
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {auction.watchers.length}
            </span>
          </div>
          <div className={`flex items-center gap-1 font-medium ${isEndingSoon ? 'text-red-400' : 'text-gray-300'}`}>
            <Clock className="w-4 h-4" />
            {timeRemaining}
          </div>
        </div>
      </div>

      {/* Glassmorphism effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 pointer-events-none transition-all duration-300" />
    </motion.div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
