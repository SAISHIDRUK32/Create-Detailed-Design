/**
 * Dispute Resolution Workflow
 *
 * State machine for handling buyer/seller disputes:
 * open → under_review → in_mediation → resolved/refunded/escalated → closed
 *
 * Features:
 * - Automated evidence collection
 * - Timeline tracking (response deadlines, resolution deadlines)
 * - Admin mediation tools
 * - Automatic resolution logic
 * - Appeal handling
 */

import { supabase } from '../config/supabase';
import { logDisputeOpened, logDisputeResolved, logAdminAction } from './AuditLogger';

export type DisputeStatus = 'open' | 'under_review' | 'in_mediation' | 'resolved' | 'refunded' | 'escalated' | 'closed';
export type DisputeReason = 'not_received' | 'not_as_described' | 'defective' | 'other_issue' | 'seller_nonresponsive' | 'shipping_late' | 'payment_issue';

export interface Dispute {
  id: string;
  orderId: string;
  initiatorId: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence: Evidence[];
  openedAt: Date;
  responseDeadline: Date;
  resolutionDeadline: Date;
  resolvedAt?: Date;
  resolution?: string;
  adminId?: string;
  notes: string[];
}

export interface Evidence {
  url: string;
  type: 'image' | 'video' | 'document' | 'message' | 'receipt';
  uploadedBy: 'buyer' | 'seller';
  uploadedAt: Date;
  description?: string;
}

export interface DisputeResolution {
  decision: 'buyer_wins' | 'seller_wins' | 'split';
  reason: string;
  refundAmount: number;
  reasoning: string[];
}

/**
 * Open a new dispute
 */
export async function openDispute(
  orderId: string,
  initiatorId: string,
  reason: DisputeReason,
  description: string
): Promise<string> {
  console.log(`📝 Opening dispute for order ${orderId}`);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const now = new Date();
  const responseDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
  const resolutionDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      order_id: orderId,
      initiator_id: initiatorId,
      reason,
      description,
      status: 'open',
      evidence: [],
      opened_at: now.toISOString(),
      response_deadline: responseDeadline.toISOString(),
      resolution_deadline: resolutionDeadline.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await logDisputeOpened(initiatorId, orderId, reason, description);

  // Send notifications
  const otherPartyId = initiatorId === order.buyer_id ? order.seller_id : order.buyer_id;
  await notifyDisputeOpened(dispute.id, otherPartyId, reason);

  console.log(`✅ Dispute opened: ${dispute.id}`);

  return dispute.id;
}

/**
 * Add evidence to dispute
 */
export async function addDisputeEvidence(
  disputeId: string,
  userId: string,
  evidence: Evidence
): Promise<void> {
  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (fetchError || !dispute) throw new Error('Dispute not found');

  // Validate status
  if (!['open', 'under_review', 'in_mediation'].includes(dispute.status)) {
    throw new Error(`Cannot add evidence to dispute in status: ${dispute.status}`);
  }

  // Validate deadline
  if (new Date() > new Date(dispute.response_deadline)) {
    throw new Error('Response deadline has passed');
  }

  // Add evidence
  const updatedEvidence = [...(dispute.evidence || []), evidence];

  const { error: updateError } = await supabase
    .from('disputes')
    .update({
      evidence: updatedEvidence,
    })
    .eq('id', disputeId);

  if (updateError) throw updateError;

  console.log(`📸 Evidence added to dispute ${disputeId}`);
}

/**
 * Add admin note to dispute
 */
export async function addDisputeNote(
  disputeId: string,
  adminId: string,
  note: string
): Promise<void> {
  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (fetchError || !dispute) throw new Error('Dispute not found');

  const notes = [...(dispute.notes || []), `[${new Date().toISOString()}] Admin: ${note}`];

  await supabase
    .from('disputes')
    .update({ notes })
    .eq('id', disputeId);

  console.log(`📌 Note added to dispute ${disputeId}`);
}

/**
 * Move dispute to under_review status
 */
export async function reviewDispute(disputeId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('disputes')
    .update({
      status: 'under_review',
    })
    .eq('id', disputeId);

  if (error) throw error;

  await logAdminAction(adminId, 'dispute_review_started', 'dispute', disputeId, { status: 'under_review' }, 'Starting review');

  console.log(`🔍 Dispute ${disputeId} moved to under_review`);
}

/**
 * Auto-resolve dispute based on rules
 */
export async function autoResolveDispute(disputeId: string): Promise<DisputeResolution | null> {
  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (fetchError || !dispute) throw new Error('Dispute not found');

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', dispute.order_id)
    .single();

  if (!order) throw new Error('Order not found');

  let resolution: DisputeResolution | null = null;
  const reasoning: string[] = [];

  // Rule 1: Not received - check shipment status
  if (dispute.reason === 'not_received') {
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', dispute.order_id)
      .single();

    if (!shipment || shipment.status !== 'delivered') {
      resolution = {
        decision: 'buyer_wins',
        reason: 'Shipment not delivered',
        refundAmount: Number(order.winning_bid_amount),
        reasoning: ['Tracking shows shipment not delivered', 'Buyer entitled to full refund'],
      };
    }
  }

  // Rule 2: Not as described - buyer has evidence
  if (dispute.reason === 'not_as_described' && dispute.evidence.length > 0) {
    const photoEvidence = dispute.evidence.filter(e => e.type === 'image');
    if (photoEvidence.length > 0) {
      resolution = {
        decision: 'buyer_wins',
        reason: 'Item not as described (photo evidence)',
        refundAmount: Number(order.winning_bid_amount) * 0.5, // 50% refund (item damaged)
        reasoning: ['Photo evidence shows different condition', 'Partial refund for damaged item'],
      };
    }
  }

  // Rule 3: Seller non-responsive (> 48h since dispute opened)
  if (dispute.reason === 'seller_nonresponsive') {
    const hoursSinceOpened = (new Date().getTime() - new Date(dispute.opened_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceOpened > 48) {
      resolution = {
        decision: 'buyer_wins',
        reason: 'Seller failed to respond',
        refundAmount: Number(order.winning_bid_amount),
        reasoning: ['Seller did not respond within 48 hours', 'Buyer entitled to full refund'],
      };
    }
  }

  // Rule 4: Payment issue
  if (dispute.reason === 'payment_issue') {
    resolution = {
      decision: 'buyer_wins',
      reason: 'Payment processing error',
      refundAmount: Number(order.winning_bid_amount),
      reasoning: ['Payment gateway error', 'Full refund issued'],
    };
  }

  // If auto-resolution found, apply it
  if (resolution) {
    await applyDisputeResolution(disputeId, resolution, null);
  }

  return resolution;
}

/**
 * Apply dispute resolution
 */
export async function applyDisputeResolution(
  disputeId: string,
  resolution: DisputeResolution,
  adminId?: string
): Promise<void> {
  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (fetchError || !dispute) throw new Error('Dispute not found');

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', dispute.order_id)
    .single();

  if (!order) throw new Error('Order not found');

  // Update dispute status
  const { error: disputeUpdateError } = await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution: JSON.stringify(resolution),
      admin_id: adminId,
    })
    .eq('id', disputeId);

  if (disputeUpdateError) throw disputeUpdateError;

  // Handle refund based on decision
  if (resolution.decision === 'buyer_wins' && resolution.refundAmount > 0) {
    // Get payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .single();

    if (payment) {
      // Create refund
      await supabase
        .from('refunds')
        .insert({
          payment_id: payment.id,
          dispute_id: disputeId,
          amount: resolution.refundAmount,
          reason: `Dispute resolved: ${resolution.reason}`,
          status: 'processing',
        });

      console.log(`💸 Refund initiated: ${resolution.refundAmount}`);
    }
  } else if (resolution.decision === 'seller_wins') {
    // Buyer loses - mark as resolved without refund
    console.log(`✅ Dispute resolved in seller's favor`);
  } else if (resolution.decision === 'split') {
    // Split decision
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .single();

    if (payment) {
      await supabase
        .from('refunds')
        .insert({
          payment_id: payment.id,
          dispute_id: disputeId,
          amount: resolution.refundAmount,
          reason: `Dispute split decision: ${resolution.reason}`,
          status: 'processing',
        });

      console.log(`⚖️  Split refund initiated: ${resolution.refundAmount}`);
    }
  }

  // Log resolution
  await logDisputeResolved(
    adminId || 'system',
    disputeId,
    resolution.reason,
    resolution.decision
  );

  console.log(`✅ Dispute resolved: ${resolution.decision}`);
}

/**
 * Escalate dispute to admin review
 */
export async function escalateDispute(
  disputeId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('disputes')
    .update({
      status: 'escalated',
    })
    .eq('id', disputeId);

  if (error) throw error;

  // Add note
  await addDisputeNote(disputeId, 'system', `Escalated: ${reason}`);

  console.log(`⚠️  Dispute ${disputeId} escalated`);
}

/**
 * Close dispute (move to completed)
 */
export async function closeDispute(disputeId: string): Promise<void> {
  const { error } = await supabase
    .from('disputes')
    .update({
      status: 'closed',
    })
    .eq('id', disputeId);

  if (error) throw error;

  console.log(`📋 Dispute ${disputeId} closed`);
}

/**
 * Get pending disputes needing admin action
 */
export async function getPendingDisputes(): Promise<Dispute[]> {
  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('*')
    .in('status', ['open', 'under_review', 'in_mediation'])
    .order('response_deadline', { ascending: true });

  if (error) {
    console.error('Failed to fetch disputes:', error);
    return [];
  }

  return disputes as Dispute[];
}

/**
 * Check for overdue disputes
 */
export async function checkOverdueDisputes(): Promise<void> {
  const now = new Date();
  const { data: disputes } = await supabase
    .from('disputes')
    .select('*')
    .lte('resolution_deadline', now.toISOString())
    .in('status', ['open', 'under_review', 'in_mediation']);

  if (!disputes || disputes.length === 0) return;

  console.log(`⚠️  Found ${disputes.length} overdue disputes`);

  for (const dispute of disputes) {
    // Auto-resolve if deadline passed
    try {
      const resolution = await autoResolveDispute(dispute.id);
      if (!resolution) {
        // Default to buyer wins if deadline passed
        await applyDisputeResolution(dispute.id, {
          decision: 'buyer_wins',
          reason: 'Resolution deadline exceeded',
          refundAmount: dispute.order_id ? 100 : 0,
          reasoning: ['Resolution deadline passed without admin decision', 'Defaulting to buyer win'],
        });
      }
    } catch (error) {
      console.error(`Error auto-resolving dispute ${dispute.id}:`, error);
    }
  }
}

/**
 * Notify parties about dispute
 */
async function notifyDisputeOpened(
  disputeId: string,
  recipientId: string,
  reason: DisputeReason
): Promise<void> {
  console.log(`🔔 Notifying user ${recipientId} about dispute ${disputeId}`);

  // In production, send email/SMS notification
  // await sendEmailNotification(recipientId, `Dispute opened: ${reason}`);
}

export default {
  openDispute,
  addDisputeEvidence,
  addDisputeNote,
  reviewDispute,
  autoResolveDispute,
  applyDisputeResolution,
  escalateDispute,
  closeDispute,
  getPendingDisputes,
  checkOverdueDisputes,
};
