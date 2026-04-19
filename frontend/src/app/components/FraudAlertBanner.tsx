/**
 * FraudAlertBanner - Real-time Fraud Detection Alert Display
 *
 * Shows fraud alerts to admins with risk level indicators,
 * alert details, and action buttons.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldX,
  X,
  Eye,
  Ban,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { FraudAlert, RiskLevel } from '../dsa/FraudDetector';

interface FraudAlertBannerProps {
  alerts: FraudAlert[];
  onDismiss?: (alertId: string) => void;
  onResolve?: (alertId: string, action: 'approve' | 'block' | 'void') => void;
  onViewDetails?: (alert: FraudAlert) => void;
  isAdmin?: boolean;
}

const riskConfig: Record<RiskLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof AlertTriangle;
  label: string;
}> = {
  LOW: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Shield,
    label: 'Low Risk',
  },
  MEDIUM: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Shield,
    label: 'Medium Risk',
  },
  HIGH: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: ShieldAlert,
    label: 'High Risk',
  },
  CRITICAL: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: ShieldX,
    label: 'Critical Risk',
  },
};

export function FraudAlertBanner({
  alerts,
  onDismiss,
  onResolve,
  onViewDetails,
  isAdmin = false,
}: FraudAlertBannerProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  if (alerts.length === 0) return null;

  // Sort by risk level (critical first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.riskLevel] - order[b.riskLevel];
  });

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {sortedAlerts.map((alert) => {
          const config = riskConfig[alert.riskLevel];
          const Icon = config.icon;
          const isExpanded = expandedAlert === alert.id;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              {/* Main Alert Bar */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-400">
                          Score: {(alert.riskScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        Auction #{alert.auctionId.slice(0, 8)} • Bidder #{alert.bidderId.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.detectedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      {/* Signal Breakdown */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Detection Signals
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(alert.signals).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                            >
                              <span className="text-xs text-gray-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className={`text-xs font-medium ${
                                value > 0.5 ? 'text-red-400' :
                                value > 0.3 ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Admin Actions */}
                      {isAdmin && onResolve && !alert.resolved && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onResolve(alert.id, 'approve')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => onResolve(alert.id, 'block')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                            Block User
                          </button>
                          <button
                            onClick={() => onResolve(alert.id, 'void')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Void Bid
                          </button>
                        </div>
                      )}

                      {alert.resolved && (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Resolved by {alert.resolvedBy}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact version for non-admin users
 */
export function FraudAlertCompact({ riskLevel, message }: { riskLevel: RiskLevel; message: string }) {
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
    >
      <Icon className={`w-5 h-5 ${config.color}`} />
      <span className="text-sm text-gray-300">{message}</span>
    </motion.div>
  );
}
