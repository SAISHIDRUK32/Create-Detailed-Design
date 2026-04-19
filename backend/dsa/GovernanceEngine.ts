/**
 * Governance Actions Engine
 *
 * Automatically executes governance actions based on risk scores:
 * - Extends auction time (anti-snipe)
 * - Raises minimum bid increment
 * - Requires user verification
 * - Holds payment for review
 * - Pauses or cancels suspicious auctions
 */

import { supabase } from '../config/supabase';

export interface GovernanceAction {
  id: string;
  auctionId: string;
  actionType: 'extend_time' | 'raise_increment' | 'require_verification' | 'hold_payment' | 'pause_auction' | 'cancel_auction';
  triggerReason: string;
  riskScoreId?: string;
  parameters: Record<string, any>;
  status: 'pending' | 'applied' | 'cancelled' | 'failed';
  appliedAt?: Date;
}

/**
 * Apply governance action
 */
export async function applyGovernanceAction(action: GovernanceAction): Promise<void> {
  console.log(`🔧 Applying governance action: ${action.actionType}`, action);

  try {
    switch (action.actionType) {
      case 'extend_time':
        await extendAuctionTime(action.auctionId, action.parameters.extend_minutes);
        break;

      case 'raise_increment':
        await raiseMinimumIncrement(action.auctionId, action.parameters.new_increment);
        break;

      case 'require_verification':
        await requireUserVerification(action.auctionId, action.parameters.bidder_id);
        break;

      case 'hold_payment':
        await holdPaymentForReview(action.auctionId, action.parameters.order_id);
        break;

      case 'pause_auction':
        await pauseAuction(action.auctionId);
        break;

      case 'cancel_auction':
        await cancelAuction(action.auctionId, action.parameters.reason);
        break;

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }

    // Mark action as applied
    await supabase
      .from('governance_actions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', action.id);

    console.log(`✅ Governance action applied: ${action.actionType}`);
  } catch (error) {
    console.error(`❌ Failed to apply governance action:`, error);

    // Mark action as failed
    await supabase
      .from('governance_actions')
      .update({
        status: 'failed',
      })
      .eq('id', action.id);

    throw error;
  }
}

/**
 * Extend auction end time (anti-snipe protection)
 */
async function extendAuctionTime(auctionId: string, minutes: number): Promise<void> {
  const { data: auction } = await supabase
    .from('auctions')
    .select('end_time')
    .eq('id', auctionId)
    .single();

  if (!auction) throw new Error('Auction not found');

  const newEndTime = new Date(new Date(auction.end_time).getTime() + minutes * 60000);

  const { error } = await supabase
    .from('auctions')
    .update({
      end_time: newEndTime.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  if (error) throw error;

  // Log to auction events
  await logAuctionEvent(auctionId, 'extended', {
    extend_minutes: minutes,
    new_end_time: newEndTime,
    reason: 'Anti-snipe protection triggered',
  });

  console.log(`⏱️  Extended auction ${auctionId} by ${minutes} minutes`);
}

/**
 * Raise minimum bid increment (slow down bidding)
 */
async function raiseMinimumIncrement(auctionId: string, newIncrement: number): Promise<void> {
  const { data: auction } = await supabase
    .from('auctions')
    .select('min_increment')
    .eq('id', auctionId)
    .single();

  if (!auction) throw new Error('Auction not found');

  const { error } = await supabase
    .from('auctions')
    .update({
      min_increment: newIncrement,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  if (error) throw error;

  // Log to auction events
  await logAuctionEvent(auctionId, 'increment_raised', {
    old_increment: auction.min_increment,
    new_increment: newIncrement,
    reason: 'Risk mitigation - slowing down suspicious bids',
  });

  console.log(`📊 Raised minimum increment for auction ${auctionId} to $${newIncrement}`);
}

/**
 * Require user verification (MFA/KYC step-up)
 */
async function requireUserVerification(auctionId: string, bidderId: string): Promise<void> {
  // Create verification requirement in database
  const { error } = await supabase
    .from('governance_actions')
    .insert({
      auction_id: auctionId,
      action_type: 'require_verification',
      trigger_reason: 'risk_step_up',
      parameters: {
        required_verification_types: ['email', 'phone'],
        deadline_hours: 24,
      },
      status: 'applied',
      audit_log: `User ${bidderId} required to verify identity before bidding continues`,
    });

  if (error) throw error;

  // Notify user
  console.log(`🔐 User ${bidderId} required to verify identity for auction ${auctionId}`);
}

/**
 * Hold payment for manual review
 */
async function holdPaymentForReview(auctionId: string, orderId: string): Promise<void> {
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'hold_pending_review',
    })
    .eq(
      'order_id',
      orderId || (await supabase.from('orders').select('id').eq('auction_id', auctionId)).data?.[0]?.id
    );

  if (paymentError) throw paymentError;

  // Log to audit
  await supabase
    .from('audit_log')
    .insert({
      event_type: 'payment_held',
      resource_type: 'payment',
      resource_id: orderId,
      action: 'UPDATE',
      new_value: { status: 'hold_pending_review' },
      audit_log: 'Payment held for admin review due to high-risk score',
      hmac_signature: generateHMAC(`payment-${orderId}-hold`),
    });

  console.log(`💳 Payment held for review on order ${orderId}`);
}

/**
 * Pause auction temporarily (for investigation)
 */
async function pauseAuction(auctionId: string): Promise<void> {
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  if (error) throw error;

  // Log to auction events
  await logAuctionEvent(auctionId, 'paused', {
    reason: 'Suspicious activity detected - pending admin review',
  });

  console.log(`⏸️  Paused auction ${auctionId} for investigation`);
}

/**
 * Cancel auction (for severe fraud patterns)
 */
async function cancelAuction(auctionId: string, reason: string): Promise<void> {
  const { data: auction } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (!auction) throw new Error('Auction not found');

  // Cancel auction
  const { error: cancelError } = await supabase
    .from('auctions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId);

  if (cancelError) throw cancelError;

  // Refund all bids
  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('status', 'winning');

  if (bids && bids.length > 0) {
    for (const bid of bids) {
      // Create refund record
      await supabase
        .from('refunds')
        .insert({
          order_id: null,
          amount: bid.amount,
          reason: `Auction cancelled: ${reason}`,
          status: 'pending',
        });
    }
  }

  // Log to audit
  await logAuctionEvent(auctionId, 'cancelled', {
    reason,
    refund_reason: `Auction cancelled due to: ${reason}`,
  });

  console.log(`🚫 Cancelled auction ${auctionId}. Reason: ${reason}`);
}

/**
 * Log auction event (for audit trail)
 */
async function logAuctionEvent(
  auctionId: string,
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  await supabase
    .from('auction_events')
    .insert({
      auction_id: auctionId,
      event_type: eventType,
      data,
    });
}

/**
 * Process pending governance actions
 */
export async function processPendingGovernanceActions(): Promise<void> {
  const { data: pendingActions } = await supabase
    .from('governance_actions')
    .select('*')
    .eq('status', 'pending');

  if (!pendingActions || pendingActions.length === 0) {
    console.log('✅ No pending governance actions');
    return;
  }

  console.log(`🔄 Processing ${pendingActions.length} pending governance actions...`);

  for (const action of pendingActions) {
    try {
      await applyGovernanceAction(action as any);
    } catch (error) {
      console.error(`❌ Error processing action ${action.id}:`, error);
    }
  }
}

/**
 * Monitor auctions for governance action triggers
 * Run this as a cron job every minute
 */
export async function monitorAuctionsForGovernanceActions(): Promise<void> {
  const { data: highRiskScores } = await supabase
    .from('risk_scores')
    .select('*')
    .gt('score', 0.70)
    .order('score', { ascending: false });

  if (!highRiskScores || highRiskScores.length === 0) {
    return;
  }

  console.log(`⚠️  Monitoring ${highRiskScores.length} high-risk bids...`);

  for (const riskScore of highRiskScores) {
    // Check if governance actions already triggered
    const { data: existingActions } = await supabase
      .from('governance_actions')
      .select('*')
      .eq('auction_id', riskScore.auction_id)
      .eq('risk_score_id', riskScore.id);

    if (existingActions && existingActions.length > 0) {
      continue; // Already triggered
    }

    // Determine and trigger actions
    const actions = determineGovernanceActions(riskScore.score);

    for (const actionType of actions) {
      const { error } = await supabase
        .from('governance_actions')
        .insert({
          auction_id: riskScore.auction_id,
          action_type: actionType,
          trigger_reason: 'high_risk_score',
          risk_score_id: riskScore.id,
          parameters: getActionParameters(actionType, riskScore.score),
          status: 'pending',
          audit_log: `Auto-triggered by risk score: ${riskScore.score}`,
        });

      if (error) {
        console.error(`Failed to create governance action:`, error);
      }
    }
  }

  // Process all pending actions
  await processPendingGovernanceActions();
}

/**
 * Determine which governance actions to trigger based on score
 */
function determineGovernanceActions(score: number): string[] {
  const actions: string[] = [];

  if (score > 0.95) {
    actions.push('hold_payment');
    actions.push('require_verification');
  } else if (score > 0.90) {
    actions.push('require_verification');
    actions.push('raise_increment');
  } else if (score > 0.80) {
    actions.push('raise_increment');
    actions.push('extend_time');
  } else if (score > 0.70) {
    actions.push('extend_time');
  }

  return actions;
}

/**
 * Get parameters for specific action
 */
function getActionParameters(actionType: string, riskScore: number): Record<string, any> {
  const params: Record<string, any> = {};

  if (actionType === 'extend_time') {
    params.extend_minutes = 2 + Math.round(riskScore * 3); // 2-5 minutes
  }

  if (actionType === 'raise_increment') {
    params.multiply_by = 1.5 + riskScore * 0.5; // 1.5x to 2x
  }

  return params;
}

/**
 * Generate HMAC for audit log
 */
function generateHMAC(data: string): string {
  // In production, use proper crypto library
  const timestamp = Date.now();
  return `hmac-${data.substring(0, 8)}-${timestamp}`;
}

export default {
  applyGovernanceAction,
  processPendingGovernanceActions,
  monitorAuctionsForGovernanceActions,
};
