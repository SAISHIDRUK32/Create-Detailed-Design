import { Link } from 'react-router';
import { useAuctions, Auction, Bid } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Clock, CheckCircle, XCircle, Eye, ShoppingBag, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function BuyerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { getUserBids, getUserWatchlist, getAuction, auctions } = useAuctions();

  // Get user's bids
  const userBids = user ? getUserBids(user.id) : [];

  // Get auctions for each bid
  const activeBids = userBids.map(bid => ({
    ...bid,
    auction: getAuction(bid.auctionId),
  })).filter(b => b.auction);

  // Get watched auctions
  const watchedAuctions = user ? getUserWatchlist(user.id) : [];

  // Calculate stats
  const winningBids = activeBids.filter(b => b.status === 'winning');
  const outbidBids = activeBids.filter(b => b.status === 'outbid');

  // Get won auctions
  const wonAuctions = auctions.filter(
    a => a.status === 'sold' && a.winnerId === user?.id
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-20 md:pb-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to access your dashboard</h2>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Buyer Dashboard</h1>
          <p className="text-gray-400">Track your bids and manage your watchlist</p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold">{activeBids.length}</span>
            </div>
            <h3 className="text-sm text-gray-400">Active Bids</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 text-pink-400" />
              <span className="text-2xl font-bold">{watchedAuctions.length}</span>
            </div>
            <h3 className="text-sm text-gray-400">Watching</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold">{winningBids.length}</span>
            </div>
            <h3 className="text-sm text-gray-400">Leading</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold">{wonAuctions.length}</span>
            </div>
            <h3 className="text-sm text-gray-400">Won</h3>
          </motion.div>
        </div>

        {/* Active Bids */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Active Bids</h2>

          {activeBids.length > 0 ? (
            <div className="space-y-4">
              {activeBids.map((bid, index) => (
                <BidCard key={bid.id} bid={bid} auction={bid.auction!} index={index} />
              ))}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">You haven't placed any bids yet</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
              >
                Browse Auctions
              </Link>
            </div>
          )}
        </section>

        {/* Won Auctions */}
        {wonAuctions.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">Won Auctions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wonAuctions.map((auction, index) => (
                <WonAuctionCard key={auction.id} auction={auction} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Watchlist */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Watchlist</h2>
            <Link to="/watchlist" className="text-purple-400 hover:text-purple-300 text-sm">
              View All →
            </Link>
          </div>

          {watchedAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchedAuctions.slice(0, 3).map((auction, index) => (
                <WatchlistCard key={auction.id} auction={auction} index={index} />
              ))}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
              <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Your watchlist is empty</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BidCard({ bid, auction, index }: { bid: Bid; auction: Auction; index: number }) {
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

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [auction.endTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/auction/${auction.id}`}
        className="block backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl p-6 border border-white/10 transition-all group"
      >
        <div className="flex items-start gap-4">
          {auction.images[0] && (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold group-hover:text-purple-400 transition-colors">
                  {auction.title}
                </h3>
                <p className="text-sm text-gray-400">{auction.category}</p>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                bid.status === 'winning'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {bid.status === 'winning' ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Leading
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Outbid
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 mt-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Your Bid</p>
                <p className="font-semibold">${bid.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                <p className="font-semibold text-purple-400">${auction.currentBid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Time Left</p>
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeRemaining}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function WonAuctionCard({ auction, index }: { auction: Auction; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/auction/${auction.id}`}
        className="block backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 hover:from-yellow-500/20 hover:to-amber-500/10 rounded-2xl overflow-hidden border border-yellow-500/20 transition-all group"
      >
        <div className="aspect-video overflow-hidden relative">
          {auction.images[0] ? (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-slate-800" />
          )}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Won
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 group-hover:text-yellow-400 transition-colors">
            {auction.title}
          </h3>
          <p className="text-sm text-gray-400 mb-3">{auction.category}</p>
          <div className="flex items-center justify-between">
            <span className="text-yellow-400 font-semibold">
              ${auction.currentBid.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">Final Price</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function WatchlistCard({ auction, index }: { auction: Auction; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/auction/${auction.id}`}
        className="block backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden border border-white/10 transition-all group"
      >
        <div className="aspect-video overflow-hidden">
          {auction.images[0] ? (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-slate-800" />
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition-colors">
            {auction.title}
          </h3>
          <p className="text-sm text-gray-400 mb-3">{auction.category}</p>
          <div className="flex items-center justify-between">
            <span className="text-purple-400 font-semibold">
              ${auction.currentBid.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">{auction.bidCount} bids</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
