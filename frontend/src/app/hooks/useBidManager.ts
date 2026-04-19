/**
 * useBidManager Hook
 *
 * A React hook that wraps the BidManager class to provide
 * reactive state management for auction bidding.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BidManager, Bid, AuctionConfig, BidValidationResult } from '../dsa/BidManager';

export interface UseBidManagerOptions {
  auctionId: string;
  startingPrice: number;
  currentBid: number;
  reservePrice: number;
  minimumIncrement?: number;
  endTime: string;
  initialBids?: Bid[];
  antiSnipingExtension?: number;
  antiSnipingThreshold?: number;
  onBidPlaced?: (bid: Bid) => void;
  onOutbid?: (bid: Bid) => void;
  simulateCompetitors?: boolean;
}

export interface UseBidManagerReturn {
  // State
  currentPrice: number;
  minimumBid: number;
  isReserveMet: boolean;
  totalBids: number;
  uniqueBidders: number;
  bidHistory: Bid[];
  topBids: Bid[];
  heapVisualization: {
    array: Array<{ value: number; bidderName: string }>;
    tree: string;
    operationLog: string[];
  };
  stats: ReturnType<BidManager['getStats']> | null;
  userStatus: 'none' | 'leading' | 'outbid';
  endTime: Date;
  hasEnded: boolean;

  // Actions
  placeBid: (
    amount: number,
    bidderId: string,
    bidderName: string
  ) => Promise<{ success: boolean; bid?: Bid; error?: string }>;
  validateBid: (amount: number, bidderId: string) => BidValidationResult;
  clearOperationLog: () => void;
  refreshStats: () => void;
}

export function useBidManager(options: UseBidManagerOptions): UseBidManagerReturn {
  const managerRef = useRef<BidManager | null>(null);

  // Initialize BidManager
  if (!managerRef.current) {
    const config: AuctionConfig = {
      auctionId: options.auctionId,
      startingPrice: options.startingPrice,
      reservePrice: options.reservePrice,
      minimumIncrement: options.minimumIncrement || 100,
      endTime: new Date(options.endTime),
      antiSnipingExtension: options.antiSnipingExtension || 30000, // 30 seconds
      antiSnipingThreshold: options.antiSnipingThreshold || 60, // 60 seconds
    };

    // Create initial bids from current bid if no initial bids provided
    const initialBids = options.initialBids || generateInitialBids(
      options.startingPrice,
      options.currentBid,
      options.minimumIncrement || 100
    );

    managerRef.current = new BidManager(config, initialBids);
  }

  const manager = managerRef.current;

  // Reactive state
  const [currentPrice, setCurrentPrice] = useState(manager.getCurrentPrice());
  const [minimumBid, setMinimumBid] = useState(manager.getMinimumBid());
  const [isReserveMet, setIsReserveMet] = useState(manager.isReserveMet());
  const [bidHistory, setBidHistory] = useState<Bid[]>(manager.getAllBidsSorted());
  const [topBids, setTopBids] = useState<Bid[]>(manager.getTopBids(10));
  const [heapViz, setHeapViz] = useState(manager.getHeapVisualization());
  const [stats, setStats] = useState(manager.getStats());
  const [userStatus, setUserStatus] = useState<'none' | 'leading' | 'outbid'>('none');
  const [endTime, setEndTime] = useState(manager.getEndTime());
  const [hasEnded, setHasEnded] = useState(manager.hasEnded());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Update all state from manager
  const refreshState = useCallback(() => {
    setCurrentPrice(manager.getCurrentPrice());
    setMinimumBid(manager.getMinimumBid());
    setIsReserveMet(manager.isReserveMet());
    setBidHistory(manager.getAllBidsSorted());
    setTopBids(manager.getTopBids(10));
    setHeapViz(manager.getHeapVisualization());
    setStats(manager.getStats());
    setEndTime(manager.getEndTime());
    setHasEnded(manager.hasEnded());

    // Update user status
    if (currentUserId) {
      const highestBid = manager.getHighestBid();
      if (highestBid) {
        setUserStatus(highestBid.bidderId === currentUserId ? 'leading' : 'outbid');
      }
    }
  }, [manager, currentUserId]);

  // Place a bid
  const placeBid = useCallback(
    async (
      amount: number,
      bidderId: string,
      bidderName: string
    ): Promise<{ success: boolean; bid?: Bid; error?: string }> => {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      const result = manager.placeBid(amount, bidderId, bidderName);

      if (result.success && result.bid) {
        setCurrentUserId(bidderId);
        refreshState();
        options.onBidPlaced?.(result.bid);
      }

      return result;
    },
    [manager, refreshState, options]
  );

  // Validate a bid
  const validateBid = useCallback(
    (amount: number, bidderId: string): BidValidationResult => {
      return manager.validateBid(amount, bidderId);
    },
    [manager]
  );

  // Clear operation log
  const clearOperationLog = useCallback(() => {
    manager.clearOperationLog();
    setHeapViz(manager.getHeapVisualization());
  }, [manager]);

  // Refresh stats explicitly
  const refreshStats = useCallback(() => {
    setStats(manager.getStats());
  }, [manager]);

  // Simulate competitor bids (for demo purposes)
  useEffect(() => {
    if (!options.simulateCompetitors) return;

    const competitorNames = [
      'Michael Zhang',
      'Sarah Johnson',
      'David Kim',
      'Emma Williams',
      'James Chen',
    ];

    const simulateBid = () => {
      if (manager.hasEnded()) return;

      const randomCompetitor = competitorNames[Math.floor(Math.random() * competitorNames.length)];
      const increment = (Math.floor(Math.random() * 5) + 1) * 100;
      const bidAmount = manager.getCurrentPrice() + increment;

      manager.placeBid(
        bidAmount,
        `competitor-${randomCompetitor.toLowerCase().replace(' ', '-')}`,
        randomCompetitor
      );

      refreshState();

      // Check if current user was outbid
      if (currentUserId) {
        const highestBid = manager.getHighestBid();
        if (highestBid && highestBid.bidderId !== currentUserId) {
          setUserStatus('outbid');
          options.onOutbid?.(highestBid);
        }
      }
    };

    // Random interval between 10-30 seconds
    const scheduleNextBid = () => {
      const delay = 10000 + Math.random() * 20000;
      return setTimeout(() => {
        simulateBid();
        const timeoutId = scheduleNextBid();
        return () => clearTimeout(timeoutId);
      }, delay);
    };

    const timeoutId = scheduleNextBid();
    return () => clearTimeout(timeoutId);
  }, [options.simulateCompetitors, manager, refreshState, currentUserId, options]);

  // Check for auction end
  useEffect(() => {
    const checkEnd = () => {
      setHasEnded(manager.hasEnded());
    };

    const interval = setInterval(checkEnd, 1000);
    return () => clearInterval(interval);
  }, [manager]);

  return {
    currentPrice,
    minimumBid,
    isReserveMet,
    totalBids: stats?.totalBids || 0,
    uniqueBidders: stats?.uniqueBidders || 0,
    bidHistory,
    topBids,
    heapVisualization: heapViz,
    stats,
    userStatus,
    endTime,
    hasEnded,
    placeBid,
    validateBid,
    clearOperationLog,
    refreshStats,
  };
}

/**
 * Generate initial bids to simulate existing bid history
 */
function generateInitialBids(
  startingPrice: number,
  currentBid: number,
  minimumIncrement: number
): Bid[] {
  const bids: Bid[] = [];
  const bidderNames = [
    'Michael Zhang',
    'Sarah Johnson',
    'David Kim',
    'Emma Williams',
    'James Chen',
    'Olivia Martinez',
  ];

  let amount = startingPrice;
  let bidIndex = 0;

  while (amount <= currentBid) {
    const bidderName = bidderNames[bidIndex % bidderNames.length];
    const minutesAgo = Math.floor((currentBid - amount) / minimumIncrement) + 1;

    bids.push({
      id: `initial-bid-${bidIndex}`,
      bidderId: `bidder-${bidderName.toLowerCase().replace(' ', '-')}`,
      bidderName,
      amount,
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
      status: amount === currentBid ? 'winning' : 'outbid',
    });

    // Random increment between 1x and 5x minimum
    const randomMultiplier = Math.floor(Math.random() * 5) + 1;
    amount += minimumIncrement * randomMultiplier;
    bidIndex++;
  }

  return bids;
}
