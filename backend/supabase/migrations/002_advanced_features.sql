-- AURA-Auction Complete Database Schema
-- Part 2: Advanced Features (Risk, Payments, Disputes, Admin)
-- Run this after the initial schema

-- ============================================
-- VERIFICATION & DEVICES
-- ============================================

CREATE TABLE verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'phone', 'id_document', 'address')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  document_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  rejected_reason TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, verification_type)
);

CREATE INDEX idx_verification_user ON verification(user_id);
CREATE INDEX idx_verification_status ON verification(status);

ALTER TABLE verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification"
  ON verification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification"
  ON verification FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- DEVICES & SESSION MANAGEMENT
-- ============================================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  os TEXT,
  browser TEXT,
  ip_address INET,
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_ip ON devices(ip_address);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- RISK SCORING & FRAUD DETECTION
-- ============================================

CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB NOT NULL DEFAULT '{}',
  -- Risk factors: bid_frequency, bid_jump, account_age, device_consistency, bidder_overlap
  reason TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(20) NOT NULL DEFAULT '1.0'
);

CREATE INDEX idx_risk_auction ON risk_scores(auction_id);
CREATE INDEX idx_risk_bidder ON risk_scores(bidder_id);
CREATE INDEX idx_risk_score ON risk_scores(score DESC);
CREATE INDEX idx_risk_level ON risk_scores(risk_level);

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Risk scores viewable by auction seller and admins"
  ON risk_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = risk_scores.auction_id
      AND (auctions.seller_id = auth.uid() OR
           (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    )
  );

-- ============================================
-- GOVERNANCE ACTIONS
-- ============================================

CREATE TABLE governance_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'extend_time',
    'raise_increment',
    'require_verification',
    'hold_payment',
    'pause_auction',
    'cancel_auction'
  )),
  trigger_reason TEXT NOT NULL,
  risk_score_id UUID REFERENCES risk_scores(id),
  parameters JSONB NOT NULL DEFAULT '{}',
  -- e.g., {"extend_minutes": 5, "new_increment": 100}
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled', 'failed')),
  applied_at TIMESTAMPTZ,
  admin_override BOOLEAN DEFAULT FALSE,
  admin_id UUID REFERENCES profiles(id),
  audit_log TEXT NOT NULL,
  policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_auction ON governance_actions(auction_id);
CREATE INDEX idx_governance_status ON governance_actions(status);
CREATE INDEX idx_governance_trigger ON governance_actions(trigger_reason);

ALTER TABLE governance_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Governance actions viewable by sellers and admins"
  ON governance_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = governance_actions.auction_id
      AND (auctions.seller_id = auth.uid() OR
           (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    )
  );

-- ============================================
-- ORDERS & PAYMENT TRACKING
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL UNIQUE REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  winning_bid_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'payment_processing', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'
  )),
  payment_due_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_due ON orders(payment_due_at);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'refunding'
  )),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer')),
  stripe_payment_intent_id TEXT,
  transaction_id TEXT UNIQUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_intent ON payments(stripe_payment_intent_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- ============================================
-- PAYMENT ATTEMPTS & RETRIES
-- ============================================

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_code TEXT,
  error_message TEXT,
  retry_after_seconds INTEGER,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_attempts_payment ON payment_attempts(payment_id);
CREATE INDEX idx_payment_attempts_retry ON payment_attempts(next_retry_at);

-- ============================================
-- SHIPMENTS & TRACKING
-- ============================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL CHECK (carrier IN ('fedex', 'ups', 'usps', 'custom')),
  tracking_number TEXT UNIQUE,
  label_url TEXT,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'created', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'
  )),
  signature_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipment"
  ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- ============================================
-- TRACKING EVENTS (from carrier webhooks)
-- ============================================

CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  location TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_shipment ON tracking_events(shipment_id);
CREATE INDEX idx_tracking_timestamp ON tracking_events(timestamp DESC);

-- ============================================
-- DISPUTES & RESOLUTION
-- ============================================

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'not_received', 'not_as_described', 'defective', 'other_issue',
    'seller_nonresponsive', 'shipping_late', 'payment_issue'
  )),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'in_mediation', 'resolved', 'refunded', 'escalated', 'closed'
  )),
  evidence JSONB NOT NULL DEFAULT '[]',
  -- Array of {url, type, uploaded_by, uploaded_at}
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  resolution_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 days'),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_initiator ON disputes(initiator_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_deadline ON disputes(resolution_deadline);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dispute"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = disputes.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ) OR
    initiator_id = auth.uid()
  );

-- ============================================
-- REFUNDS
-- ============================================

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES disputes(id),
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_dispute ON refunds(dispute_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- ============================================
-- PENALTIES & STRIKES
-- ============================================

CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN (
    'warning', 'suspension', 'bid_hold', 'account_restriction', 'ban'
  )),
  reason TEXT NOT NULL,
  description TEXT,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  dispute_id UUID REFERENCES disputes(id),
  admin_id UUID REFERENCES profiles(id),
  duration_days INTEGER,
  expired_at TIMESTAMPTZ,
  lifted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_penalties_user ON penalties(user_id);
CREATE INDEX idx_penalties_expired ON penalties(expired_at);
CREATE INDEX idx_penalties_active ON penalties(expired_at) WHERE expired_at > NOW();

-- ============================================
-- AUCTION RULES (Dynamic Rule Engine)
-- ============================================

CREATE TABLE auction_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  rules JSONB NOT NULL DEFAULT '{}',
  -- Rules: {minIncrement, maxBidJump, antiSnipeExtension, etc}
  risk_thresholds JSONB NOT NULL DEFAULT '{}',
  -- {low: 0.3, medium: 0.7, high: 0.85, critical: 0.95}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_rules_status ON auction_rules(status);

-- ============================================
-- AUDIT LOG (Tamper-proof, HMAC signed)
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  -- Types: bid_placed, auction_created, payment_processed, dispute_opened, admin_action, etc.
  user_id UUID REFERENCES profiles(id),
  resource_type TEXT NOT NULL,
  -- Types: auction, bid, order, payment, dispute, user, etc.
  resource_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  risk_score NUMERIC(3,2),
  governance_action_id UUID REFERENCES governance_actions(id),
  policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  hmac_signature TEXT NOT NULL,
  -- HMAC-SHA256 signature for tamper detection
  is_valid BOOLEAN DEFAULT TRUE,
  admin_override BOOLEAN DEFAULT FALSE,
  admin_id UUID REFERENCES profiles(id),
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_event ON audit_log(event_type);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_log(created_at DESC);
CREATE INDEX idx_audit_risk ON audit_log(risk_score);

-- ============================================
-- PAYOUT MANAGEMENT
-- ============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  fee DECIMAL(12,2),
  net_amount DECIMAL(12,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  payout_method TEXT CHECK (payout_method IN ('stripe', 'bank_transfer', 'check')),
  stripe_payout_id TEXT,
  release_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_seller ON payouts(seller_id);
CREATE INDEX idx_payouts_order ON payouts(order_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_release ON payouts(release_date);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own payouts"
  ON payouts FOR SELECT
  USING (auth.uid() = seller_id);

-- ============================================
-- AUCTION EVENTS (Full event log)
-- ============================================

CREATE TABLE auction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- Types: created, started, bid_placed, status_changed, extended, closed, etc.
  triggered_by UUID REFERENCES profiles(id),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auction_events_auction ON auction_events(auction_id);
CREATE INDEX idx_auction_events_type ON auction_events(event_type);
CREATE INDEX idx_auction_events_timestamp ON auction_events(created_at DESC);

-- ============================================
-- HEAP STATE SNAPSHOTS (for debugging)
-- ============================================

CREATE TABLE heap_state_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  heap_state JSONB NOT NULL,
  -- Array of bids in heap order
  highest_bid DECIMAL(12,2),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX idx_heap_auction ON heap_state_snapshots(auction_id);
CREATE INDEX idx_heap_timestamp ON heap_state_snapshots(snapshot_at DESC);

-- ============================================
-- RATE LIMITING
-- ============================================

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_end);

-- Clean up old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Compute Risk Score
-- ============================================

CREATE OR REPLACE FUNCTION compute_risk_score(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_new_bid_amount DECIMAL
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_bid_frequency NUMERIC;
  v_bid_jump NUMERIC;
  v_account_age_days INTEGER;
  v_verification_status TEXT;
  v_device_consistency NUMERIC;
  v_bidder_overlap INTEGER;
BEGIN
  -- Factor 1: Bid frequency (bids in last 5 minutes)
  SELECT COUNT(*) INTO v_bid_frequency
  FROM bids
  WHERE bidder_id = p_bidder_id
  AND created_at > NOW() - INTERVAL '5 minutes';

  IF v_bid_frequency > 3 THEN
    v_score := v_score + 0.15;
  END IF;

  -- Factor 2: Bid jump (% increase from previous bid)
  v_bid_jump := (p_new_bid_amount - (
    SELECT COALESCE(MAX(amount), 0)
    FROM bids
    WHERE auction_id = p_auction_id
    AND created_at < NOW() - INTERVAL '10 seconds'
  )) / NULLIF((
    SELECT COALESCE(MAX(amount), p_new_bid_amount)
    FROM bids
    WHERE auction_id = p_auction_id
  ), 0);

  IF v_bid_jump > 0.5 THEN
    v_score := v_score + 0.20;
  END IF;

  -- Factor 3: Account age
  SELECT EXTRACT(DAY FROM (NOW() - created_at))::INTEGER INTO v_account_age_days
  FROM profiles
  WHERE id = p_bidder_id;

  IF COALESCE(v_account_age_days, 0) < 7 THEN
    v_score := v_score + 0.25;
  ELSIF COALESCE(v_account_age_days, 0) < 30 THEN
    v_score := v_score + 0.10;
  END IF;

  -- Factor 4: Verification status
  SELECT verification_status INTO v_verification_status
  FROM profiles
  WHERE id = p_bidder_id;

  IF v_verification_status != 'verified' THEN
    v_score := v_score + 0.15;
  END IF;

  -- Factor 5: Bidder overlap (same bidders in recent auctions)
  SELECT COUNT(*) INTO v_bidder_overlap
  FROM (
    SELECT DISTINCT bidder_id
    FROM bids b
    WHERE b.auction_id IN (
      SELECT id FROM auctions
      WHERE seller_id = (SELECT seller_id FROM auctions WHERE id = p_auction_id)
      AND end_time > NOW() - INTERVAL '7 days'
    )
    AND b.bidder_id = p_bidder_id
  ) overlapping;

  IF v_bidder_overlap > 5 THEN
    v_score := v_score + 0.10;
  END IF;

  -- Normalize score to [0, 1]
  RETURN LEAST(1.0, v_score);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-create audit log on bid
-- ============================================

CREATE OR REPLACE FUNCTION log_bid_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_risk_score NUMERIC;
BEGIN
  v_risk_score := compute_risk_score(NEW.auction_id, NEW.bidder_id, NEW.amount);

  INSERT INTO audit_log (
    event_type, user_id, resource_type, resource_id, action,
    new_value, risk_score, policy_version, hmac_signature
  ) VALUES (
    'bid_placed', NEW.bidder_id, 'bid', NEW.id, 'CREATE',
    jsonb_build_object(
      'amount', NEW.amount,
      'auction_id', NEW.auction_id,
      'bidder_id', NEW.bidder_id
    ),
    v_risk_score,
    '1.0',
    encode(
      digest(
        (NOW()::text || NEW.id::text || NEW.bidder_id::text),
        'sha256'
      ),
      'hex'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_bid_trigger
AFTER INSERT ON bids
FOR EACH ROW EXECUTE FUNCTION log_bid_audit();

-- ============================================
-- Enable Realtime for New Tables
-- ============================================
-- Note: Enable via Supabase Dashboard:
-- Database > Replication > Enable for:
-- - risk_scores
-- - governance_actions
-- - orders
-- - payments
-- - disputes
-- - audit_log
