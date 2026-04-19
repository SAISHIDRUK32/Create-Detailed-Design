/**
 * LiveStreamOverlay - Transparent Bid Info Overlay
 *
 * Overlays auction info on top of the live video feed
 * for viewers watching the stream.
 */

import { motion } from 'motion/react';
import { TrendingUp, Users, Shield, Zap } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

interface LiveStreamOverlayProps {
  title: string;
  currentBid: number;
  bidCount: number;
  viewerCount: number;
  endTime: string;
  sellerName: string;
  reserveMet: boolean;
  onPlaceBid: () => void;
}

export function LiveStreamOverlay({
  title,
  currentBid,
  bidCount,
  viewerCount,
  endTime,
  sellerName,
  reserveMet,
  onPlaceBid,
}: LiveStreamOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top gradient for readability */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />

      {/* Top bar: Title + Seller */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LIVE badge */}
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full text-xs font-bold"
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </motion.div>

            {/* Viewer count */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs">
              <Users className="w-3.5 h-3.5 text-pink-400" />
              {viewerCount.toLocaleString()} watching
            </div>
          </div>

          {/* Seller badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold">
              {sellerName.charAt(0)}
            </div>
            <span>{sellerName}</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Bottom: Bid info + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        {/* Item title */}
        <h3 className="text-lg font-bold mb-3 drop-shadow-lg line-clamp-1">{title}</h3>

        <div className="flex items-end justify-between gap-4">
          {/* Bid info */}
          <div className="space-y-2">
            {/* Current bid */}
            <div>
              <p className="text-xs text-gray-300">Current Bid</p>
              <motion.p
                key={currentBid}
                initial={{ scale: 1.3, color: '#a78bfa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-3xl font-bold"
              >
                ${currentBid.toLocaleString()}
              </motion.p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-300">
                <TrendingUp className="w-3.5 h-3.5" />
                {bidCount} bids
              </span>
              <span className={reserveMet ? 'text-emerald-400' : 'text-yellow-400'}>
                {reserveMet ? '✓ Reserve Met' : 'Reserve Not Met'}
              </span>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2">
              <CountdownTimer endTime={endTime} />
            </div>
          </div>

          {/* Bid button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPlaceBid}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/30 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Place Bid
          </motion.button>
        </div>
      </div>
    </div>
  );
}
