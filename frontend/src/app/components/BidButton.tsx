import { useState } from 'react';
import { motion } from 'motion/react';
import { Gavel, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface BidButtonProps {
  currentBid: number;
  onBid: (amount: number) => Promise<void>;
  disabled?: boolean;
  minIncrement?: number;
}

export function BidButton({ currentBid, onBid, disabled, minIncrement = 100 }: BidButtonProps) {
  const [bidAmount, setBidAmount] = useState(currentBid + minIncrement);
  const [state, setState] = useState<'idle' | 'hover' | 'active' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleBidClick = async () => {
    setState('active');
    setErrorMessage('');

    try {
      await onBid(bidAmount);
      setState('success');
      setTimeout(() => {
        setState('idle');
        setBidAmount(bidAmount + minIncrement);
      }, 2000);
    } catch (error) {
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to place bid');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const incrementBid = (amount: number) => {
    setBidAmount(Math.max(currentBid + minIncrement, bidAmount + amount));
  };

  const quickBidAmounts = [minIncrement, minIncrement * 2.5, minIncrement * 5, minIncrement * 10].map(Math.round);

  return (
    <div className="space-y-4">
      {/* Bid Amount Input */}
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
        <label className="block text-sm text-gray-400 mb-3">Your Bid Amount</label>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                if (!isNaN(newValue)) {
                  setBidAmount(newValue);
                }
              }}
              className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-2xl font-bold text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              disabled={disabled || state === 'active' || state === 'success'}
            />
          </div>
        </div>

        {/* Quick Bid Buttons */}
        <div className="flex gap-2 mb-4">
          {quickBidAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => incrementBid(amount)}
              className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
              disabled={disabled || state === 'active' || state === 'success'}
            >
              +${amount}
            </button>
          ))}
        </div>

        {bidAmount <= currentBid && (
          <p className="text-xs text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Bid must be at least ${(currentBid + minIncrement).toLocaleString()}
          </p>
        )}
      </div>

      {/* Place Bid Button */}
      <motion.button
        onClick={handleBidClick}
        disabled={disabled || bidAmount <= currentBid || state === 'active' || state === 'success'}
        onHoverStart={() => state === 'idle' && setState('hover')}
        onHoverEnd={() => state === 'hover' && setState('idle')}
        className={`w-full relative overflow-hidden rounded-xl p-4 font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
          state === 'success'
            ? 'bg-emerald-500'
            : state === 'error'
            ? 'bg-red-500'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
        }`}
        whileTap={{ scale: state === 'idle' || state === 'hover' ? 0.98 : 1 }}
      >
        {/* Animated background effect */}
        {state === 'hover' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{ opacity: 0.3 }}
          />
        )}

        {/* Button Content */}
        <span className="relative flex items-center justify-center gap-2">
          {state === 'idle' || state === 'hover' ? (
            <>
              <Gavel className="w-5 h-5" />
              Place Bid
            </>
          ) : state === 'active' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Placing Bid...
            </>
          ) : state === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Bid Placed Successfully!
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              Bid Failed
            </>
          )}
        </span>

        {/* Pressure effect animation */}
        {state === 'active' && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Error Message */}
      {errorMessage && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 text-center"
        >
          {errorMessage}
        </motion.p>
      )}

      {/* Bid Info */}
      <div className="text-center text-sm text-gray-400">
        <p>
          Minimum bid: <span className="text-white font-semibold">${(currentBid + minIncrement).toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
