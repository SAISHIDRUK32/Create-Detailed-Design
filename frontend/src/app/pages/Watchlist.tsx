import { Link } from 'react-router';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { AuctionCard } from '../components/AuctionCard';
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';

export function Watchlist() {
  const { user, isAuthenticated } = useAuth();
  const { getUserWatchlist, toggleWatchlist, isWatching } = useAuctions();

  // Get watched auctions
  const watchedAuctions = user ? getUserWatchlist(user.id) : [];

  const handleToggleWatchlist = (id: string) => {
    toggleWatchlist(id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-20 md:pb-8 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Sign in to view your watchlist</h2>
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
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
            <h1 className="text-3xl font-bold">Watchlist</h1>
          </div>
          <p className="text-gray-400">
            {watchedAuctions.length} {watchedAuctions.length === 1 ? 'auction' : 'auctions'} you're watching
          </p>
        </motion.div>

        {/* Watchlist Grid */}
        {watchedAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {watchedAuctions.map((auction, index) => (
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 border border-white/10 text-center"
          >
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your watchlist is empty</h2>
            <p className="text-gray-400 mb-6">
              Start watching auctions to keep track of items you're interested in
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              Browse Auctions
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
