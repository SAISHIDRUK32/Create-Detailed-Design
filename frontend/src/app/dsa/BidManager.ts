/**
 * BidManager - Auction Bid Management using MaxHeap
 *
 * This manager handles all bid operations for an auction using
 * the MaxHeap data structure. It provides:
 *
 * - O(1) access to the current highest bid
 * - O(log n) bid insertion
 * - Bid validation and fraud detection hooks
 * - Real-time bid statistics
 */

import { MaxHeap, HeapNode } from './MaxHeap';

export interface Bid {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Date;
  status: 'active' | 'outbid' | 'winning' | 'rejected';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    bidLatency?: number; // Time between last bid and this bid (ms)
  };
}

export interface BidValidationResult {
  isValid: boolean;
  reason?: string;
  fraudScore?: number;
}

export interface AuctionConfig {
  auctionId: string;
  startingPrice: number;
  reservePrice: number;
  minimumIncrement: number;
  endTime: Date;
  antiSnipingExtension?: number; // Extend auction by X ms if bid in last Y seconds
  antiSnipingThreshold?: number; // Y seconds before end to trigger extension
}

export class BidManager {
  private bidHeap: MaxHeap<Bid>;
  private allBids: Map<string, Bid> = new Map();
  private bidderHistory: Map<string, Bid[]> = new Map();
  private config: AuctionConfig;
  private lastBidTime: Date | null = null;
  private extensionCount = 0;

  constructor(config: AuctionConfig, existingBids?: Bid[]) {
    this.config = config;

    // Initialize heap with existing bids if any
    if (existingBids && existingBids.length > 0) {
      const heapNodes: HeapNode<Bid>[] = existingBids.map(bid => ({
        value: bid.amount,
        data: bid,
      }));
      this.bidHeap = new MaxHeap<Bid>(heapNodes);

      // Populate tracking maps
      existingBids.forEach(bid => {
        this.allBids.set(bid.id, bid);
        const bidderBids = this.bidderHistory.get(bid.bidderId) || [];
        bidderBids.push(bid);
        this.bidderHistory.set(bid.bidderId, bidderBids);
      });

      // Update statuses
      this.updateBidStatuses();
    } else {
      this.bidHeap = new MaxHeap<Bid>();
    }
  }

  /**
   * Get the current highest bid
   * Time Complexity: O(1)
   */
  getHighestBid(): Bid | null {
    const max = this.bidHeap.peek();
    return max ? max.data : null;
  }

  /**
   * Get the current highest bid amount
   * Time Complexity: O(1)
   */
  getCurrentPrice(): number {
    const highest = this.getHighestBid();
    return highest ? highest.amount : this.config.startingPrice;
  }

  /**
   * Get the minimum valid bid amount
   */
  getMinimumBid(): number {
    return this.getCurrentPrice() + this.config.minimumIncrement;
  }

  /**
   * Check if reserve price has been met
   */
  isReserveMet(): boolean {
    return this.getCurrentPrice() >= this.config.reservePrice;
  }

  /**
   * Validate a bid before placing it
   */
  validateBid(amount: number, bidderId: string): BidValidationResult {
    // Check if auction has ended
    if (new Date() > this.config.endTime) {
      return { isValid: false, reason: 'Auction has ended' };
    }

    // Check minimum bid amount
    const minimumBid = this.getMinimumBid();
    if (amount < minimumBid) {
      return {
        isValid: false,
        reason: `Bid must be at least $${minimumBid.toLocaleString()}`,
      };
    }

    // Check if bidder is outbidding themselves (usually not allowed)
    const highestBid = this.getHighestBid();
    if (highestBid && highestBid.data.bidderId === bidderId) {
      return {
        isValid: false,
        reason: 'You are already the highest bidder',
      };
    }

    // Calculate fraud score (basic pattern detection)
    const fraudScore = this.calculateFraudScore(bidderId, amount);
    if (fraudScore > 0.8) {
      return {
        isValid: false,
        reason: 'Suspicious bidding pattern detected',
        fraudScore,
      };
    }

    return { isValid: true, fraudScore };
  }

  /**
   * Place a new bid
   * Time Complexity: O(log n)
   */
  placeBid(
    amount: number,
    bidderId: string,
    bidderName: string,
    metadata?: Bid['metadata']
  ): { success: boolean; bid?: Bid; error?: string } {
    // Validate the bid
    const validation = this.validateBid(amount, bidderId);
    if (!validation.isValid) {
      return { success: false, error: validation.reason };
    }

    // Create the bid
    const bid: Bid = {
      id: `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bidderId,
      bidderName,
      amount,
      timestamp: new Date(),
      status: 'winning',
      metadata: {
        ...metadata,
        bidLatency: this.lastBidTime
          ? Date.now() - this.lastBidTime.getTime()
          : undefined,
      },
    };

    // Insert into heap - O(log n)
    this.bidHeap.insert(amount, bid);

    // Track the bid
    this.allBids.set(bid.id, bid);
    const bidderBids = this.bidderHistory.get(bidderId) || [];
    bidderBids.push(bid);
    this.bidderHistory.set(bidderId, bidderBids);

    // Update all bid statuses
    this.updateBidStatuses();

    // Record bid time for latency calculation
    this.lastBidTime = bid.timestamp;

    // Handle anti-sniping extension
    this.handleAntiSniping();

    return { success: true, bid };
  }

  /**
   * Update statuses of all bids (winner vs outbid)
   */
  private updateBidStatuses(): void {
    const sortedBids = this.bidHeap.toSortedArray();

    sortedBids.forEach((node, index) => {
      const bid = this.allBids.get(node.data.id);
      if (bid) {
        bid.status = index === 0 ? 'winning' : 'outbid';
      }
    });
  }

  /**
   * Calculate fraud score based on bidding patterns
   * Returns 0-1 where higher means more suspicious
   */
  private calculateFraudScore(bidderId: string, amount: number): number {
    let score = 0;
    const bidderBids = this.bidderHistory.get(bidderId) || [];

    // Pattern 1: Rapid successive bids (potential shill bidding)
    if (bidderBids.length > 0) {
      const lastBid = bidderBids[bidderBids.length - 1];
      const timeSinceLastBid = Date.now() - lastBid.timestamp.getTime();
      if (timeSinceLastBid < 5000) {
        // Less than 5 seconds
        score += 0.3;
      }
    }

    // Pattern 2: Minimal increment bidding (potential collusion/shill)
    const increment = amount - this.getCurrentPrice();
    if (increment === this.config.minimumIncrement) {
      const minIncrementBids = bidderBids.filter((b, i) => {
        if (i === 0) return false;
        return b.amount - bidderBids[i - 1].amount === this.config.minimumIncrement;
      });
      if (minIncrementBids.length > 3) {
        score += 0.2;
      }
    }

    // Pattern 3: Last-second sniping
    const timeUntilEnd = this.config.endTime.getTime() - Date.now();
    if (timeUntilEnd < 10000) {
      // Less than 10 seconds
      score += 0.15;
    }

    // Pattern 4: Too many bids from same bidder
    if (bidderBids.length > 10) {
      score += 0.15;
    }

    // Pattern 5: Bid jumping (unusually large increments might indicate price manipulation)
    const expectedMax = this.getCurrentPrice() * 1.5;
    if (amount > expectedMax) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Handle anti-sniping: extend auction if bid placed near end
   */
  private handleAntiSniping(): void {
    if (!this.config.antiSnipingExtension || !this.config.antiSnipingThreshold) {
      return;
    }

    const timeUntilEnd = this.config.endTime.getTime() - Date.now();
    const thresholdMs = this.config.antiSnipingThreshold * 1000;

    if (timeUntilEnd < thresholdMs && timeUntilEnd > 0) {
      this.config.endTime = new Date(
        this.config.endTime.getTime() + this.config.antiSnipingExtension
      );
      this.extensionCount++;
    }
  }

  /**
   * Get all bids sorted by amount (highest first)
   */
  getAllBidsSorted(): Bid[] {
    return this.bidHeap.toSortedArray().map(node => node.data);
  }

  /**
   * Get top K bids
   */
  getTopBids(k: number): Bid[] {
    return this.bidHeap.getTopK(k).map(node => node.data);
  }

  /**
   * Get bid history for a specific bidder
   */
  getBidderHistory(bidderId: string): Bid[] {
    return this.bidderHistory.get(bidderId) || [];
  }

  /**
   * Get auction statistics
   */
  getStats(): {
    totalBids: number;
    uniqueBidders: number;
    currentPrice: number;
    startingPrice: number;
    reserveMet: boolean;
    priceIncrease: number;
    priceIncreasePercent: number;
    averageBidIncrement: number;
    heapHeight: number;
    extensionCount: number;
    timeRemaining: number;
  } {
    const heapStats = this.bidHeap.getStats();
    const currentPrice = this.getCurrentPrice();
    const allBidsArray = Array.from(this.allBids.values());

    // Calculate average increment
    let totalIncrement = 0;
    const sortedBids = this.getAllBidsSorted().reverse();
    for (let i = 1; i < sortedBids.length; i++) {
      totalIncrement += sortedBids[i].amount - sortedBids[i - 1].amount;
    }
    const avgIncrement = sortedBids.length > 1
      ? totalIncrement / (sortedBids.length - 1)
      : 0;

    return {
      totalBids: heapStats.size,
      uniqueBidders: this.bidderHistory.size,
      currentPrice,
      startingPrice: this.config.startingPrice,
      reserveMet: this.isReserveMet(),
      priceIncrease: currentPrice - this.config.startingPrice,
      priceIncreasePercent:
        ((currentPrice - this.config.startingPrice) / this.config.startingPrice) * 100,
      averageBidIncrement: avgIncrement,
      heapHeight: heapStats.height,
      extensionCount: this.extensionCount,
      timeRemaining: Math.max(0, this.config.endTime.getTime() - Date.now()),
    };
  }

  /**
   * Get the heap structure for visualization
   */
  getHeapVisualization(): {
    array: Array<{ value: number; bidderName: string }>;
    tree: string;
    operationLog: string[];
  } {
    return {
      array: this.bidHeap.toArray().map(node => ({
        value: node.value,
        bidderName: node.data.bidderName,
      })),
      tree: this.bidHeap.visualize(),
      operationLog: this.bidHeap.getOperationLog(),
    };
  }

  /**
   * Clear operation log
   */
  clearOperationLog(): void {
    this.bidHeap.clearLog();
  }

  /**
   * Get auction end time (may have been extended)
   */
  getEndTime(): Date {
    return this.config.endTime;
  }

  /**
   * Check if auction has ended
   */
  hasEnded(): boolean {
    return new Date() > this.config.endTime;
  }
}
