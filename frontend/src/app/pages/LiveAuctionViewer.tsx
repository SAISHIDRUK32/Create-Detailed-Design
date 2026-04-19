/**
 * LiveAuctionViewer Page - Buyer/Viewer Experience
 *
 * Immersive viewer for watching a live auction stream.
 * Shows a simulated video feed with bidding overlay and live chat.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Radio,
  Users,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Zap,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { LiveStreamOverlay } from '../components/LiveStreamOverlay';
import { LiveChat } from '../components/LiveChat';
import { BidButton } from '../components/BidButton';
import { BidHistoryTimeline } from '../components/BidHistoryTimeline';
import { useAuctions } from '../context/AuctionContext';
import { useLiveStream } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';

export function LiveAuctionViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { getAuction, placeBid, getBidsForAuction, toggleWatchlist, isWatching } = useAuctions();
  const { getStream, sendMessage, getMessages, startStream } = useLiveStream();

  const auction = getAuction(id || '');
  const bids = getBidsForAuction(id || '');
  const stream = getStream(id || '');
  const messages = getMessages(id || '');
  const watching = isWatching(id || '');

  // Ensure stream exists for viewer (in case seller hasn't started it yet)
  useEffect(() => {
    if (auction && !stream) {
      startStream(auction.id, auction.title);
    }
  }, [auction, stream, startStream]);

  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showBidPanel, setShowBidPanel] = useState(false);

  // Memoize gradient angle to prevent excessive re-renders
  const [gradAngle, setGradAngle] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setGradAngle(prev => (prev + 0.5) % 360);
    }, 100); // Increased interval for smoother animation
    return () => clearInterval(interval);
  }, []);

  const handleBid = useCallback(async (amount: number) => {
    setBidError('');
    setBidSuccess(false);

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await placeBid(auction!.id, amount);

    if (result.success) {
      setBidSuccess(true);
      setShowBidPanel(false);
      setTimeout(() => setBidSuccess(false), 3000);
    } else {
      setBidError(result.error || 'Failed to place bid');
      throw new Error(result.error || 'Failed to place bid');
    }
  }, [isAuthenticated, auction, placeBid, navigate]);

  const handleSendMessage = useCallback((message: string) => {
    if (auction) {
      sendMessage(auction.id, message);
    }
  }, [auction, sendMessage]);

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
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

  // Determine user's status
  const userHighestBid = bids.find(b => b.bidderId === user?.id);
  const isLeading = userHighestBid?.status === 'winning';
  const isOutbid = userHighestBid && userHighestBid.status === 'outbid';
  const isLive = auction.status === 'live' || auction.status === 'ending_soon';

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
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-16 z-30">
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
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Users className="w-4 h-4 text-pink-400" />
                {stream?.viewerCount || Math.floor(Math.random() * 30) + 10} watching
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleWatchlist(auction.id)}
                className={`p-2 rounded-lg transition-all ${
                  watching ? 'bg-pink-500/20 text-pink-400' : 'hover:bg-white/10 text-gray-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${watching ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-all">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Video Feed (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Simulated Video Feed */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
              {/* Animated background simulating video feed */}
              <div className="absolute inset-0">
                {/* Product image as background */}
                {auction.images[0] ? (
                  <img
                    src={auction.images[0]}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(${gradAngle}deg, rgba(88,28,135,0.3), rgba(15,23,42,0.8), rgba(157,23,77,0.3))`,
                    }}
                  />
                )}

                {/* Animated overlay effects to simulate "live" feel */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <motion.div
                  animate={{
                    opacity: [0.02, 0.06, 0.02],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-white mix-blend-overlay"
                />

                {/* Scan line effect */}
                <motion.div
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
              </div>

              {/* Overlay with auction info */}
              <LiveStreamOverlay
                title={auction.title}
                currentBid={auction.currentBid}
                bidCount={auction.bidCount}
                viewerCount={stream?.viewerCount || 15}
                endTime={auction.endTime.toISOString()}
                sellerName={auction.sellerName}
                reserveMet={auction.reserveMet}
                onPlaceBid={() => setShowBidPanel(true)}
              />
            </div>

            {/* User Status Banner */}
            <AnimatePresence>
              {isAuthenticated && (isLeading || isOutbid) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border ${
                    isLeading
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-red-500/10 border-red-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isLeading ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-emerald-400">You're in the lead!</p>
                          <p className="text-sm text-gray-300">Your bid: ${userHighestBid?.amount.toLocaleString()}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <div>
                          <p className="font-semibold text-red-400">You've been outbid!</p>
                          <p className="text-sm text-gray-300">Your bid: ${userHighestBid?.amount.toLocaleString()}</p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {bidSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <p className="font-semibold text-emerald-400">Bid placed successfully!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bid Panel (expandable) */}
            <AnimatePresence>
              {showBidPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Place Your Bid
                      </h3>
                      <button
                        onClick={() => setShowBidPanel(false)}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        Close
                      </button>
                    </div>

                    <BidButton
                      currentBid={auction.currentBid}
                      onBid={handleBid}
                      disabled={!isLive || auction.sellerId === user?.id}
                      minIncrement={auction.minIncrement}
                    />

                    {!isAuthenticated && (
                      <div className="text-center mt-3">
                        <p className="text-gray-400 text-sm">Sign in to place a bid</p>
                        <Link
                          to="/login"
                          className="text-purple-400 hover:text-purple-300 font-medium text-sm"
                        >
                          Sign in →
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Item Details */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-3">About This Item</h3>
              <p className="text-gray-300 text-sm mb-4">{auction.description}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Category</p>
                  <p className="font-medium mt-1">{auction.category}</p>
                </div>
                <div>
                  <p className="text-gray-400">Condition</p>
                  <p className="font-medium mt-1 capitalize">{auction.condition.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-400">Watchers</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {auction.watchers.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Bid History */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold">Bid History</h3>
                <span className="ml-auto text-sm text-gray-400">{bids.length} bids</span>
              </div>
              <BidHistoryTimeline bids={formattedBidHistory.slice(0, 10)} />
            </div>
          </div>

          {/* Right: Chat Panel (1/3) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Bid Card */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-5 border border-purple-500/20">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-400">Current Highest Bid</p>
                <motion.p
                  key={auction.currentBid}
                  initial={{ scale: 1.2, color: '#a78bfa' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-3xl font-bold mt-1"
                >
                  ${auction.currentBid.toLocaleString()}
                </motion.p>
                <p className="text-xs text-gray-400 mt-1">
                  {auction.bidCount} bids · Min +${auction.minIncrement}
                </p>
              </div>

              <button
                onClick={() => setShowBidPanel(!showBidPanel)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {showBidPanel ? 'Hide Bid Panel' : 'Place Bid'}
              </button>
            </div>

            {/* Live Chat */}
            <div className="h-[500px] flex flex-col">
              <LiveChat
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUserId={user?.id}
                disabled={!isAuthenticated}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
