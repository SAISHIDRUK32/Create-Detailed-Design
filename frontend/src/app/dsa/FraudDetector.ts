/**
 * FraudDetector - AI-Powered Fraud Detection System
 *
 * Analyzes bidding behavior using feature vectors and weighted signals
 * to detect various fraud patterns:
 * - Shill bidding (fake bids to inflate price)
 * - Collusion rings (bidders working together)
 * - Last-second sniping (unfair timing exploitation)
 * - Bid washing (resetting auction momentum)
 * - Sockpuppet accounts (multiple fake identities)
 */

import { BidderGraph, CollusionRing } from './BidderGraph';

export interface BidFeatureVector {
  // Temporal features
  timeSinceLastBid: number;        // seconds
  bidVelocity: number;             // bids/minute in last 5 min
  timeToAuctionEnd: number;        // seconds remaining
  hourOfDay: number;               // 0-23

  // Price features
  bidIncrement: number;            // absolute $ increase
  bidIncrementPct: number;         // % increase over previous bid
  priceToEstimateRatio: number;    // bid / estimated fair value

  // Behavioral features
  userTotalBids: number;           // lifetime bids by this user
  userWinRate: number;             // % of auctions won
  bidRetractionRate: number;       // % of bids retracted
  accountAgeDays: number;          // days since registration

  // Network features
  sharedIPCount: number;           // # of users sharing IP
  sharedDeviceFingerprint: number; // # matching device fingerprints
  interactionFrequency: number;    // # times bid against same users

  // Auction context
  auctionBidCount: number;         // total bids on this auction
  uniqueBidderCount: number;       // unique bidders
  reserveMetRatio: number;         // current_bid / reserve_price
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FraudAction = 'ALLOW' | 'FLAG_FOR_MONITORING' | 'APPLY_ADAPTIVE_RULES' | 'BLOCK_AND_REVIEW';

export interface FraudResult {
  riskScore: number;               // 0.0 - 1.0
  riskLevel: RiskLevel;
  signals: Record<string, number>;
  recommendedAction: FraudAction;
  reasons: string[];
  timestamp: Date;
}

export interface ShillBiddingResult {
  isDetected: boolean;
  confidence: number;
  patterns: string[];
}

export interface SnipingResult {
  isSniping: boolean;
  secondsRemaining: number;
  action: 'NONE' | 'EXTEND_AUCTION';
  extensionSeconds: number;
}

export interface FraudAlert {
  id: string;
  auctionId: string;
  bidderId: string;
  bidId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: Record<string, number>;
  actionTaken: FraudAction;
  detectedAt: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
}

export class FraudDetector {
  private bidderGraph: BidderGraph;
  private bidHistory: Map<string, Array<{ amount: number; timestamp: Date; bidderId: string }>> = new Map();
  private userStats: Map<string, {
    totalBids: number;
    wins: number;
    retractions: number;
    registeredAt: Date;
    lastBidTime: Date | null;
    ipAddresses: Set<string>;
    deviceFingerprints: Set<string>;
  }> = new Map();

  private weights: Record<string, number> = {
    bidVelocityAnomaly: 0.20,
    pricePatternAnomaly: 0.15,
    timingAnomaly: 0.15,
    networkAnomaly: 0.25,    // Highest weight — hardest to fake
    accountTrustScore: 0.15,
    historicalPattern: 0.10,
  };

  constructor() {
    this.bidderGraph = new BidderGraph();
  }

  /**
   * Initialize or get user stats
   */
  private getOrCreateUserStats(userId: string) {
    if (!this.userStats.has(userId)) {
      this.userStats.set(userId, {
        totalBids: 0,
        wins: 0,
        retractions: 0,
        registeredAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastBidTime: null,
        ipAddresses: new Set(),
        deviceFingerprints: new Set(),
      });
    }
    return this.userStats.get(userId)!;
  }

  /**
   * Record a bid for analysis
   */
  recordBid(
    auctionId: string,
    bidderId: string,
    amount: number,
    metadata?: { ipAddress?: string; deviceFingerprint?: string }
  ): void {
    // Update bid history
    if (!this.bidHistory.has(auctionId)) {
      this.bidHistory.set(auctionId, []);
    }
    const history = this.bidHistory.get(auctionId)!;
    history.push({ amount, timestamp: new Date(), bidderId });

    // Update user stats
    const userStats = this.getOrCreateUserStats(bidderId);
    userStats.totalBids++;
    userStats.lastBidTime = new Date();
    if (metadata?.ipAddress) userStats.ipAddresses.add(metadata.ipAddress);
    if (metadata?.deviceFingerprint) userStats.deviceFingerprints.add(metadata.deviceFingerprint);

    // Update bidder graph for collusion detection
    const recentBidders = new Set(history.slice(-10).map(b => b.bidderId));
    for (const otherBidder of recentBidders) {
      if (otherBidder !== bidderId) {
        this.bidderGraph.addInteraction(bidderId, otherBidder, auctionId);
      }
    }
  }

  /**
   * Build feature vector for a bid
   */
  buildFeatureVector(
    bidderId: string,
    auctionId: string,
    bidAmount: number,
    auctionEndTime: Date,
    reservePrice: number,
    estimatedValue: number
  ): BidFeatureVector {
    const userStats = this.getOrCreateUserStats(bidderId);
    const history = this.bidHistory.get(auctionId) || [];
    const now = new Date();

    // Calculate temporal features
    const lastBid = history.length > 0 ? history[history.length - 1] : null;
    const timeSinceLastBid = lastBid
      ? (now.getTime() - lastBid.timestamp.getTime()) / 1000
      : 999999;

    // Bid velocity (bids in last 5 minutes)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentBids = history.filter(b => b.timestamp > fiveMinAgo);
    const bidVelocity = recentBids.length / 5;

    // Price features
    const prevBid = lastBid?.amount || 0;
    const bidIncrement = bidAmount - prevBid;
    const bidIncrementPct = prevBid > 0 ? (bidIncrement / prevBid) * 100 : 0;

    // Unique bidders
    const uniqueBidders = new Set(history.map(b => b.bidderId)).size;

    // Network features - count users sharing IP/device
    let sharedIPCount = 0;
    let sharedDeviceCount = 0;
    for (const [, stats] of this.userStats) {
      for (const ip of userStats.ipAddresses) {
        if (stats.ipAddresses.has(ip)) sharedIPCount++;
      }
      for (const fp of userStats.deviceFingerprints) {
        if (stats.deviceFingerprints.has(fp)) sharedDeviceCount++;
      }
    }

    // Get interaction frequency from bidder graph
    const graphStats = this.bidderGraph.getBidderStats(bidderId);

    return {
      timeSinceLastBid,
      bidVelocity,
      timeToAuctionEnd: (auctionEndTime.getTime() - now.getTime()) / 1000,
      hourOfDay: now.getHours(),

      bidIncrement,
      bidIncrementPct,
      priceToEstimateRatio: bidAmount / estimatedValue,

      userTotalBids: userStats.totalBids,
      userWinRate: userStats.wins / Math.max(1, userStats.totalBids),
      bidRetractionRate: userStats.retractions / Math.max(1, userStats.totalBids),
      accountAgeDays: (now.getTime() - userStats.registeredAt.getTime()) / (24 * 60 * 60 * 1000),

      sharedIPCount,
      sharedDeviceFingerprint: sharedDeviceCount,
      interactionFrequency: graphStats?.totalInteractions || 0,

      auctionBidCount: history.length,
      uniqueBidderCount: uniqueBidders,
      reserveMetRatio: bidAmount / reservePrice,
    };
  }

  /**
   * Compute comprehensive fraud risk score
   */
  computeRiskScore(features: BidFeatureVector): FraudResult {
    const signals: Record<string, number> = {
      bidVelocityAnomaly: this.checkBidVelocity(features),
      pricePatternAnomaly: this.checkPricePattern(features),
      timingAnomaly: this.checkTimingPattern(features),
      networkAnomaly: this.checkNetworkSignals(features),
      accountTrustScore: this.checkAccountTrust(features),
      historicalPattern: this.checkHistory(features),
    };

    let totalScore = 0;
    for (const [key, weight] of Object.entries(this.weights)) {
      totalScore += signals[key] * weight;
    }

    const riskScore = Math.min(1.0, totalScore);
    const riskLevel = this.classifyRisk(riskScore);
    const recommendedAction = this.getAction(riskScore);
    const reasons = this.generateReasons(signals, features);

    return {
      riskScore,
      riskLevel,
      signals,
      recommendedAction,
      reasons,
      timestamp: new Date(),
    };
  }

  private checkBidVelocity(features: BidFeatureVector): number {
    let score = 0;

    // Unusually rapid bidding
    if (features.bidVelocity > 5) score += 0.5;
    else if (features.bidVelocity > 3) score += 0.3;
    else if (features.bidVelocity > 2) score += 0.1;

    // Extremely quick successive bid
    if (features.timeSinceLastBid < 2) score += 0.4;
    else if (features.timeSinceLastBid < 5) score += 0.2;

    return Math.min(1, score);
  }

  private checkPricePattern(features: BidFeatureVector): number {
    let score = 0;

    // Minimal increment (typical of shill bidding)
    if (features.bidIncrementPct > 0 && features.bidIncrementPct < 2) score += 0.3;

    // Price way above estimate (potential money laundering)
    if (features.priceToEstimateRatio > 2) score += 0.4;

    // Consistent minimal bidding pattern
    if (features.bidIncrementPct > 0 && features.bidIncrementPct < 2 &&
        features.userTotalBids > 5) score += 0.2;

    return Math.min(1, score);
  }

  private checkTimingPattern(features: BidFeatureVector): number {
    let score = 0;

    // Last-second sniping
    if (features.timeToAuctionEnd < 10) score += 0.5;
    else if (features.timeToAuctionEnd < 30) score += 0.3;
    else if (features.timeToAuctionEnd < 60) score += 0.15;

    // Unusual hours (less reliable but worth noting)
    if (features.hourOfDay >= 2 && features.hourOfDay <= 5) score += 0.1;

    return Math.min(1, score);
  }

  private checkNetworkSignals(features: BidFeatureVector): number {
    let score = 0;

    // Shared IP with multiple accounts
    if (features.sharedIPCount > 3) score += 0.5;
    else if (features.sharedIPCount > 1) score += 0.2;

    // Shared device fingerprint
    if (features.sharedDeviceFingerprint > 2) score += 0.4;
    else if (features.sharedDeviceFingerprint > 1) score += 0.2;

    // High interaction frequency (potential collusion)
    if (features.interactionFrequency > 20) score += 0.3;
    else if (features.interactionFrequency > 10) score += 0.15;

    return Math.min(1, score);
  }

  private checkAccountTrust(features: BidFeatureVector): number {
    let score = 0;

    // New account
    if (features.accountAgeDays < 7) score += 0.4;
    else if (features.accountAgeDays < 30) score += 0.2;

    // Low activity account suddenly active
    if (features.userTotalBids < 5 && features.bidVelocity > 2) score += 0.3;

    // High bid retraction rate
    if (features.bidRetractionRate > 0.3) score += 0.3;
    else if (features.bidRetractionRate > 0.1) score += 0.1;

    return Math.min(1, score);
  }

  private checkHistory(features: BidFeatureVector): number {
    let score = 0;

    // User with zero wins but many bids (potential shill)
    if (features.userTotalBids > 20 && features.userWinRate === 0) score += 0.3;

    // Unusual ratio of bids per auction
    const avgBidsPerAuction = features.auctionBidCount / features.uniqueBidderCount;
    if (avgBidsPerAuction > 5) score += 0.2;

    return Math.min(1, score);
  }

  private classifyRisk(score: number): RiskLevel {
    if (score < 0.3) return 'LOW';
    if (score < 0.6) return 'MEDIUM';
    if (score < 0.8) return 'HIGH';
    return 'CRITICAL';
  }

  private getAction(score: number): FraudAction {
    if (score >= 0.8) return 'BLOCK_AND_REVIEW';
    if (score >= 0.6) return 'APPLY_ADAPTIVE_RULES';
    if (score >= 0.3) return 'FLAG_FOR_MONITORING';
    return 'ALLOW';
  }

  private generateReasons(signals: Record<string, number>, features: BidFeatureVector): string[] {
    const reasons: string[] = [];

    if (signals.bidVelocityAnomaly > 0.5) {
      reasons.push(`Unusually rapid bidding: ${features.bidVelocity.toFixed(1)} bids/min`);
    }
    if (signals.pricePatternAnomaly > 0.5) {
      reasons.push(`Suspicious price pattern: ${features.bidIncrementPct.toFixed(1)}% increment`);
    }
    if (signals.timingAnomaly > 0.5) {
      reasons.push(`Last-second bid: ${features.timeToAuctionEnd.toFixed(0)}s remaining`);
    }
    if (signals.networkAnomaly > 0.5) {
      reasons.push(`Network anomaly: IP shared with ${features.sharedIPCount} accounts`);
    }
    if (signals.accountTrustScore > 0.5) {
      reasons.push(`Low trust account: ${features.accountAgeDays.toFixed(0)} days old`);
    }

    return reasons;
  }

  /**
   * Detect shill bidding patterns using sliding window
   */
  detectShillBidding(auctionId: string, windowSize: number = 10): ShillBiddingResult {
    const history = this.bidHistory.get(auctionId) || [];
    if (history.length < windowSize) {
      return { isDetected: false, confidence: 0, patterns: [] };
    }

    const patterns: string[] = [];
    let maxConfidence = 0;

    for (let i = windowSize; i <= history.length; i++) {
      const window = history.slice(i - windowSize, i);

      // Check 1: Single bidder dominance
      const bidderCounts = new Map<string, number>();
      window.forEach(b => {
        bidderCounts.set(b.bidderId, (bidderCounts.get(b.bidderId) || 0) + 1);
      });

      for (const [bidderId, count] of bidderCounts) {
        const ratio = count / windowSize;
        if (ratio > 0.4) {
          patterns.push(`Bidder ${bidderId.slice(0, 8)} placed ${(ratio * 100).toFixed(0)}% of bids in window`);
          maxConfidence = Math.max(maxConfidence, ratio);
        }
      }

      // Check 2: Minimal variance in increments (robotic behavior)
      const increments = window.map((b, idx) =>
        idx > 0 ? b.amount - window[idx - 1].amount : 0
      ).filter(i => i > 0);

      if (increments.length >= 3) {
        const avgIncrement = increments.reduce((s, i) => s + i, 0) / increments.length;
        const variance = increments.reduce((s, i) => s + Math.pow(i - avgIncrement, 2), 0) / increments.length;
        const stdDev = Math.sqrt(variance);
        const cv = avgIncrement > 0 ? stdDev / avgIncrement : 0; // Coefficient of variation

        if (cv < 0.1) {
          patterns.push(`Robotic bidding pattern: CV=${cv.toFixed(3)}`);
          maxConfidence = Math.max(maxConfidence, 1 - cv);
        }
      }

      // Check 3: Alternating bidders (potential coordination)
      let alternations = 0;
      for (let j = 1; j < window.length; j++) {
        if (window[j].bidderId !== window[j - 1].bidderId) alternations++;
      }
      const alternationRate = alternations / (window.length - 1);
      if (alternationRate >= 0.9 && bidderCounts.size === 2) {
        patterns.push(`Ping-pong bidding between 2 users`);
        maxConfidence = Math.max(maxConfidence, 0.7);
      }
    }

    return {
      isDetected: maxConfidence > 0.5,
      confidence: maxConfidence,
      patterns: [...new Set(patterns)], // Remove duplicates
    };
  }

  /**
   * Detect last-second sniping
   */
  detectSniping(
    bidTimestamp: Date,
    auctionEndTime: Date,
    threshold: number = 10
  ): SnipingResult {
    const secondsRemaining = (auctionEndTime.getTime() - bidTimestamp.getTime()) / 1000;

    if (secondsRemaining <= threshold && secondsRemaining > 0) {
      return {
        isSniping: true,
        secondsRemaining,
        action: 'EXTEND_AUCTION',
        extensionSeconds: 120,
      };
    }

    return {
      isSniping: false,
      secondsRemaining,
      action: 'NONE',
      extensionSeconds: 0,
    };
  }

  /**
   * Detect collusion rings
   */
  detectCollusionRings(): CollusionRing[] {
    return this.bidderGraph.detectCollusionRings();
  }

  /**
   * Get bidder graph for visualization
   */
  getBidderGraph(): BidderGraph {
    return this.bidderGraph;
  }

  /**
   * Create a fraud alert
   */
  createAlert(
    auctionId: string,
    bidderId: string,
    bidId: string,
    result: FraudResult
  ): FraudAlert {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      auctionId,
      bidderId,
      bidId,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      signals: result.signals,
      actionTaken: result.recommendedAction,
      detectedAt: new Date(),
      resolved: false,
    };
  }
}

// Singleton instance for global fraud detection
export const fraudDetector = new FraudDetector();
