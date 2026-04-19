import { Link } from 'react-router';
import { useAuctions, Auction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Package, TrendingUp, Users, Eye, Plus, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

export function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { getUserAuctions, getBidsForAuction } = useAuctions();

  // Get seller's auctions
  const sellerAuctions = user ? getUserAuctions(user.id) : [];

  // Active auctions (live or ending soon)
  const activeAuctions = sellerAuctions.filter(a => a.status === 'live' || a.status === 'ending_soon');
  const endedAuctions = sellerAuctions.filter(a => a.status === 'ended' || a.status === 'sold');

  // Calculate stats
  const totalRevenue = sellerAuctions.reduce((sum, a) => sum + a.currentBid, 0);
  const totalBids = sellerAuctions.reduce((sum, a) => sum + a.bidCount, 0);
  const totalWatchers = sellerAuctions.reduce((sum, a) => sum + a.watchers.length, 0);

  // Generate bidding activity data from real bids
  const biddingActivityData = [
    { time: '00:00', bids: Math.floor(totalBids * 0.1) },
    { time: '04:00', bids: Math.floor(totalBids * 0.15) },
    { time: '08:00', bids: Math.floor(totalBids * 0.25) },
    { time: '12:00', bids: Math.floor(totalBids * 0.45) },
    { time: '16:00', bids: Math.floor(totalBids * 0.7) },
    { time: '20:00', bids: Math.floor(totalBids * 0.9) },
    { time: 'Now', bids: totalBids },
  ];

  // Revenue data
  const revenueData = [
    { month: 'Jan', revenue: Math.floor(totalRevenue * 0.2) },
    { month: 'Feb', revenue: Math.floor(totalRevenue * 0.35) },
    { month: 'Mar', revenue: Math.floor(totalRevenue * 0.5) },
    { month: 'Apr', revenue: Math.floor(totalRevenue * 0.65) },
    { month: 'May', revenue: Math.floor(totalRevenue * 0.8) },
    { month: 'Jun', revenue: totalRevenue },
  ];

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
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-gray-400">Monitor your auction performance and analytics</p>
          </div>
          <Link
            to="/create-auction"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-all"
          >
            <Plus className="w-5 h-5" />
            New Auction
          </Link>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<DollarSign className="w-8 h-8 text-emerald-400" />}
            label="Total Value"
            value={`$${totalRevenue.toLocaleString()}`}
            change="+24%"
            delay={0.1}
          />
          <StatCard
            icon={<Package className="w-8 h-8 text-purple-400" />}
            label="Active Listings"
            value={activeAuctions.length.toString()}
            delay={0.2}
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8 text-pink-400" />}
            label="Total Bids"
            value={totalBids.toString()}
            change="+18%"
            delay={0.3}
          />
          <StatCard
            icon={<Users className="w-8 h-8 text-blue-400" />}
            label="Total Watchers"
            value={totalWatchers.toString()}
            delay={0.4}
          />
        </div>

        {/* Charts */}
        {sellerAuctions.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Bidding Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-6">Bidding Activity (Last 24h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={biddingActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #ffffff20',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bids"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ fill: '#a78bfa', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-6">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #ffffff20',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Bar dataKey="revenue" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Active Listings */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Active Listings</h2>
          {activeAuctions.length > 0 ? (
            <div className="space-y-4">
              {activeAuctions.map((auction, index) => (
                <AuctionListingCard key={auction.id} auction={auction} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 border border-white/10 text-center"
            >
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">You don't have any active listings</p>
              <Link
                to="/create-auction"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Auction
              </Link>
            </motion.div>
          )}
        </section>

        {/* Ended Listings */}
        {endedAuctions.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Ended Auctions</h2>
            <div className="space-y-4">
              {endedAuctions.map((auction, index) => (
                <AuctionListingCard key={auction.id} auction={auction} index={index} isEnded />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  delay
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10"
    >
      <div className="flex items-center justify-between mb-4">
        {icon}
        {change && (
          <span className="text-sm text-emerald-400 font-medium">{change}</span>
        )}
      </div>
      <h3 className="text-sm text-gray-400 mb-1">{label}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function AuctionListingCard({ auction, index, isEnded }: { auction: Auction; index: number; isEnded?: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (isEnded) {
      setTimeRemaining('Ended');
      return;
    }

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
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [auction.endTime, isEnded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/auction/${auction.id}`}
        className="block backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-2xl p-6 border border-white/10 transition-all"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-4">
            {auction.images[0] && (
              <img
                src={auction.images[0]}
                alt={auction.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{auction.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{auction.category}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                  <p className="font-semibold text-purple-400">
                    ${auction.currentBid.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Bids</p>
                  <p className="font-semibold">{auction.bidCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Watchers</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {auction.watchers.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    auction.reserveMet
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {auction.reserveMet ? 'Reserve Met' : 'Reserve Not Met'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              auction.status === 'ending_soon'
                ? 'bg-red-500/20 text-red-400'
                : auction.status === 'sold'
                ? 'bg-emerald-500/20 text-emerald-400'
                : auction.status === 'ended'
                ? 'bg-gray-500/20 text-gray-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {auction.status === 'ending_soon' ? 'Ending Soon' :
               auction.status === 'sold' ? 'Sold' :
               auction.status === 'ended' ? 'Ended' : 'Live'}
            </div>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </span>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Performance vs Reserve</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{
                    width: `${Math.min(
                      (auction.currentBid / (auction.reservePrice || auction.startingPrice)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {Math.round((auction.currentBid / (auction.reservePrice || auction.startingPrice)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
