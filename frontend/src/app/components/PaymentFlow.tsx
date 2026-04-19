/**
 * PaymentFlow - Stripe-Style Payment UI Component
 *
 * Handles the full payment flow including:
 * - Card input
 * - Processing states
 * - Success/Failure handling
 * - Retry logic display
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Lock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Shield,
} from 'lucide-react';

type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed' | 'retrying';

interface PaymentFlowProps {
  amount: number;
  auctionTitle: string;
  onPaymentComplete?: (success: boolean, paymentId?: string) => void;
  onCancel?: () => void;
}

export function PaymentFlow({
  amount,
  auctionTitle,
  onPaymentComplete,
  onCancel,
}: PaymentFlowProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ').slice(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('processing');

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Simulate success/failure (80% success rate for demo)
    if (Math.random() > 0.2) {
      setStatus('succeeded');
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onPaymentComplete?.(true, paymentId);
    } else {
      setStatus('failed');
      setError('Payment was declined. Please try again or use a different card.');
    }
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please contact support.');
      return;
    }

    setStatus('retrying');
    setRetryCount((prev) => prev + 1);

    // Exponential backoff delay
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Higher success rate on retry for demo
    if (Math.random() > 0.1) {
      setStatus('succeeded');
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onPaymentComplete?.(true, paymentId);
    } else {
      setStatus('failed');
      setError(`Retry ${retryCount + 1}/3 failed. ${3 - retryCount - 1} attempts remaining.`);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-slate-800/90 rounded-2xl border border-white/10 overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <h2 className="text-xl font-bold mb-1">Complete Payment</h2>
        <p className="text-sm text-gray-400">{auctionTitle}</p>
      </div>

      {/* Amount Display */}
      <div className="p-6 border-b border-white/10 text-center">
        <p className="text-sm text-gray-400 mb-1">Total Amount</p>
        <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ${amount.toLocaleString()}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>

      {/* Payment Form */}
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="p-6 space-y-4"
          >
            {/* Card Number */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Card Number</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>
            </div>

            {/* Expiry & CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">CVV</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    required
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Cardholder Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold transition-all"
            >
              Pay ${amount.toLocaleString()}
            </button>

            {/* Cancel */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </motion.form>
        )}

        {status === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center"
          >
            <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold">Processing Payment</p>
            <p className="text-sm text-gray-400 mt-1">Please wait...</p>
          </motion.div>
        )}

        {status === 'retrying' && (
          <motion.div
            key="retrying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center"
          >
            <RefreshCw className="w-16 h-16 text-yellow-400 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold">Retrying Payment</p>
            <p className="text-sm text-gray-400 mt-1">
              Attempt {retryCount + 1} of 3 (Backoff: {Math.pow(2, retryCount)}s)
            </p>
          </motion.div>
        )}

        {status === 'succeeded' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-xl font-bold text-emerald-400">Payment Successful!</p>
            <p className="text-sm text-gray-400 mt-2">
              Your purchase has been confirmed. You will receive an email confirmation shortly.
            </p>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            <div className="text-center mb-6">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-red-400">Payment Failed</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {retryCount < 3 && (
                <button
                  onClick={handleRetry}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Payment
                </button>
              )}
              <button
                onClick={() => {
                  setStatus('idle');
                  setError(null);
                }}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Use Different Card
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
