/**
 * AdaptiveRuleEngine - Dynamic Auction Rule Management
 *
 * Automatically adjusts auction parameters based on real-time
 * fraud detection signals. Rules are prioritized and have cooldowns
 * to prevent over-triggering.
 *
 * Rule Actions:
 * - Extend auction time (anti-sniping)
 * - Increase minimum bid increment
 * - Require extra verification (MFA)
 * - Rate-limit bids per user
 * - Block suspicious users
 * - Void fraudulent bids
 */

import { FraudResult, RiskLevel } from './FraudDetector';
import { auditLogger } from './SignedAuditLogger';

export interface AuctionContext {
  auctionId: string;
  currentBid: number;
  minIncrement: number;
  endTime: Date;
  bidCount: number;
  uniqueBidders: number;
  latestBid: {
    bidderId: string;
    amount: number;
    timestamp: Date;
  } | null;
  fraudScore: number;
  fraudResult: FraudResult | null;
  requireMFA: boolean;
  rateLimit: number; // bids per minute per user
  blockedUsers: Set<string>;
  voidedBids: Set<string>;
}

export interface AdaptiveRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Lower = higher priority (processed first)
  cooldownMs: number; // Prevent rule from firing repeatedly
  condition: (ctx: AuctionContext) => boolean;
  action: (ctx: AuctionContext) => RuleActionResult;
  enabled: boolean;
}

export interface RuleActionResult {
  success: boolean;
  message: string;
  changes: Record<string, unknown>;
}

export interface AppliedRule {
  ruleId: string;
  name: string;
  timestamp: Date;
  changes: Record<string, unknown>;
  message: string;
}

export interface RuleEngineConfig {
  enableAntiSnipe: boolean;
  enableMinBidIncrease: boolean;
  enableMFARequired: boolean;
  enableRateLimiting: boolean;
  enableAutoBlock: boolean;
  enableAutoVoid: boolean;
}

export class AdaptiveRuleEngine {
  private rules: AdaptiveRule[] = [];
  private lastFired: Map<string, number> = new Map();
  private appliedRulesHistory: AppliedRule[] = [];
  private listeners: Array<(rule: AppliedRule, ctx: AuctionContext) => void> = [];

  constructor(config?: Partial<RuleEngineConfig>) {
    this.registerDefaultRules(config);
  }

  /**
   * Register the default adaptive rules
   */
  private registerDefaultRules(config?: Partial<RuleEngineConfig>): void {
    const cfg: RuleEngineConfig = {
      enableAntiSnipe: true,
      enableMinBidIncrease: true,
      enableMFARequired: true,
      enableRateLimiting: true,
      enableAutoBlock: true,
      enableAutoVoid: true,
      ...config,
    };

    // Anti-Snipe Rule (Priority 1 - Most Important)
    if (cfg.enableAntiSnipe) {
      this.registerRule({
        id: 'anti-snipe',
        name: 'Anti-Snipe Time Extension',
        description: 'Extends auction time when bid placed in last 60 seconds',
        priority: 1,
        cooldownMs: 30_000, // 30 seconds
        enabled: true,
        condition: (ctx) => {
          if (!ctx.latestBid) return false;
          const secsRemaining = (ctx.endTime.getTime() - Date.now()) / 1000;
          return secsRemaining <= 60 && secsRemaining > 0;
        },
        action: (ctx) => {
          const extensionMs = 120_000; // 2 minutes
          const oldEndTime = ctx.endTime;
          ctx.endTime = new Date(ctx.endTime.getTime() + extensionMs);

          return {
            success: true,
            message: `Auction extended by 2 minutes due to late bid`,
            changes: {
              oldEndTime: oldEndTime.toISOString(),
              newEndTime: ctx.endTime.toISOString(),
              extensionSeconds: 120,
            },
          };
        },
      });
    }

    // Minimum Bid Increase Rule (Priority 2)
    if (cfg.enableMinBidIncrease) {
      this.registerRule({
        id: 'min-bid-increase',
        name: 'Increase Minimum Bid Increment',
        description: 'Doubles minimum bid increment when fraud risk is HIGH',
        priority: 2,
        cooldownMs: 300_000, // 5 minutes
        enabled: true,
        condition: (ctx) => ctx.fraudScore >= 0.6,
        action: (ctx) => {
          const oldIncrement = ctx.minIncrement;
          ctx.minIncrement = Math.max(
            ctx.minIncrement * 2,
            ctx.currentBid * 0.05 // At least 5% of current bid
          );

          return {
            success: true,
            message: `Minimum bid increment increased due to elevated fraud risk`,
            changes: {
              oldMinIncrement: oldIncrement,
              newMinIncrement: ctx.minIncrement,
              fraudScore: ctx.fraudScore,
            },
          };
        },
      });
    }

    // Extra Verification Required Rule (Priority 3)
    if (cfg.enableMFARequired) {
      this.registerRule({
        id: 'extra-verification',
        name: 'Require Extra Verification',
        description: 'Requires MFA verification when fraud risk exceeds 0.7',
        priority: 3,
        cooldownMs: 600_000, // 10 minutes
        enabled: true,
        condition: (ctx) => ctx.fraudScore >= 0.7 && !ctx.requireMFA,
        action: (ctx) => {
          ctx.requireMFA = true;

          return {
            success: true,
            message: `Additional identity verification required due to security concerns`,
            changes: {
              requireMFA: true,
              fraudScore: ctx.fraudScore,
            },
          };
        },
      });
    }

    // Rate Limiting Rule (Priority 4)
    if (cfg.enableRateLimiting) {
      this.registerRule({
        id: 'rate-limit',
        name: 'Apply Bid Rate Limiting',
        description: 'Limits bids per minute when rapid bidding detected',
        priority: 4,
        cooldownMs: 60_000, // 1 minute
        enabled: true,
        condition: (ctx) => {
          if (!ctx.fraudResult) return false;
          return ctx.fraudResult.signals.bidVelocityAnomaly > 0.5;
        },
        action: (ctx) => {
          const oldLimit = ctx.rateLimit;
          ctx.rateLimit = Math.max(1, Math.floor(ctx.rateLimit / 2));

          return {
            success: true,
            message: `Bid rate limit reduced due to rapid bidding pattern`,
            changes: {
              oldRateLimit: oldLimit,
              newRateLimit: ctx.rateLimit,
            },
          };
        },
      });
    }

    // Auto-Block Rule (Priority 5)
    if (cfg.enableAutoBlock) {
      this.registerRule({
        id: 'auto-block',
        name: 'Auto-Block Suspicious User',
        description: 'Blocks user when fraud score reaches CRITICAL level',
        priority: 5,
        cooldownMs: 0, // No cooldown - immediate action
        enabled: true,
        condition: (ctx) => {
          if (!ctx.latestBid || !ctx.fraudResult) return false;
          return ctx.fraudResult.riskLevel === 'CRITICAL' &&
                 !ctx.blockedUsers.has(ctx.latestBid.bidderId);
        },
        action: (ctx) => {
          if (ctx.latestBid) {
            ctx.blockedUsers.add(ctx.latestBid.bidderId);

            return {
              success: true,
              message: `User blocked due to critical fraud risk`,
              changes: {
                blockedUserId: ctx.latestBid.bidderId,
                fraudScore: ctx.fraudScore,
                riskLevel: 'CRITICAL',
              },
            };
          }
          return { success: false, message: 'No bid to block', changes: {} };
        },
      });
    }

    // Auto-Void Rule (Priority 6)
    if (cfg.enableAutoVoid) {
      this.registerRule({
        id: 'auto-void',
        name: 'Auto-Void Fraudulent Bid',
        description: 'Automatically voids bids with CRITICAL fraud score',
        priority: 6,
        cooldownMs: 0, // No cooldown
        enabled: true,
        condition: (ctx) => {
          if (!ctx.latestBid || !ctx.fraudResult) return false;
          return ctx.fraudResult.riskLevel === 'CRITICAL';
        },
        action: (ctx) => {
          if (ctx.latestBid) {
            const bidId = `${ctx.latestBid.bidderId}-${ctx.latestBid.timestamp.getTime()}`;
            ctx.voidedBids.add(bidId);

            return {
              success: true,
              message: `Bid voided due to fraud detection`,
              changes: {
                voidedBidId: bidId,
                voidedAmount: ctx.latestBid.amount,
                reason: 'Critical fraud score',
              },
            };
          }
          return { success: false, message: 'No bid to void', changes: {} };
        },
      });
    }

    // Notify Admin Rule (Always enabled, lowest priority)
    this.registerRule({
      id: 'notify-admin',
      name: 'Notify Admin of High Risk',
      description: 'Sends alert to admin when fraud risk is HIGH or above',
      priority: 10,
      cooldownMs: 60_000, // 1 minute
      enabled: true,
      condition: (ctx) => ctx.fraudScore >= 0.6,
      action: (ctx) => {
        return {
          success: true,
          message: `Admin notified of elevated fraud risk`,
          changes: {
            alertType: ctx.fraudScore >= 0.8 ? 'CRITICAL' : 'HIGH',
            auctionId: ctx.auctionId,
            fraudScore: ctx.fraudScore,
          },
        };
      },
    });
  }

  /**
   * Register a custom rule
   */
  registerRule(rule: AdaptiveRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a rule by ID
   */
  unregisterRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Evaluate all rules against the current context
   */
  async evaluate(ctx: AuctionContext): Promise<AppliedRule[]> {
    const applied: AppliedRule[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastFiredAt = this.lastFired.get(rule.id) || 0;
      const cooldownPassed = Date.now() - lastFiredAt > rule.cooldownMs;

      if (!cooldownPassed) continue;

      // Check condition
      try {
        if (rule.condition(ctx)) {
          // Execute action
          const result = rule.action(ctx);

          if (result.success) {
            this.lastFired.set(rule.id, Date.now());

            const appliedRule: AppliedRule = {
              ruleId: rule.id,
              name: rule.name,
              timestamp: new Date(),
              changes: result.changes,
              message: result.message,
            };

            applied.push(appliedRule);
            this.appliedRulesHistory.push(appliedRule);

            // Log to audit trail
            await auditLogger.log({
              type: 'RULE_APPLIED',
              auctionId: ctx.auctionId,
              data: {
                ruleId: rule.id,
                ruleName: rule.name,
                changes: result.changes,
                message: result.message,
              },
            });

            // Notify listeners
            this.listeners.forEach(listener => listener(appliedRule, ctx));
          }
        }
      } catch (error) {
        console.error(`Rule ${rule.id} evaluation failed:`, error);
      }
    }

    return applied;
  }

  /**
   * Add a listener for rule applications
   */
  onRuleApplied(listener: (rule: AppliedRule, ctx: AuctionContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  /**
   * Get all registered rules
   */
  getRules(): AdaptiveRule[] {
    return [...this.rules];
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AdaptiveRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  /**
   * Get applied rules history
   */
  getAppliedHistory(): AppliedRule[] {
    return [...this.appliedRulesHistory];
  }

  /**
   * Get recent applied rules
   */
  getRecentApplied(count: number = 20): AppliedRule[] {
    return this.appliedRulesHistory.slice(-count);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalApplications: number;
    applicationsByRule: Record<string, number>;
  } {
    const applicationsByRule: Record<string, number> = {};
    for (const applied of this.appliedRulesHistory) {
      applicationsByRule[applied.ruleId] = (applicationsByRule[applied.ruleId] || 0) + 1;
    }

    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      totalApplications: this.appliedRulesHistory.length,
      applicationsByRule,
    };
  }

  /**
   * Reset all cooldowns
   */
  resetCooldowns(): void {
    this.lastFired.clear();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.appliedRulesHistory = [];
  }

  /**
   * Create initial auction context
   */
  static createContext(
    auctionId: string,
    currentBid: number,
    endTime: Date,
    minIncrement: number = 100
  ): AuctionContext {
    return {
      auctionId,
      currentBid,
      minIncrement,
      endTime,
      bidCount: 0,
      uniqueBidders: 0,
      latestBid: null,
      fraudScore: 0,
      fraudResult: null,
      requireMFA: false,
      rateLimit: 10, // 10 bids per minute default
      blockedUsers: new Set(),
      voidedBids: new Set(),
    };
  }
}

// Export singleton instance
export const ruleEngine = new AdaptiveRuleEngine();
