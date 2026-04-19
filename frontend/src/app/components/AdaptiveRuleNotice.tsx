/**
 * AdaptiveRuleNotice - Real-time Rule Change Notifications
 *
 * Displays notifications when auction rules change dynamically
 * due to fraud detection or other triggers.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  TrendingUp,
  Shield,
  AlertTriangle,
  X,
  Info,
  Zap,
} from 'lucide-react';
import type { AppliedRule } from '../dsa/AdaptiveRuleEngine';

interface AdaptiveRuleNoticeProps {
  rules: AppliedRule[];
  onDismiss?: (ruleId: string) => void;
  autoHideMs?: number;
  position?: 'top' | 'bottom';
}

const ruleIcons: Record<string, typeof Clock> = {
  'anti-snipe': Clock,
  'min-bid-increase': TrendingUp,
  'extra-verification': Shield,
  'rate-limit': Zap,
  'auto-block': AlertTriangle,
  'auto-void': X,
  'notify-admin': Info,
};

const ruleColors: Record<string, { bg: string; border: string; text: string }> = {
  'anti-snipe': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  'min-bid-increase': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  'extra-verification': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  'rate-limit': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  'auto-block': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  'auto-void': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  'notify-admin': { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
};

export function AdaptiveRuleNotice({
  rules,
  onDismiss,
  autoHideMs = 10000,
  position = 'top',
}: AdaptiveRuleNoticeProps) {
  const [visibleRules, setVisibleRules] = useState<AppliedRule[]>(rules);

  useEffect(() => {
    setVisibleRules(rules);
  }, [rules]);

  // Auto-hide after timeout
  useEffect(() => {
    if (autoHideMs <= 0) return;

    const timers = visibleRules.map((rule) => {
      return setTimeout(() => {
        setVisibleRules((prev) => prev.filter((r) => r.ruleId !== rule.ruleId));
      }, autoHideMs);
    });

    return () => timers.forEach(clearTimeout);
  }, [visibleRules, autoHideMs]);

  const handleDismiss = (ruleId: string) => {
    setVisibleRules((prev) => prev.filter((r) => r.ruleId !== ruleId));
    onDismiss?.(ruleId);
  };

  if (visibleRules.length === 0) return null;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-50 space-y-2 max-w-md w-full px-4 ${
        position === 'top' ? 'top-20' : 'bottom-24'
      }`}
    >
      <AnimatePresence>
        {visibleRules.map((rule) => {
          const Icon = ruleIcons[rule.ruleId] || Info;
          const colors = ruleColors[rule.ruleId] || ruleColors['notify-admin'];

          return (
            <motion.div
              key={`${rule.ruleId}-${rule.timestamp.getTime()}`}
              initial={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.95 }}
              className={`
                backdrop-blur-xl rounded-xl border shadow-lg
                ${colors.bg} ${colors.border}
              `}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-semibold ${colors.text}`}>
                        {rule.name}
                      </h4>
                      <button
                        onClick={() => handleDismiss(rule.ruleId)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">
                      {rule.message}
                    </p>

                    {/* Show specific changes */}
                    {rule.changes && Object.keys(rule.changes).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rule.changes.extensionSeconds && (
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                            +{rule.changes.extensionSeconds as number}s added
                          </span>
                        )}
                        {rule.changes.newMinIncrement && (
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                            Min bid: ${(rule.changes.newMinIncrement as number).toLocaleString()}
                          </span>
                        )}
                        {rule.changes.requireMFA && (
                          <span className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-300">
                            MFA Required
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar for auto-hide */}
              {autoHideMs > 0 && (
                <motion.div
                  className={`h-0.5 ${colors.text.replace('text-', 'bg-')}`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: autoHideMs / 1000, ease: 'linear' }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single rule notice for inline display
 */
export function RuleNoticeInline({ rule }: { rule: AppliedRule }) {
  const Icon = ruleIcons[rule.ruleId] || Info;
  const colors = ruleColors[rule.ruleId] || ruleColors['notify-admin'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 p-2 rounded-lg ${colors.bg} border ${colors.border}`}
    >
      <Icon className={`w-4 h-4 ${colors.text}`} />
      <span className="text-sm text-gray-300">{rule.message}</span>
    </motion.div>
  );
}

/**
 * Mini badge showing active rules count
 */
export function ActiveRulesBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs text-yellow-400"
    >
      <Zap className="w-3 h-3" />
      {count} Active Rule{count !== 1 ? 's' : ''}
    </motion.span>
  );
}
