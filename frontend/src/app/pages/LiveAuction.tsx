/**
 * LiveAuction Page - Seller's Live Broadcasting Dashboard
 *
 * Split layout:
 * - Left: Live camera feed via CameraPreview
 * - Right: Auction info, bid history, live chat
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Radio,
  Users,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { CameraPreview } from '../components/CameraPreview';
import { LiveChat } from '../components/LiveChat';
import { BidHistoryTimeline } from '../components/BidHistoryTimeline';
import { CountdownTimer } from '../components/CountdownTimer';
import { useAuctions } from '../context/AuctionContext';
import { useLiveStream } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';

export function LiveAuction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { getAuction, getBidsForAuction } = useAuctions();
  const { getStream, startStream, endStream, sendMessage, addSystemMessage, getMessages } = useLiveStream();

  const auction = getAuction(id || '');
  const bids = getBidsForAuction(id || '');
  const stream = getStream(id || '');
  const messages = getMessages(id || '');

  const [streamDuration, setStreamDuration] = useState('00:00:00');
  const [hasStarted, setHasStarted] = useState(false);

  // Start the stream when page loads
  useEffect(() => {
    if (auction && !stream && !hasStarted) {
      startStream(auction.id, auction.title);
      setHasStarted(true);
    }
  }, [auction, stream, hasStarted, startStream]);

  // Track stream duration
  useEffect(() => {
    if (!stream?.isActive) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - stream.startedAt.getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setStreamDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [stream]);

  // Add system messages for new bids
  useEffect(() => {
    if (!auction || !stream || bids.length === 0) return;
    const latestBid = bids[0];
    if (latestBid) {
      addSystemMessage(
        auction.id,
        `🔥 ${latestBid.bidderName} placed $${latestBid.amount.toLocaleString()}!`,
        'bid'
      );
    }
  }, [bids.length]);

  const handleEndStream = useCallback(() => {
    if (auction) {
      endStream(auction.id);
      navigate(`/auction/${auction.id}`);
    }
  }, [auction, endStream, navigate]);

  const handleSendMessage = useCallback((message: string) => {
    if (auction) {
      sendMessage(auction.id, message);
    }
  }, [auction, sendMessage]);

  // Auth check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Radio className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to Go Live</h2>
          <p className="text-gray-400 mb-6">You need to be logged in to start a live stream.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-xl text-gray-400 mb-4">Auction not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    );
  }

  // Format bid history for timeline
  const formattedBidHistory = bids.map(bid => ({
    bidder_id: bid.bidderId,
    bidder_name: bid.bidderName,
    amount: bid.amount,
    timestamp: bid.timestamp.toISOString(),
    status: bid.status as 'active' | 'outbid' | 'winning',
  }));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold"
              >
                <Radio className="w-3.5 h-3.5" />
                LIVE
              </motion.div>
              <span className="text-sm font-mono text-gray-300">{streamDuration}</span>
            </div>

            <button
              onClick={handleEndStream}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              End Stream
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Camera Feed (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <CameraPreview
              viewerCount={stream?.viewerCount || 0}
              streamDuration={streamDuration}
              onEndStream={handleEndStream}
              isActive={true}
            />

            {/* Auction Info Card */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold mb-4">{auction.title}</h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                  <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                  <motion.p
                    key={auction.currentBid}
                    initial={{ scale: 1.2, color: '#a78bfa' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-2xl font-bold"
                  >
                    ${auction.currentBid.toLocaleString()}
                  </motion.p>
                </div>

                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Bids</p>
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    {auction.bidCount}
                  </p>
                </div>

                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Viewers</p>
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Users className="w-5 h-5 text-pink-400" />
                    {stream?.viewerCount || 0}
                  </p>
                </div>
              </div>

              {/* Timer */}
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Ends:</span>
                <CountdownTimer endTime={auction.endTime.toISOString()} />
              </div>
            </div>
          </div>

          {/* Right: Chat + Bids (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Chat */}
            <div className="h-[400px] flex flex-col">
              <LiveChat
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUserId={user?.id}
              />
            </div>

            {/* Recent Bids */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold text-sm">Recent Bids</h3>
              </div>
              <BidHistoryTimeline bids={formattedBidHistory.slice(0, 5)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
