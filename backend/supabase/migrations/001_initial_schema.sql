-- AURA-Auction Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified', 'pending', 'unverified')),
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- AUCTIONS TABLE
-- ============================================
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  images TEXT[] NOT NULL DEFAULT '{}',
  starting_price DECIMAL(12,2) NOT NULL CHECK (starting_price >= 0),
  current_bid DECIMAL(12,2) NOT NULL CHECK (current_bid >= 0),
  reserve_price DECIMAL(12,2) DEFAULT 0,
  buy_now_price DECIMAL(12,2) DEFAULT 0,
  min_increment DECIMAL(12,2) NOT NULL DEFAULT 10,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'ending_soon', 'ended', 'sold', 'cancelled')),
  bid_count INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES profiles(id),
  winner_name TEXT,
  enable_anti_snipe BOOLEAN NOT NULL DEFAULT TRUE,
  reserve_met BOOLEAN NOT NULL DEFAULT FALSE,
  is_live_stream BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_seller ON auctions(seller_id);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
CREATE INDEX idx_auctions_category ON auctions(category);

-- Enable Row Level Security
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

-- Policies for auctions
CREATE POLICY "Auctions are viewable by everyone"
  ON auctions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create auctions"
  ON auctions FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own auctions"
  ON auctions FOR UPDATE
  USING (auth.uid() = seller_id);

-- ============================================
-- BIDS TABLE
-- ============================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bidder_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'winning' CHECK (status IN ('winning', 'outbid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_amount ON bids(auction_id, amount DESC);

-- Enable Row Level Security
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Policies for bids
CREATE POLICY "Bids are viewable by everyone"
  ON bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- ============================================
-- WATCHLIST TABLE
-- ============================================
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, auction_id)
);

-- Enable Row Level Security
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Policies for watchlist
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CHAT MESSAGES TABLE (for live auctions)
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_chat_auction ON chat_messages(auction_id, created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat
CREATE POLICY "Chat messages are viewable by everyone"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Place a bid with validation
-- ============================================
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_user profiles%ROWTYPE;
  v_min_bid DECIMAL;
  v_new_end_time TIMESTAMPTZ;
BEGIN
  -- Get auction
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Check auction status
  IF v_auction.status NOT IN ('live', 'ending_soon') THEN
    RETURN json_build_object('success', false, 'error', 'Auction is not accepting bids');
  END IF;

  -- Get user
  SELECT * INTO v_user FROM profiles WHERE id = auth.uid();

  -- Check if user is seller
  IF v_auction.seller_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Cannot bid on your own auction');
  END IF;

  -- Check minimum bid
  v_min_bid := v_auction.current_bid + v_auction.min_increment;
  IF p_amount < v_min_bid THEN
    RETURN json_build_object('success', false, 'error', 'Bid must be at least ' || v_min_bid);
  END IF;

  -- Update previous winning bid to outbid
  UPDATE bids
  SET status = 'outbid'
  WHERE auction_id = p_auction_id AND status = 'winning';

  -- Insert new bid
  INSERT INTO bids (auction_id, bidder_id, bidder_name, amount, status)
  VALUES (p_auction_id, auth.uid(), v_user.name, p_amount, 'winning');

  -- Anti-snipe: extend auction if bid in last 2 minutes
  v_new_end_time := v_auction.end_time;
  IF v_auction.enable_anti_snipe AND
     v_auction.end_time - NOW() < INTERVAL '2 minutes' THEN
    v_new_end_time := v_auction.end_time + INTERVAL '2 minutes';
  END IF;

  -- Update auction
  UPDATE auctions SET
    current_bid = p_amount,
    bid_count = bid_count + 1,
    end_time = v_new_end_time,
    reserve_met = p_amount >= reserve_price,
    updated_at = NOW()
  WHERE id = p_auction_id;

  RETURN json_build_object('success', true, 'bid_amount', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update auction status based on time
-- ============================================
CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void AS $$
BEGIN
  -- Mark auctions as live
  UPDATE auctions
  SET status = 'live', updated_at = NOW()
  WHERE status = 'scheduled' AND start_time <= NOW();

  -- Mark auctions as ending_soon (last 5 minutes)
  UPDATE auctions
  SET status = 'ending_soon', updated_at = NOW()
  WHERE status = 'live'
    AND end_time - NOW() <= INTERVAL '5 minutes'
    AND end_time > NOW();

  -- Mark ended auctions
  UPDATE auctions
  SET
    status = CASE
      WHEN reserve_met AND bid_count > 0 THEN 'sold'
      ELSE 'ended'
    END,
    winner_id = (
      SELECT bidder_id FROM bids
      WHERE auction_id = auctions.id AND status = 'winning'
      ORDER BY amount DESC LIMIT 1
    ),
    winner_name = (
      SELECT bidder_name FROM bids
      WHERE auction_id = auctions.id AND status = 'winning'
      ORDER BY amount DESC LIMIT 1
    ),
    updated_at = NOW()
  WHERE status IN ('live', 'ending_soon') AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable Realtime for these tables
-- ============================================
-- Note: Enable via Supabase Dashboard:
-- Database > Replication > Enable for: auctions, bids, profiles, chat_messages
