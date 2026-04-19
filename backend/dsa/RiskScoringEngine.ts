/**
 * Risk Scoring Engine - AI/ML Fraud Detection
 *
 * Detects: shill bidding, collusion, sniping, account abuse
 * Input: bid patterns, account age, device consistency, timing
 * Output: risk score [0, 1] + risk level + governance actions
 */

import { supabase } from '../config/supabase';

export interface RiskFactors {
  bidFrequency: number;        // Bids per minute
  bidJump: number;             // Jump % from last bid
  accountAge: number;          // Days old
  verificationStatus: string;
  deviceConsistency: number;   // [0, 1]
  bidderOverlap: number;       // Auctions with same bidders
  previousDisputes: number;
  paymentHistory: string;      // 'good' | 'problem' | 'unknown'
  suspiciousTiming: boolean;   // Last bid within 30 seconds
}

export interface RiskScore {
  score: number;               // [0, 1]
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactors;
  reason: string;
  governanceActions: string[]; // Auto-triggered actions
  threshold: {
    extendAuction: boolean;    // > 0.70
    raiseIncrement: boolean;   // > 0.80
    requireVerification: boolean; // > 0.90
    suspendBidding: boolean;   // > 0.95
  };
}

/**
 * Main risk scoring function
 */
export async function computeRiskScore(
  auctionId: string,
  bidderId: string,
  newBidAmount: number
): Promise<RiskScore> {
  const factors = await extractRiskFactors(auctionId, bidderId, newBidAmount);
  const score = calculateRiskScore(factors);
  const riskLevel = getRiskLevel(score);
  const governanceActions = determineGovernanceActions(score, factors);
  const reason = generateRiskReason(factors, score);

  const thresholds = {
    extendAuction: score > 0.70,
    raiseIncrement: score > 0.80,
    requireVerification: score > 0.90,
    suspendBidding: score > 0.95,
  };

  // Store risk score in database
  await storeRiskScore(auctionId, bidderId, score, riskLevel, factors, reason);

  // Trigger governance actions if needed
  if (governanceActions.length > 0) {
    await triggerGovernanceActions(auctionId, score, governanceActions, factors);
  }

  return {
    score,
    riskLevel,
    factors,
    reason,
    governanceActions,
    threshold: thresholds,
  };
}

/**
 * Extract all risk factors for a bidder
 */
async function extractRiskFactors(
  auctionId: string,
  bidderId: string,
  newBidAmount: number
): Promise<RiskFactors> {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', bidderId)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Get current auction
  const { data: auction } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (!auction) {
    throw new Error('Auction not found');
  }

  // Factor 1: Bid frequency (bids in last 5 minutes)
  const { count: bidFrequency } = await supabase
    .from('bids')
    .select('*', { count: 'exact' })
    .eq('bidder_id', bidderId)
    .gt('created_at', new Date(Date.now() - 5 * 60000).toISOString());

  // Factor 2: Bid jump (% increase from last bid)
  const { data: lastBids } = await supabase
    .from('bids')
    .select('amount')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastBidAmount = lastBids?.[0]?.amount || auction.starting_price;
  const bidJump = ((newBidAmount - lastBidAmount) / lastBidAmount) * 100;

  // Factor 3: Account age (days)
  const createdAt = new Date(profile.created_at);
  const accountAge = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Factor 4: Verification status
  const verificationStatus = profile.verification_status;

  // Factor 5: Device consistency
  const deviceConsistency = await calculateDeviceConsistency(bidderId);

  // Factor 6: Bidder overlap (same bidders in seller's recent auctions)
  const { count: bidderOverlap } = await supabase
    .from('bids')
    .select('*', { count: 'exact' })
    .eq('bidder_id', bidderId)
    .in(
      'auction_id',
      (
        await supabase
          .from('auctions')
          .select('id')
          .eq('seller_id', auction.seller_id)
          .gt('end_time', new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString())
      ).data?.map(a => a.id) || []
    );

  // Factor 7: Previous disputes
  const { count: previousDisputes } = await supabase
    .from('disputes')
    .select('*', { count: 'exact' })
    .eq('initiator_id', bidderId)
    .eq('status', 'open');

  // Factor 8: Payment history
  const paymentHistory = await getPaymentHistory(bidderId);

  // Factor 9: Suspicious timing (bid within 30 seconds of auction end)
  const timeToEnd = new Date(auction.end_time).getTime() - Date.now();
  const suspiciousTiming = timeToEnd < 30000 && timeToEnd > 0;

  return {
    bidFrequency: bidFrequency || 0,
    bidJump,
    accountAge,
    verificationStatus,
    deviceConsistency,
    bidderOverlap: bidderOverlap || 0,
    previousDisputes: previousDisputes || 0,
    paymentHistory,
    suspiciousTiming,
  };
}

/**
 * Calculate risk score from factors (0-1)
 */
function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  // 1. Bid frequency weight: 15%
  if (factors.bidFrequency > 3) score += 0.15;
  else if (factors.bidFrequency > 1) score += 0.08;

  // 2. Bid jump weight: 20%
  if (factors.bidJump > 50) score += 0.20;
  else if (factors.bidJump > 25) score += 0.12;
  else if (factors.bidJump > 10) score += 0.05;

  // 3. Account age weight: 25%
  if (factors.accountAge < 3) score += 0.25;
  else if (factors.accountAge < 7) score += 0.18;
  else if (factors.accountAge < 30) score += 0.10;

  // 4. Verification status weight: 15%
  if (factors.verificationStatus === 'unverified') score += 0.15;
  else if (factors.verificationStatus === 'pending') score += 0.08;

  // 5. Device consistency weight: 10%
  score += (1 - factors.deviceConsistency) * 0.10;

  // 6. Bidder overlap weight: 10%
  if (factors.bidderOverlap > 5) score += 0.10;
  else if (factors.bidderOverlap > 2) score += 0.05;

  // 7. Previous disputes weight: 5%
  if (factors.previousDisputes > 0) score += Math.min(0.05, factors.previousDisputes * 0.02);

  // 8. Payment history weight: 10%
  if (factors.paymentHistory === 'problem') score += 0.10;
  else if (factors.paymentHistory === 'unknown') score += 0.05;

  // 9. Suspicious timing weight: 15%
  if (factors.suspiciousTiming) score += 0.15;

  // Normalize to [0, 1]
  return Math.min(1.0, score);
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 0.35) return 'low';
  if (score < 0.65) return 'medium';
  if (score < 0.85) return 'high';
  return 'critical';
}

/**
 * Determine governance actions based on score
 */
function determineGovernanceActions(score: number, factors: RiskFactors): string[] {
  const actions: string[] = [];

  if (score > 0.70) {
    actions.push('extend_time'); // Add 2 minutes
  }

  if (score > 0.80) {
    actions.push('raise_increment'); // Double the minimum increment
  }

  if (score > 0.90) {
    actions.push('require_verification'); // Step-up MFA/verification
  }

  if (score > 0.95) {
    actions.push('hold_payment'); // Hold payment pending review
  }

  // Additional rules based on specific factors
  if (factors.bidderOverlap > 5 && factors.accountAge < 7) {
    actions.push('pause_auction'); // Suspicious pattern
  }

  if (factors.previousDisputes > 2) {
    actions.push('require_verification');
  }

  return Array.from(new Set(actions)); // Remove duplicates
}

/**
 * Generate human-readable risk reason
 */
function generateRiskReason(factors: RiskFactors, score: number): string {
  const reasons: string[] = [];

  if (factors.accountAge < 3) {
    reasons.push('brand new account');
  }

  if (factors.bidJump > 50) {
    reasons.push(`aggressive bid jump (+${factors.bidJump.toFixed(1)}%)`);
  }

  if (factors.bidFrequency > 3) {
    reasons.push(`high bid frequency (${factors.bidFrequency} in 5 min)`);
  }

  if (factors.verificationStatus === 'unverified') {
    reasons.push('unverified account');
  }

  if (factors.suspiciousTiming) {
    reasons.push('suspicious timing (snipe bid)');
  }

  if (factors.bidderOverlap > 5) {
    reasons.push(`pattern: bidding in ${factors.bidderOverlap} seller auctions`);
  }

  if (factors.deviceConsistency < 0.5) {
    reasons.push('multiple devices/IPs');
  }

  if (factors.paymentHistory === 'problem') {
    reasons.push('payment issues on record');
  }

  const riskLevel = getRiskLevel(score);
  return `${riskLevel.toUpperCase()} RISK: ${reasons.join(', ')}`;
}

/**
 * Calculate device consistency (0-1, 1 = all same device)
 */
async function calculateDeviceConsistency(userId: string): Promise<number> {
  const { data: devices } = await supabase
    .from('devices')
    .select('device_fingerprint')
    .eq('user_id', userId);

  if (!devices || devices.length === 0) return 0.5; // Unknown
  if (devices.length === 1) return 1.0; // Single device

  const uniqueDevices = new Set(devices.map(d => d.device_fingerprint)).size;
  return 1 - (uniqueDevices - 1) / devices.length;
}

/**
 * Get payment history status
 */
async function getPaymentHistory(userId: string): Promise<string> {
  const { data: payments } = await supabase
    .from('payments')
    .select('status')
    .eq('order_id', (
      await supabase
        .from('orders')
        .select('id')
        .eq('buyer_id', userId)
    ).data?.[0]?.id)
    .in('status', ['failed', 'cancelled']);

  if (!payments || payments.length === 0) return 'good';
  if (payments.length > 2) return 'problem';
  return 'unknown';
}

/**
 * Store risk score in database
 */
async function storeRiskScore(
  auctionId: string,
  bidderId: string,
  score: number,
  riskLevel: string,
  factors: RiskFactors,
  reason: string
): Promise<void> {
  await supabase
    .from('risk_scores')
    .insert({
      auction_id: auctionId,
      bidder_id: bidderId,
      score,
      risk_level: riskLevel,
      factors: factors as any,
      reason,
      model_version: '1.0',
    });
}

/**
 * Trigger governance actions
 */
async function triggerGovernanceActions(
  auctionId: string,
  score: number,
  actions: string[],
  factors: RiskFactors
): Promise<void> {
  for (const action of actions) {
    const parameters: Record<string, any> = {};

    if (action === 'extend_time') {
      parameters.extend_minutes = 2 + Math.round(score * 3); // 2-5 minutes
    }

    if (action === 'raise_increment') {
      const { data: auction } = await supabase
        .from('auctions')
        .select('min_increment')
        .eq('id', auctionId)
        .single();

      if (auction) {
        parameters.new_increment = auction.min_increment * 2;
      }
    }

    await supabase
      .from('governance_actions')
      .insert({
        auction_id: auctionId,
        action_type: action,
        trigger_reason: 'high_risk_score',
        parameters,
        status: 'pending',
        audit_log: `Auto-triggered by risk score: ${score.toFixed(3)} (${factors.suspiciousTiming ? 'snipe detected' : 'pattern detected'})`,
      });
  }

  // Log to audit log
  await supabase
    .from('audit_log')
    .insert({
      event_type: 'governance_triggered',
      resource_type: 'auction',
      resource_id: auctionId,
      action: 'CREATE',
      new_value: { score, actions, factors },
      risk_score: score,
      hmac_signature: generateHMAC(auctionId, score),
    });
}

/**
 * Generate HMAC signature for audit log
 */
function generateHMAC(data: string, score: number): string {
  // In production, use crypto library
  // For now, return a placeholder
  return `hmac-${data.substring(0, 8)}-${score.toFixed(3)}`;
}

export default {
  computeRiskScore,
  extractRiskFactors,
  calculateRiskScore,
  getRiskLevel,
};
