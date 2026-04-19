


import { useState, useMemo } from 'react';
import { AuctionCard } from '../components/AuctionCard';
import { FiltersPanel, FilterState } from '../components/FiltersPanel';
import { useAuctions } from '../context/AuctionContext';
import { Sparkles, TrendingUp, Plus, Radio, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const { liveAuctions, toggleWatchlist, isWatching } = useAuctions();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<FilterState | null>(null);

  // Apply filters to auctions
  const filteredAuctions = useMemo(() => {
    let filtered = [...liveAuctions];

    if (!filters) return filtered;

    // Filter by category
    if (!filters.categories.includes('All')) {
      filtered = filtered.filter(auction =>
        filters.categories.includes(auction.category)
      );
    }

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(auction => {
        const matchesLive = filters.status.includes('Live') && auction.status === 'live';
        const matchesEndingSoon = filters.status.includes('Ending Soon') && auction.status === 'ending_soon';
        const matchesReserveMet = filters.status.includes('Reserve Met') && auction.reserveMet;
        const matchesTrending = filters.status.includes('Trending') && auction.bidCount > 30;
        return matchesLive || matchesEndingSoon || matchesReserveMet || matchesTrending;
      });
    }

    // Filter by price
    filtered = filtered.filter(
      auction => auction.currentBid <= filters.priceRange[1]
    );

    // Sort
    switch (filters.sortBy) {
      case 'Ending Soon':
        filtered.sort((a, b) =>
          new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
        );
        break;
      case 'Newest':
        filtered.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        break;
      case 'Price: Low to High':
        filtered.sort((a, b) => a.currentBid - b.currentBid);
        break;
      case 'Price: High to Low':
        filtered.sort((a, b) => b.currentBid - a.currentBid);
        break;
      case 'Most Bids':
        filtered.sort((a, b) => b.bidCount - a.bidCount);
        break;
    }

    return filtered;
  }, [liveAuctions, filters]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleToggleWatchlist = (id: string) => {
    toggleWatchlist(id);
  };

  // Get trending auctions (more than 30 bids)
  const trendingAuctions = liveAuctions.filter(a => a.bidCount > 30).slice(0, 3);

  // Get live streaming auctions
  const liveStreamAuctions = liveAuctions.filter(a => a.isLiveStream);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                A live, intelligent
              </span>
              <br />
              <span className="text-white">auction arena</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-8">
              Real-time bidding powered by AI. Fair, fast, and transparent.
            </p>
            {isAuthenticated && (
              <Link
                to="/create-auction"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your Auction
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Live Now Section */}
      {liveStreamAuctions.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Radio className="w-6 h-6 text-red-500" />
            </motion.div>
            <h2 className="text-2xl font-bold">Live Now</h2>
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-sm rounded-full animate-pulse">
              {liveStreamAuctions.length} streaming
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveStreamAuctions.map((auction, index) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/live/${auction.id}/watch`}>
                  <div className="relative group cursor-pointer">
                    {/* Live stream card with special styling */}
                    <div className="relative rounded-2xl overflow-hidden border-2 border-red-500/30 bg-slate-800/50 hover:border-red-500/60 transition-all">
                      {/* Image */}
                      <div className="aspect-video relative">
                        {auction.images[0] ? (
                          <img
                            src={auction.images[0]}
                            alt={auction.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-pink-900/40" />
                        )}

                        {/* Dark overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* LIVE badge */}
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full text-xs font-bold"
                        >
                          <div className="w-2 h-2 bg-white rounded-full" />
                          LIVE
                        </motion.div>

                        {/* Viewer count */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs">
                          <Video className="w-3.5 h-3.5 text-red-400" />
                          {Math.floor(Math.random() * 50) + 10} watching
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">{auction.title}</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-300">Current Bid</p>
                              <p className="text-xl font-bold text-purple-300">${auction.currentBid.toLocaleString()}</p>
                            </div>
                            <div className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-sm font-bold group-hover:from-red-500 group-hover:to-pink-500 transition-all">
                              Watch Live →
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      {trendingAuctions.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-bold">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingAuctions.map((auction, index) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AuctionCard
                  auction={auction}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatching(auction.id)}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* All Auctions Section */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold">Live Auctions</h2>
            <span className="ml-2 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
              {liveAuctions.length} active
            </span>
          </div>
          <FiltersPanel onFilterChange={handleFilterChange} />
        </div>

        {filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map((auction, index) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AuctionCard
                  auction={auction}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatching(auction.id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No auctions match your filters</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filter settings</p>
          </div>
        )}
      </section>
    </div>
  );
}
