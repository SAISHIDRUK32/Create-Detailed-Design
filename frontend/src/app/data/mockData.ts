export interface User {
  id: string;
  name: string;
  rating: number;
  verification_status: 'verified' | 'pending' | 'unverified';
  avatar?: string;
}

export interface Bid {
  bidder_id: string;
  bidder_name: string;
  amount: number;
  timestamp: string;
  status: 'active' | 'outbid' | 'winning';
}

export interface Auction {
  id: string;
  title: string;
  images: string[];
  category: string;
  starting_price: number;
  current_bid: number;
  reserve_price: number;
  reserve_met: boolean;
  end_time: string;
  seller_info: User;
  bid_count: number;
  watchers: number;
  status: 'live' | 'ending_soon' | 'ended';
  trending: boolean;
  description: string;
  provenance?: string;
  ai_confidence_score?: number;
}

export const currentUser: User = {
  id: 'user-1',
  name: 'Alex Rivera',
  rating: 4.8,
  verification_status: 'verified',
};

export const mockAuctions: Auction[] = [
  {
    id: '1',
    title: 'Vintage Rolex Submariner 1960s',
    images: ['luxury watch vintage', 'rolex submariner classic', 'vintage timepiece'],
    category: 'Watches',
    starting_price: 15000,
    current_bid: 28500,
    reserve_price: 25000,
    reserve_met: true,
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    seller_info: {
      id: 'seller-1',
      name: 'TimeCollector Pro',
      rating: 4.9,
      verification_status: 'verified',
    },
    bid_count: 47,
    watchers: 234,
    status: 'live',
    trending: true,
    description: 'Rare 1960s Rolex Submariner in exceptional condition. Original dial, serviced movement, complete with box and papers.',
    provenance: 'Purchased from original owner in 1965, serviced by authorized Rolex dealer every 5 years.',
    ai_confidence_score: 98,
  },
  {
    id: '2',
    title: 'Original Banksy Street Art Print',
    images: ['banksy street art', 'contemporary art print', 'urban art graffiti'],
    category: 'Art',
    starting_price: 5000,
    current_bid: 12750,
    reserve_price: 15000,
    reserve_met: false,
    end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes
    seller_info: {
      id: 'seller-2',
      name: 'ArtVault Gallery',
      rating: 4.7,
      verification_status: 'verified',
    },
    bid_count: 89,
    watchers: 567,
    status: 'ending_soon',
    trending: true,
    description: 'Authenticated Banksy print from the "Girl with Balloon" series. Certificate of authenticity included.',
    provenance: 'Acquired directly from Pest Control in 2018.',
    ai_confidence_score: 95,
  },
  {
    id: '3',
    title: 'First Edition Harry Potter Book',
    images: ['rare book first edition', 'harry potter book', 'vintage book collection'],
    category: 'Books',
    starting_price: 2000,
    current_bid: 8900,
    reserve_price: 8000,
    reserve_met: true,
    end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours
    seller_info: {
      id: 'seller-3',
      name: 'RareBooks Emporium',
      rating: 5.0,
      verification_status: 'verified',
    },
    bid_count: 34,
    watchers: 189,
    status: 'live',
    trending: false,
    description: 'First edition, first print of Harry Potter and the Philosopher\'s Stone. Hardcover in mint condition.',
    provenance: 'Original purchase receipt from 1997 included.',
    ai_confidence_score: 99,
  },
  {
    id: '4',
    title: '1957 Fender Stratocaster Sunburst',
    images: ['vintage guitar fender', 'electric guitar classic', 'stratocaster sunburst'],
    category: 'Musical Instruments',
    starting_price: 25000,
    current_bid: 45200,
    reserve_price: 40000,
    reserve_met: true,
    end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
    seller_info: {
      id: 'seller-4',
      name: 'GuitarLegends',
      rating: 4.8,
      verification_status: 'verified',
    },
    bid_count: 62,
    watchers: 412,
    status: 'live',
    trending: true,
    description: 'All-original 1957 Fender Stratocaster in three-tone sunburst finish. Maple neck, original pickups.',
    provenance: 'Previously owned by session musician in Nashville, full service history available.',
    ai_confidence_score: 97,
  },
  {
    id: '5',
    title: 'Hermès Birkin 35 Togo Leather',
    images: ['hermes birkin bag', 'luxury handbag', 'designer purse leather'],
    category: 'Fashion',
    starting_price: 8000,
    current_bid: 14300,
    reserve_price: 12000,
    reserve_met: true,
    end_time: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours
    seller_info: {
      id: 'seller-5',
      name: 'LuxuryVault',
      rating: 4.9,
      verification_status: 'verified',
    },
    bid_count: 28,
    watchers: 298,
    status: 'live',
    trending: false,
    description: 'Authentic Hermès Birkin 35 in Etoupe Togo leather with gold hardware. Pristine condition.',
    provenance: 'Purchased from Hermès boutique in Paris, 2020. Original receipt and dust bag included.',
    ai_confidence_score: 96,
  },
  {
    id: '6',
    title: 'Patek Philippe Nautilus 5711',
    images: ['patek philippe watch', 'luxury watch steel', 'nautilus watch'],
    category: 'Watches',
    starting_price: 50000,
    current_bid: 125000,
    reserve_price: 100000,
    reserve_met: true,
    end_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes
    seller_info: {
      id: 'seller-1',
      name: 'TimeCollector Pro',
      rating: 4.9,
      verification_status: 'verified',
    },
    bid_count: 156,
    watchers: 892,
    status: 'ending_soon',
    trending: true,
    description: 'Discontinued Patek Philippe Nautilus 5711/1A in stainless steel. Blue dial, full set with box and papers.',
    provenance: 'Originally purchased from authorized dealer in 2021. Complete service history.',
    ai_confidence_score: 99,
  },
];

export const generateBidHistory = (auctionId: string): Bid[] => {
  const auction = mockAuctions.find(a => a.id === auctionId);
  if (!auction) return [];

  const bidders = [
    'Michael Zhang',
    'Sarah Johnson',
    'David Kim',
    'Emma Williams',
    'James Chen',
    'Olivia Martinez',
  ];

  const history: Bid[] = [];
  let currentAmount = auction.starting_price;
  const increment = (auction.current_bid - auction.starting_price) / (auction.bid_count - 1);

  for (let i = 0; i < auction.bid_count; i++) {
    const bidder = bidders[Math.floor(Math.random() * bidders.length)];
    const minutesAgo = auction.bid_count - i;
    
    history.push({
      bidder_id: `bidder-${i}`,
      bidder_name: bidder,
      amount: Math.round(currentAmount),
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
      status: i === auction.bid_count - 1 ? 'winning' : 'outbid',
    });
    
    currentAmount += increment;
  }

  return history.reverse();
};

export const userBids = [
  { auctionId: '1', highestBid: 27000, status: 'outbid' as const },
  { auctionId: '4', highestBid: 45200, status: 'winning' as const },
];

export const userWatchlist = ['2', '3', '6'];
