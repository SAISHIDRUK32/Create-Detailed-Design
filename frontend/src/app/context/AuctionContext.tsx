/**
 * AuctionContext - Global Auction State Management
 *
 * Supports two modes:
 * 1. Supabase mode - Real-time PostgreSQL with subscriptions
 * 2. Demo mode - localStorage with mock data
 *
 * Features:
 * - Real-time auction updates via Supabase Realtime
 * - Live bidding with server-side validation
 * - Anti-snipe protection
 * - Watchlist management
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, isDemoMode } from '../config/supabase';
import { useAuth } from './AuthContext';

// Types
export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Date;
  status: 'winning' | 'outbid' | 'cancelled';
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  startingPrice: number;
  currentBid: number;
  reservePrice: number;
  buyNowPrice: number;
  minIncrement: number;
  sellerId: string;
  sellerName: string;
  startTime: Date;
  endTime: Date;
  status: 'draft' | 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'sold' | 'cancelled';
  bidCount: number;
  watchers: string[];
  winnerId?: string;
  winnerName?: string;
  enableAntiSnipe: boolean;
  reserveMet: boolean;
  isLiveStream: boolean;
}

interface AuctionContextType {
  auctions: Auction[];
  liveAuctions: Auction[];
  getAuction: (id: string) => Auction | undefined;
  createAuction: (data: CreateAuctionData) => Promise<Auction>;
  placeBid: (auctionId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  getBidsForAuction: (auctionId: string) => Bid[];
  getHighestBid: (auctionId: string) => Bid | null;
  getUserAuctions: (userId: string) => Auction[];
  getUserBids: (userId: string) => Bid[];
  getUserWatchlist: (userId: string) => Auction[];
  toggleWatchlist: (auctionId: string) => void;
  isWatching: (auctionId: string) => boolean;
  refreshAuctions: () => void;
  isLoading: boolean;
}

export interface CreateAuctionData {
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  startingPrice: number;
  reservePrice: number;
  buyNowPrice: number;
  minIncrement: number;
  duration: string;
  startTime: 'now' | 'scheduled';
  scheduledDate?: string;
  enableAntiSnipe: boolean;
  isLiveStream?: boolean;
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export function useAuctions() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuctions must be used within an AuctionProvider');
  }
  return context;
}

// Duration to milliseconds
const durationToMs: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fixed UUIDs for demo data consistency
const DEMO_SELLER_IDS = {
  seller1: '550e8400-e29b-41d4-a716-446655440001',
  seller2: '550e8400-e29b-41d4-a716-446655440002',
  seller3: '550e8400-e29b-41d4-a716-446655440003',
};

const DEMO_AUCTION_IDS = {
  auction1: '550e8400-e29b-41d4-a716-446655440011',
  auction2: '550e8400-e29b-41d4-a716-446655440012',
  auction3: '550e8400-e29b-41d4-a716-446655440013',
  auction4: '550e8400-e29b-41d4-a716-446655440014',
};

// Sample images for demo
const sampleImages = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800',
  'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
];

// Convert Supabase row to Auction type
function rowToAuction(row: any): Auction {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    images: row.images || [],
    startingPrice: Number(row.starting_price),
    currentBid: Number(row.current_bid),
    reservePrice: Number(row.reserve_price) || 0,
    buyNowPrice: Number(row.buy_now_price) || 0,
    minIncrement: Number(row.min_increment) || 10,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    status: row.status,
    bidCount: row.bid_count || 0,
    watchers: [], // Managed via watchlist table
    winnerId: row.winner_id,
    winnerName: row.winner_name,
    enableAntiSnipe: row.enable_anti_snipe ?? true,
    reserveMet: row.reserve_met ?? false,
    isLiveStream: row.is_live_stream ?? false,
  };
}

// Convert Supabase row to Bid type
function rowToBid(row: any): Bid {
  return {
    id: row.id,
    auctionId: row.auction_id,
    bidderId: row.bidder_id,
    bidderName: row.bidder_name,
    amount: Number(row.amount),
    timestamp: new Date(row.created_at),
    status: row.status,
  };
}

// Initial demo auctions
const createInitialAuctions = (): Auction[] => {
  const now = Date.now();
  return [
    {
      id: DEMO_AUCTION_IDS.auction1,
      title: 'Vintage Rolex Submariner 1960s',
      description: 'Rare 1960s Rolex Submariner in exceptional condition. Original dial, serviced movement, complete with box and papers.',
      category: 'Watches',
      condition: 'good',
      images: [sampleImages[3], sampleImages[0]],
      startingPrice: 15000,
      currentBid: 28500,
      reservePrice: 25000,
      buyNowPrice: 50000,
      minIncrement: 500,
      sellerId: DEMO_SELLER_IDS.seller1,
      sellerName: 'TimeCollector Pro',
      startTime: new Date(now - 2 * 60 * 60 * 1000),
      endTime: new Date(now + 2 * 60 * 60 * 1000),
      status: 'live',
      bidCount: 47,
      watchers: ['user-1', 'user-2'],
      enableAntiSnipe: true,
      reserveMet: true,
      isLiveStream: true,
    },
    {
      id: DEMO_AUCTION_IDS.auction2,
      title: 'Original Banksy Street Art Print',
      description: 'Authenticated Banksy print from the "Girl with Balloon" series. Certificate of authenticity included.',
      category: 'Art',
      condition: 'like_new',
      images: [sampleImages[1]],
      startingPrice: 5000,
      currentBid: 12750,
      reservePrice: 15000,
      buyNowPrice: 25000,
      minIncrement: 250,
      sellerId: DEMO_SELLER_IDS.seller2,
      sellerName: 'ArtVault Gallery',
      startTime: new Date(now - 4 * 60 * 60 * 1000),
      endTime: new Date(now + 45 * 60 * 1000),
      status: 'ending_soon',
      bidCount: 89,
      watchers: ['user-1'],
      enableAntiSnipe: true,
      reserveMet: false,
      isLiveStream: false,
    },
    {
      id: DEMO_AUCTION_IDS.auction3,
      title: 'First Edition Harry Potter Book',
      description: 'First edition, first print of Harry Potter and the Philosopher\'s Stone. Hardcover in mint condition.',
      category: 'Books',
      condition: 'like_new',
      images: [sampleImages[2]],
      startingPrice: 2000,
      currentBid: 8900,
      reservePrice: 8000,
      buyNowPrice: 15000,
      minIncrement: 100,
      sellerId: DEMO_SELLER_IDS.seller3,
      sellerName: 'RareBooks Emporium',
      startTime: new Date(now - 1 * 60 * 60 * 1000),
      endTime: new Date(now + 5 * 60 * 60 * 1000),
      status: 'live',
      bidCount: 34,
      watchers: [],
      enableAntiSnipe: true,
      reserveMet: true,
      isLiveStream: false,
    },
    {
      id: DEMO_AUCTION_IDS.auction4,
      title: '1957 Fender Stratocaster Sunburst',
      description: 'All-original 1957 Fender Stratocaster in three-tone sunburst finish. Maple neck, original pickups.',
      category: 'Musical Instruments',
      condition: 'good',
      images: [sampleImages[4]],
      startingPrice: 25000,
      currentBid: 45200,
      reservePrice: 40000,
      buyNowPrice: 75000,
      minIncrement: 1000,
      sellerId: DEMO_SELLER_IDS.seller1,
      sellerName: 'TimeCollector Pro',
      startTime: new Date(now - 3 * 60 * 60 * 1000),
      endTime: new Date(now + 3 * 60 * 60 * 1000),
      status: 'live',
      bidCount: 62,
      watchers: ['user-2'],
      enableAntiSnipe: true,
      reserveMet: true,
      isLiveStream: false,
    },
  ];
};

// Create initial bids for demo auctions
const createInitialBids = (): Bid[] => {
  const bidders = [
    { id: 'bidder-1', name: 'Michael Zhang' },
    { id: 'bidder-2', name: 'Sarah Johnson' },
    { id: 'bidder-3', name: 'David Kim' },
    { id: 'bidder-4', name: 'Emma Williams' },
  ];

  const bids: Bid[] = [];
  const now = Date.now();

  let amount = 15000;
  for (let i = 0; i < 10; i++) {
    const bidder = bidders[i % bidders.length];
    amount += 500 + Math.floor(Math.random() * 1000);
    bids.push({
      id: `bid-1-${i}`,
      auctionId: DEMO_AUCTION_IDS.auction1,
      bidderId: bidder.id,
      bidderName: bidder.name,
      amount: Math.min(amount, 28500),
      timestamp: new Date(now - (10 - i) * 5 * 60 * 1000),
      status: i === 9 ? 'winning' : 'outbid',
    });
  }

  amount = 5000;
  for (let i = 0; i < 8; i++) {
    const bidder = bidders[i % bidders.length];
    amount += 250 + Math.floor(Math.random() * 500);
    bids.push({
      id: `bid-2-${i}`,
      auctionId: DEMO_AUCTION_IDS.auction2,
      bidderId: bidder.id,
      bidderName: bidder.name,
      amount: Math.min(amount, 12750),
      timestamp: new Date(now - (8 - i) * 3 * 60 * 1000),
      status: i === 7 ? 'winning' : 'outbid',
    });
  }

  return bids;
};

export function AuctionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data based on mode
  useEffect(() => {
    if (isDemoMode || !supabase) {
      // Clear old demo data to force refresh with new UUID format
      try {
        const saved = localStorage.getItem('aura_auctions');
        if (saved) {
          const parsed = JSON.parse(saved);
          // If old format detected (string IDs), clear it
          if (parsed.length > 0 && typeof parsed[0].id === 'string' && parsed[0].id.startsWith('auction-')) {
            localStorage.removeItem('aura_auctions');
            localStorage.removeItem('aura_bids');
            setAuctions(createInitialAuctions());
            setBids(createInitialBids());
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Continue with normal flow
      }

      // Demo mode: load from localStorage or use defaults
      const savedAuctions = localStorage.getItem('aura_auctions');
      const savedBids = localStorage.getItem('aura_bids');

      if (savedAuctions) {
        try {
          const parsed = JSON.parse(savedAuctions);
          setAuctions(parsed.map((a: any) => ({
            ...a,
            startTime: new Date(a.startTime),
            endTime: new Date(a.endTime),
          })));
        } catch {
          setAuctions(createInitialAuctions());
        }
      } else {
        setAuctions(createInitialAuctions());
      }

      if (savedBids) {
        try {
          const parsed = JSON.parse(savedBids);
          setBids(parsed.map((b: any) => ({
            ...b,
            timestamp: new Date(b.timestamp),
          })));
        } catch {
          setBids(createInitialBids());
        }
      } else {
        setBids(createInitialBids());
      }

      setIsLoading(false);
      return;
    }

    // Supabase mode: fetch auctions and set up real-time subscription
    const fetchAuctions = async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .in('status', ['live', 'ending_soon', 'scheduled'])
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching auctions:', error);
        setAuctions(createInitialAuctions());
      } else {
        setAuctions(data.map(rowToAuction));
      }
      setIsLoading(false);
    };

    fetchAuctions();

    // Real-time subscription for auctions
    const auctionSubscription = supabase
      .channel('auctions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAuctions(prev => [rowToAuction(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setAuctions(prev => prev.map(a =>
            a.id === payload.new.id ? rowToAuction(payload.new) : a
          ));
        } else if (payload.eventType === 'DELETE') {
          setAuctions(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .subscribe();

    // Real-time subscription for bids
    const bidSubscription = supabase
      .channel('bids-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setBids(prev => [rowToBid(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setBids(prev => prev.map(b =>
            b.id === payload.new.id ? rowToBid(payload.new) : b
          ));
        }
      })
      .subscribe();

    return () => {
      auctionSubscription.unsubscribe();
      bidSubscription.unsubscribe();
    };
  }, []);

  // Fetch user's watchlist
  useEffect(() => {
    if (!user || isDemoMode || !supabase) return;

    const fetchWatchlist = async () => {
      const { data } = await supabase
        .from('watchlist')
        .select('auction_id')
        .eq('user_id', user.id);

      if (data) {
        setWatchlistIds(new Set(data.map(w => w.auction_id)));
      }
    };

    fetchWatchlist();
  }, [user]);

  // Save to localStorage in demo mode
  useEffect(() => {
    if (isDemoMode && auctions.length > 0) {
      localStorage.setItem('aura_auctions', JSON.stringify(auctions));
    }
  }, [auctions]);

  useEffect(() => {
    if (isDemoMode && bids.length > 0) {
      localStorage.setItem('aura_bids', JSON.stringify(bids));
    }
  }, [bids]);

  // Update auction statuses based on time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      setAuctions(prev => prev.map(auction => {
        if (auction.status === 'ended' || auction.status === 'sold' || auction.status === 'cancelled') {
          return auction;
        }

        const timeRemaining = auction.endTime.getTime() - now.getTime();

        if (timeRemaining <= 0) {
          const winningBid = bids
            .filter(b => b.auctionId === auction.id && b.status === 'winning')
            .sort((a, b) => b.amount - a.amount)[0];

          return {
            ...auction,
            status: (winningBid && auction.reserveMet ? 'sold' : 'ended') as Auction['status'],
            winnerId: winningBid?.bidderId,
            winnerName: winningBid?.bidderName,
          };
        } else if (timeRemaining <= 5 * 60 * 1000 && auction.status !== 'ending_soon') {
          return { ...auction, status: 'ending_soon' as const };
        } else if (auction.status === 'scheduled' && auction.startTime <= now) {
          return { ...auction, status: 'live' as const };
        }

        return auction;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [bids]);

  // Get live auctions
  const liveAuctions = auctions.filter(
    a => a.status === 'live' || a.status === 'ending_soon'
  );

  // Get single auction
  const getAuction = useCallback((id: string) => {
    return auctions.find(a => a.id === id);
  }, [auctions]);

  // Create new auction
  const createAuction = useCallback(async (data: CreateAuctionData): Promise<Auction> => {
    const now = new Date();
    const durationMs = durationToMs[data.duration] || durationToMs['1d'];

    const startTime = data.startTime === 'now'
      ? now
      : data.scheduledDate
        ? new Date(data.scheduledDate)
        : now;

    const auctionData = {
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      images: data.images.length > 0 ? data.images : [sampleImages[Math.floor(Math.random() * sampleImages.length)]],
      startingPrice: data.startingPrice,
      currentBid: data.startingPrice,
      reservePrice: data.reservePrice || 0,
      buyNowPrice: data.buyNowPrice || 0,
      minIncrement: data.minIncrement || 10,
      sellerId: user?.id || 'unknown',
      sellerName: user?.name || 'Unknown Seller',
      startTime,
      endTime: new Date(startTime.getTime() + durationMs),
      status: (data.startTime === 'now' ? 'live' : 'scheduled') as Auction['status'],
      bidCount: 0,
      watchers: [],
      enableAntiSnipe: data.enableAntiSnipe,
      reserveMet: data.reservePrice ? data.startingPrice >= data.reservePrice : true,
      isLiveStream: data.isLiveStream || false,
    };

    if (isDemoMode || !supabase) {
      const newAuction: Auction = {
        id: `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...auctionData,
      };
      setAuctions(prev => [newAuction, ...prev]);
      return newAuction;
    }

    // Supabase mode
    const { data: insertedAuction, error } = await supabase
      .from('auctions')
      .insert({
        title: auctionData.title,
        description: auctionData.description,
        category: auctionData.category,
        condition: auctionData.condition,
        images: auctionData.images,
        starting_price: auctionData.startingPrice,
        current_bid: auctionData.currentBid,
        reserve_price: auctionData.reservePrice,
        buy_now_price: auctionData.buyNowPrice,
        min_increment: auctionData.minIncrement,
        seller_id: auctionData.sellerId,
        seller_name: auctionData.sellerName,
        start_time: auctionData.startTime.toISOString(),
        end_time: auctionData.endTime.toISOString(),
        status: auctionData.status,
        enable_anti_snipe: auctionData.enableAntiSnipe,
        is_live_stream: auctionData.isLiveStream,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return rowToAuction(insertedAuction);
  }, [user]);

  // Place a bid
  const placeBid = useCallback(async (auctionId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to bid' };
    }

    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    if (auction.status !== 'live' && auction.status !== 'ending_soon') {
      return { success: false, error: 'This auction is not accepting bids' };
    }

    if (auction.sellerId === user.id) {
      return { success: false, error: 'You cannot bid on your own auction' };
    }

    const minBid = auction.currentBid + auction.minIncrement;
    if (amount < minBid) {
      return { success: false, error: `Minimum bid is $${minBid.toLocaleString()}` };
    }

    const currentWinningBid = bids.find(
      b => b.auctionId === auctionId && b.status === 'winning'
    );
    if (currentWinningBid?.bidderId === user.id) {
      return { success: false, error: 'You are already the highest bidder' };
    }

    if (isDemoMode || !supabase) {
      // Demo mode bid
      const newBid: Bid = {
        id: `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        auctionId,
        bidderId: user.id,
        bidderName: user.name,
        amount,
        timestamp: new Date(),
        status: 'winning',
      };

      let newEndTime = auction.endTime;
      if (auction.enableAntiSnipe) {
        const timeRemaining = auction.endTime.getTime() - Date.now();
        if (timeRemaining < 2 * 60 * 1000 && timeRemaining > 0) {
          newEndTime = new Date(auction.endTime.getTime() + 2 * 60 * 1000);
        }
      }

      setBids(prev => [
        newBid,
        ...prev.map(b =>
          b.auctionId === auctionId && b.status === 'winning'
            ? { ...b, status: 'outbid' as const }
            : b
        ),
      ]);

      setAuctions(prev => prev.map(a => {
        if (a.id !== auctionId) return a;
        return {
          ...a,
          currentBid: amount,
          bidCount: a.bidCount + 1,
          endTime: newEndTime,
          reserveMet: a.reservePrice ? amount >= a.reservePrice : true,
        };
      }));

      return { success: true };
    }

    // Supabase mode: use the place_bid function
    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: auctionId,
      p_amount: amount,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return { success: true };
  }, [user, auctions, bids]);

  // Get bids for auction
  const getBidsForAuction = useCallback((auctionId: string): Bid[] => {
    return bids
      .filter(b => b.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount);
  }, [bids]);

  // Get highest bid
  const getHighestBid = useCallback((auctionId: string): Bid | null => {
    const auctionBids = bids.filter(b => b.auctionId === auctionId);
    if (auctionBids.length === 0) return null;
    return auctionBids.reduce((max, b) => b.amount > max.amount ? b : max);
  }, [bids]);

  // Get user's auctions
  const getUserAuctions = useCallback((userId: string): Auction[] => {
    return auctions.filter(a => a.sellerId === userId);
  }, [auctions]);

  // Get user's bids
  const getUserBids = useCallback((userId: string): Bid[] => {
    return bids.filter(b => b.bidderId === userId);
  }, [bids]);

  // Get user's watchlist
  const getUserWatchlist = useCallback((userId: string): Auction[] => {
    if (isDemoMode) {
      return auctions.filter(a => a.watchers.includes(userId));
    }
    return auctions.filter(a => watchlistIds.has(a.id));
  }, [auctions, watchlistIds]);

  // Toggle watchlist
  const toggleWatchlist = useCallback(async (auctionId: string) => {
    if (!user) return;

    if (isDemoMode) {
      setAuctions(prev => prev.map(a => {
        if (a.id !== auctionId) return a;
        const isWatching = a.watchers.includes(user.id);
        return {
          ...a,
          watchers: isWatching
            ? a.watchers.filter(id => id !== user.id)
            : [...a.watchers, user.id],
        };
      }));
      return;
    }

    if (!supabase) return;

    const isCurrentlyWatching = watchlistIds.has(auctionId);

    if (isCurrentlyWatching) {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('auction_id', auctionId);

      setWatchlistIds(prev => {
        const next = new Set(prev);
        next.delete(auctionId);
        return next;
      });
    } else {
      await supabase
        .from('watchlist')
        .insert({ user_id: user.id, auction_id: auctionId });

      setWatchlistIds(prev => new Set([...prev, auctionId]));
    }
  }, [user, watchlistIds]);

  // Check if user is watching
  const isWatching = useCallback((auctionId: string): boolean => {
    if (!user) return false;
    if (isDemoMode) {
      const auction = auctions.find(a => a.id === auctionId);
      return auction?.watchers.includes(user.id) || false;
    }
    return watchlistIds.has(auctionId);
  }, [user, auctions, watchlistIds]);

  // Refresh auctions
  const refreshAuctions = useCallback(async () => {
    if (isDemoMode || !supabase) {
      setAuctions(prev => [...prev]);
      return;
    }

    const { data } = await supabase
      .from('auctions')
      .select('*')
      .in('status', ['live', 'ending_soon', 'scheduled'])
      .order('start_time', { ascending: false });

    if (data) {
      setAuctions(data.map(rowToAuction));
    }
  }, []);

  return (
    <AuctionContext.Provider
      value={{
        auctions,
        liveAuctions,
        getAuction,
        createAuction,
        placeBid,
        getBidsForAuction,
        getHighestBid,
        getUserAuctions,
        getUserBids,
        getUserWatchlist,
        toggleWatchlist,
        isWatching,
        refreshAuctions,
        isLoading,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}
