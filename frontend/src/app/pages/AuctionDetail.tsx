/**
 * AuctionDetail Page - Live Bidding with Real-Time Updates
 *
 * This page demonstrates live auction bidding with:
 * - Real-time bid updates via AuctionContext
 * - Max-Heap visualization for bid management
 * - Anti-snipe protection
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { BidButton } from '../components/BidButton';
import { BidHistoryTimeline } from '../components/BidHistoryTimeline';
import { CountdownTimer } from '../components/CountdownTimer';
import { HeapVisualizer } from '../components/HeapVisualizer';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  Eye,
  TrendingUp,
  Shield,
  Zap,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { getAuction, placeBid, getBidsForAuction, toggleWatchlist, isWatching } = useAuctions();

  // Get auction data (will update in real-time)
  const auction = getAuction(id || '');
  const bids = getBidsForAuction(id || '');
  const watching = isWatching(id || '');

  // Image selection state
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);

  // Determine user's status
  const userHighestBid = bids.find(b => b.bidderId === user?.id);
  const isLeading = userHighestBid?.status === 'winning';
  const isOutbid = userHighestBid && userHighestBid.status === 'outbid';

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

  const isLive = auction.status === 'live' || auction.status === 'ending_soon';
  const isTrending = auction.bidCount > 30;

  // Handle bid placement
  const handleBid = async (amount: number) => {
    setBidError('');
    setBidSuccess(false);

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = placeBid(auction.id, amount);

    if (result.success) {
      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 3000);
    } else {
      setBidError(result.error || 'Failed to place bid');
      throw new Error(result.error || 'Failed to place bid');
    }
  };

  // Format bid history for timeline
  const formattedBidHistory = bids.map(bid => ({
    bidder_id: bid.bidderId,
    bidder_name: bid.bidderName,
    amount: bid.amount,
    timestamp: bid.timestamp.toISOString(),
    status: bid.status as 'active' | 'outbid' | 'winning',
  }));

  // Create heap visualization data
  const heapArray = bids.map(b => ({
    bidderId: b.bidderId,
    bidderName: b.bidderName,
    amount: b.amount,
    timestamp: b.timestamp,
    status: b.status,
  }));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Back Button */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Auctions</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Image Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-white/10">
              {auction.images[selectedImage] ? (
                <img
                  src={auction.images[selectedImage]}
                  alt={auction.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => toggleWatchlist(auction.id)}
                  className={`p-3 rounded-full backdrop-blur-xl transition-all ${
                    watching
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${watching ? 'fill-current' : ''}`} />
                </button>
                <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              {isLive && (
                <div className="absolute bottom-4 left-4 px-4 py-2 rounded-full bg-emerald-500/90 backdrop-blur-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">LIVE</span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {auction.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {auction.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-purple-500'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Item Details */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Item Details</h3>
              <p className="text-gray-300 mb-6">{auction.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Category</p>
                  <p className="font-medium mt-1">{auction.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Condition</p>
                  <p className="font-medium mt-1 capitalize">{auction.condition.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Starting Price</p>
                  <p className="font-medium mt-1">${auction.startingPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Watchers</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {auction.watchers.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{auction.sellerName}</p>
                  <p className="text-sm text-gray-400">Seller</p>
                </div>
                <div className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                  <Shield className="w-4 h-4" />
                  Verified
                </div>
              </div>
            </div>

            {/* Heap Visualizer */}
            {bids.length > 0 && (
              <HeapVisualizer
                heapArray={heapArray}
                treeVisualization={[]}
                operationLog={[]}
                stats={{
                  totalBids: bids.length,
                  heapHeight: Math.ceil(Math.log2(bids.length + 1)),
                  priceIncrease: auction.currentBid - auction.startingPrice,
                  priceIncreasePercent: Math.round(((auction.currentBid - auction.startingPrice) / auction.startingPrice) * 100),
                  averageBidIncrement: bids.length > 1 ? Math.round((auction.currentBid - auction.startingPrice) / bids.length) : 0,
                }}
                onClearLog={() => {}}
              />
            )}
          </motion.div>

          {/* Right: Bidding Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Auction Title */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {isTrending && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                  </span>
                )}
                {auction.status === 'ending_soon' && (
                  <span className="px-3 py-1 rounded-full bg-red-500 text-sm font-medium animate-pulse">
                    Ending Soon
                  </span>
                )}
                {auction.enableAntiSnipe && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Anti-Snipe
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/50 text-sm font-medium flex items-center gap-1">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Live Bidding
                </span>
              </div>
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

            {/* Error Message */}
            <AnimatePresence>
              {bidError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/50"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="font-semibold text-red-400">{bidError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current Bid Display */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-purple-500/30 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-sm text-gray-400">Current Highest Bid</p>
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300">
                  Real-time
                </span>
              </div>
              <motion.p
                key={auction.currentBid}
                initial={{ scale: 1.2, color: '#a78bfa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-5xl font-bold mb-4"
              >
                ${auction.currentBid.toLocaleString()}
              </motion.p>

              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-gray-400">{auction.bidCount} bids</span>
                <span className="text-gray-600">•</span>
                <span className={auction.reserveMet ? 'text-emerald-400' : 'text-yellow-400'}>
                  {auction.reserveMet ? 'Reserve Met ✓' : 'Reserve Not Met'}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Min Increment</p>
                  <p className="font-semibold text-purple-300">${auction.minIncrement}</p>
                </div>
                <div>
                  <p className="text-gray-400">Reserve Price</p>
                  <p className="font-semibold text-purple-300">${auction.reservePrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Buy Now</p>
                  <p className="font-semibold text-purple-300">
                    {auction.buyNowPrice > 0 ? `$${auction.buyNowPrice.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            <CountdownTimer endTime={auction.endTime.toISOString()} large />

            {/* Bid Button */}
            <BidButton
              currentBid={auction.currentBid}
              onBid={handleBid}
              disabled={!isLive || auction.sellerId === user?.id}
              minIncrement={auction.minIncrement}
            />

            {auction.sellerId === user?.id && (
              <p className="text-center text-yellow-400 text-sm">
                You cannot bid on your own auction
              </p>
            )}

            {!isAuthenticated && (
              <div className="text-center">
                <p className="text-gray-400 mb-2">Sign in to place a bid</p>
                <Link
                  to="/login"
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Sign in →
                </Link>
              </div>
            )}

            {/* Bid History Timeline */}
            <BidHistoryTimeline bids={formattedBidHistory} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
