/**
 * TrustScoreBadge - Visual Trust/Risk Score Indicator
 *
 * Displays user or bid trust scores with color-coded indicators
 * and optional detailed breakdown on hover/click.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  User,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface TrustScoreBadgeProps {
  score: number; // 0-100 (higher = more trustworthy)
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  details?: {
    accountAge?: number; // days
    totalBids?: number;
    winRate?: number; // 0-1
    disputeRate?: number; // 0-1
    verificationLevel?: 'none' | 'email' | 'phone' | 'id' | 'full';
  };
}

export function TrustScoreBadge({
  score,
  label,
  size = 'md',
  showDetails = false,
  details,
}: TrustScoreBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine trust level
  const getTrustLevel = () => {
    if (score >= 90) return { level: 'Excellent', color: 'emerald', Icon: ShieldCheck };
    if (score >= 70) return { level: 'Good', color: 'green', Icon: Shield };
    if (score >= 50) return { level: 'Fair', color: 'yellow', Icon: Shield };
    if (score >= 30) return { level: 'Low', color: 'orange', Icon: ShieldAlert };
    return { level: 'Critical', color: 'red', Icon: ShieldX };
  };

  const trust = getTrustLevel();
  const Icon = trust.Icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };

  const colors = colorClasses[trust.color];

  return (
    <div className="relative inline-block">
      <motion.button
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-1.5 rounded-full border
          ${colors.bg} ${colors.text} ${colors.border}
          ${sizeClasses[size]}
          ${showDetails ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}
          transition-colors
        `}
        whileHover={showDetails ? { scale: 1.02 } : {}}
        whileTap={showDetails ? { scale: 0.98 } : {}}
      >
        <Icon className={iconSizes[size]} />
        <span className="font-medium">
          {label || `${score}%`}
        </span>
        {showDetails && (
          <ChevronDown className={`${iconSizes[size]} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </motion.button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && details && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 z-50 w-64 backdrop-blur-xl bg-slate-800/95 border border-white/10 rounded-xl p-4 shadow-xl"
          >
            {/* Score Circle */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`relative w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center`}>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-white/10"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${score * 1.76} 176`}
                    className={colors.text}
                  />
                </svg>
                <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
              </div>
              <div>
                <div className={`font-semibold ${colors.text}`}>{trust.level}</div>
                <div className="text-xs text-gray-400">Trust Score</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {details.accountAge !== undefined && (
                <DetailRow
                  icon={Clock}
                  label="Account Age"
                  value={`${details.accountAge} days`}
                  status={details.accountAge > 180 ? 'good' : details.accountAge > 30 ? 'fair' : 'low'}
                />
              )}
              {details.totalBids !== undefined && (
                <DetailRow
                  icon={TrendingUp}
                  label="Total Bids"
                  value={details.totalBids.toString()}
                  status={details.totalBids > 50 ? 'good' : details.totalBids > 10 ? 'fair' : 'low'}
                />
              )}
              {details.winRate !== undefined && (
                <DetailRow
                  icon={User}
                  label="Win Rate"
                  value={`${(details.winRate * 100).toFixed(0)}%`}
                  status={details.winRate > 0.3 ? 'good' : details.winRate > 0.1 ? 'fair' : 'low'}
                />
              )}
              {details.disputeRate !== undefined && (
                <DetailRow
                  icon={AlertTriangle}
                  label="Dispute Rate"
                  value={`${(details.disputeRate * 100).toFixed(1)}%`}
                  status={details.disputeRate < 0.02 ? 'good' : details.disputeRate < 0.1 ? 'fair' : 'low'}
                />
              )}
              {details.verificationLevel && (
                <DetailRow
                  icon={Shield}
                  label="Verification"
                  value={details.verificationLevel.charAt(0).toUpperCase() + details.verificationLevel.slice(1)}
                  status={
                    details.verificationLevel === 'full' || details.verificationLevel === 'id'
                      ? 'good'
                      : details.verificationLevel === 'phone'
                      ? 'fair'
                      : 'low'
                  }
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  status: 'good' | 'fair' | 'low';
}) {
  const statusColors = {
    good: 'text-emerald-400',
    fair: 'text-yellow-400',
    low: 'text-red-400',
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <span className={statusColors[status]}>{value}</span>
    </div>
  );
}

/**
 * Inline version for compact displays
 */
export function TrustScoreInline({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <span className={`font-medium ${getColor()}`}>
      {score}%
    </span>
  );
}
