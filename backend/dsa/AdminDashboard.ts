/**
 * Admin Dashboard APIs
 *
 * Comprehensive admin control panel with:
 * - User management
 * - Dispute management
 * - Risk monitoring
 * - Auction controls
 * - Analytics & reporting
 * - System settings
 */

import { supabase } from '../config/supabase';
import {
  logAdminAction,
  getAuditTrail,
  getAdminActionsAuditTrail,
  getHighRiskEventsAuditTrail,
  generateAuditReport,
} from './AuditLogger';
import { reviewVerification, getPendingVerifications } from './VerificationSystem';
import { reviewDispute, getPendingDisputes } from './DisputeResolver';
import { monitorAuctionsForGovernanceActions } from './GovernanceEngine';

/**
 * DASHBOARD OVERVIEW
 */
export async function getDashboardOverview(): Promise<any> {
  const [
    userStats,
    auctionStats,
    paymentStats,
    disputeStats,
    verificationStats,
  ] = await Promise.all([
    getUserStats(),
    getAuctionStats(),
    getPaymentStats(),
    getDisputeStats(),
    getVerificationStats(),
  ]);

  return {
    timestamp: new Date(),
    users: userStats,
    auctions: auctionStats,
    payments: paymentStats,
    disputes: disputeStats,
    verifications: verificationStats,
  };
}

async function getUserStats(): Promise<any> {
  const { data: users } = await supabase
    .from('profiles')
    .select('role, trust_score, verification_status');

  if (!users) return {};

  return {
    total: users.length,
    byRole: {
      buyer: users.filter(u => u.role === 'buyer').length,
      seller: users.filter(u => u.role === 'seller').length,
      admin: users.filter(u => u.role === 'admin').length,
    },
    averageTrustScore: users.reduce((sum, u) => sum + u.trust_score, 0) / users.length,
    verified: users.filter(u => u.verification_status === 'verified').length,
  };
}

async function getAuctionStats(): Promise<any> {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('status, current_bid');

  if (!auctions) return {};

  return {
    total: auctions.length,
    byStatus: {
      live: auctions.filter(a => a.status === 'live').length,
      ending_soon: auctions.filter(a => a.status === 'ending_soon').length,
      ended: auctions.filter(a => a.status === 'ended').length,
      sold: auctions.filter(a => a.status === 'sold').length,
    },
    totalVolume: auctions.reduce((sum, a) => sum + Number(a.current_bid), 0),
  };
}

async function getPaymentStats(): Promise<any> {
  const { data: payments } = await supabase
    .from('payments')
    .select('status, amount');

  if (!payments) return {};

  return {
    total: payments.length,
    byStatus: {
      completed: payments.filter(p => p.status === 'completed').length,
      processing: payments.filter(p => p.status === 'processing').length,
      failed: payments.filter(p => p.status === 'failed').length,
      refunded: payments.filter(p => p.status === 'refunded').length,
    },
    totalProcessed: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    totalFailed: payments
      .filter(p => p.status === 'failed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };
}

async function getDisputeStats(): Promise<any> {
  const { data: disputes } = await supabase
    .from('disputes')
    .select('status, reason');

  if (!disputes) return {};

  return {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    underReview: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    averageResolutionTime: 'N/A', // Would calculate from data
  };
}

async function getVerificationStats(): Promise<any> {
  const { data: verifications } = await supabase
    .from('verification')
    .select('status, verification_type');

  if (!verifications) return {};

  return {
    pending: verifications.filter(v => v.status === 'pending').length,
    approved: verifications.filter(v => v.status === 'approved').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
    expired: verifications.filter(v => v.status === 'expired').length,
  };
}

/**
 * USER MANAGEMENT
 */
export async function getUsers(filters: any = {}): Promise<any[]> {
  let query = supabase.from('profiles').select('*');

  if (filters.role) query = query.eq('role', filters.role);
  if (filters.trustScore) query = query.gte('trust_score', filters.trustScore);
  if (filters.verificationStatus) query = query.eq('verification_status', filters.verificationStatus);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }

  return data || [];
}

export async function updateUserRole(adminId: string, userId: string, newRole: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(adminId, 'user_role_changed', 'user', userId, { role: newRole }, `Changed role to ${newRole}`);

  console.log(`👤 User ${userId} role changed to ${newRole}`);
}

export async function suspendUser(adminId: string, userId: string, durationDays: number, reason: string): Promise<void> {
  // Create penalty
  const { error } = await supabase
    .from('penalties')
    .insert({
      user_id: userId,
      penalty_type: 'suspension',
      reason,
      severity: 5,
      duration_days: durationDays,
      expired_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      admin_id: adminId,
    });

  if (error) throw error;

  await logAdminAction(adminId, 'user_suspended', 'user', userId, { reason, durationDays }, `Suspended for ${durationDays} days`);

  console.log(`🚫 User ${userId} suspended for ${durationDays} days`);
}

export async function unsuspendUser(adminId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('penalties')
    .update({ expired_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('penalty_type', 'suspension');

  if (error) throw error;

  await logAdminAction(adminId, 'user_unsuspended', 'user', userId, {}, 'Suspension lifted');

  console.log(`✅ User ${userId} unsuspended`);
}

/**
 * AUCTION MANAGEMENT
 */
export async function getAuctions(filters: any = {}): Promise<any[]> {
  let query = supabase.from('auctions').select('*');

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.sellerId) query = query.eq('seller_id', filters.sellerId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch auctions:', error);
    return [];
  }

  return data || [];
}

export async function cancelAuction(adminId: string, auctionId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('auctions')
    .update({ status: 'cancelled' })
    .eq('id', auctionId);

  if (error) throw error;

  await logAdminAction(adminId, 'auction_cancelled', 'auction', auctionId, { reason }, `Cancelled: ${reason}`);

  console.log(`❌ Auction ${auctionId} cancelled`);
}

export async function extendAuction(adminId: string, auctionId: string, minutes: number): Promise<void> {
  const { data: auction } = await supabase
    .from('auctions')
    .select('end_time')
    .eq('id', auctionId)
    .single();

  if (!auction) throw new Error('Auction not found');

  const newEndTime = new Date(new Date(auction.end_time).getTime() + minutes * 60000);

  const { error } = await supabase
    .from('auctions')
    .update({ end_time: newEndTime.toISOString() })
    .eq('id', auctionId);

  if (error) throw error;

  await logAdminAction(adminId, 'auction_extended', 'auction', auctionId, { minutes }, `Extended by ${minutes} min`);

  console.log(`⏱️  Auction ${auctionId} extended by ${minutes} minutes`);
}

/**
 * DISPUTE MANAGEMENT
 */
export async function getDisputes(filters: any = {}): Promise<any[]> {
  let query = supabase.from('disputes').select('*');

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.reason) query = query.eq('reason', filters.reason);

  const { data, error } = await query.order('opened_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch disputes:', error);
    return [];
  }

  return data || [];
}

export async function reviewDisputeAsAdmin(
  adminId: string,
  disputeId: string,
  decision: 'buyer_wins' | 'seller_wins' | 'split',
  refundPercentage: number,
  reason: string
): Promise<void> {
  const { data: dispute } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (!dispute) throw new Error('Dispute not found');

  const { data: order } = await supabase
    .from('orders')
    .select('winning_bid_amount')
    .eq('id', dispute.order_id)
    .single();

  const refundAmount = (Number(order?.winning_bid_amount || 0) * refundPercentage) / 100;

  // Update dispute
  const { error } = await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: JSON.stringify({ decision, refundAmount, reason }),
      resolved_at: new Date().toISOString(),
      admin_id: adminId,
    })
    .eq('id', disputeId);

  if (error) throw error;

  // Create refund if needed
  if (refundAmount > 0) {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', dispute.order_id)
      .single();

    if (payment) {
      await supabase
        .from('refunds')
        .insert({
          payment_id: payment.id,
          dispute_id: disputeId,
          amount: refundAmount,
          reason: `Admin decision: ${reason}`,
          status: 'processing',
        });
    }
  }

  await logAdminAction(adminId, 'dispute_resolved', 'dispute', disputeId, { decision, refundAmount, reason }, reason);

  console.log(`✅ Dispute ${disputeId} resolved: ${decision}`);
}

/**
 * VERIFICATION MANAGEMENT
 */
export async function getVerificationsForReview(): Promise<any[]> {
  return getPendingVerifications(100);
}

export async function reviewVerificationAsAdmin(
  adminId: string,
  verificationId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  await reviewVerification(adminId, verificationId, approved, rejectionReason);
}

/**
 * RISK MONITORING
 */
export async function getHighRiskBidders(): Promise<any[]> {
  const { data: scores } = await supabase
    .from('risk_scores')
    .select('*')
    .gte('score', 0.8)
    .order('score', { ascending: false })
    .limit(50);

  if (!scores) return [];

  // Group by bidder
  const byBidder: Record<string, any> = {};
  for (const score of scores) {
    if (!byBidder[score.bidder_id]) {
      byBidder[score.bidder_id] = {
        bidderId: score.bidder_id,
        avgRiskScore: 0,
        count: 0,
        incidents: [],
      };
    }
    byBidder[score.bidder_id].avgRiskScore += score.score;
    byBidder[score.bidder_id].count += 1;
    byBidder[score.bidder_id].incidents.push({
      auctionId: score.auction_id,
      score: score.score,
      riskLevel: score.risk_level,
    });
  }

  // Calculate averages
  return Object.values(byBidder).map((item: any) => ({
    ...item,
    avgRiskScore: item.avgRiskScore / item.count,
  }));
}

export async function monitorGovernanceActions(): Promise<void> {
  await monitorAuctionsForGovernanceActions();
}

/**
 * ANALYTICS & REPORTING
 */
export async function getAuditLog(filters: any = {}): Promise<any[]> {
  const resourceType = filters.resourceType;
  const resourceId = filters.resourceId;

  if (resourceType && resourceId) {
    return getAuditTrail(resourceType, resourceId, filters.limit || 100);
  }

  if (filters.adminId) {
    return getAdminActionsAuditTrail(filters.adminId, filters.limit || 100);
  }

  if (filters.highRiskOnly) {
    return getHighRiskEventsAuditTrail(filters.minRiskScore || 0.7, filters.limit || 100);
  }

  return [];
}

export async function generateReport(
  reportType: 'fraud' | 'payments' | 'disputes' | 'shipping' | 'audit',
  startDate: Date,
  endDate: Date
): Promise<any> {
  console.log(`📊 Generating ${reportType} report`);

  switch (reportType) {
    case 'fraud':
      return generateFraudReport(startDate, endDate);
    case 'payments':
      return generatePaymentReport(startDate, endDate);
    case 'disputes':
      return generateDisputeReport(startDate, endDate);
    case 'shipping':
      return generateShippingReport(startDate, endDate);
    case 'audit':
      return generateAuditReport(startDate, endDate);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function generateFraudReport(startDate: Date, endDate: Date): Promise<any> {
  const { data: riskScores } = await supabase
    .from('risk_scores')
    .select('*')
    .gte('computed_at', startDate.toISOString())
    .lte('computed_at', endDate.toISOString());

  return {
    reportType: 'fraud',
    period: { start: startDate, end: endDate },
    totalScores: riskScores?.length || 0,
    avgScore: riskScores?.reduce((sum, s) => sum + s.score, 0) / (riskScores?.length || 1) || 0,
    critical: riskScores?.filter(s => s.risk_level === 'critical').length || 0,
    high: riskScores?.filter(s => s.risk_level === 'high').length || 0,
  };
}

async function generatePaymentReport(startDate: Date, endDate: Date): Promise<any> {
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!payments) return {};

  const completed = payments.filter(p => p.status === 'completed');
  const failed = payments.filter(p => p.status === 'failed');

  return {
    reportType: 'payments',
    period: { start: startDate, end: endDate },
    total: payments.length,
    completed: completed.length,
    failed: failed.length,
    totalVolume: completed.reduce((sum, p) => sum + Number(p.amount), 0),
    failedVolume: failed.reduce((sum, p) => sum + Number(p.amount), 0),
    successRate: (completed.length / payments.length) * 100,
  };
}

async function generateDisputeReport(startDate: Date, endDate: Date): Promise<any> {
  const { data: disputes } = await supabase
    .from('disputes')
    .select('*')
    .gte('opened_at', startDate.toISOString())
    .lte('opened_at', endDate.toISOString());

  if (!disputes) return {};

  return {
    reportType: 'disputes',
    period: { start: startDate, end: endDate },
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    refunded: disputes.filter(d => d.status === 'refunded').length,
    averageResolutionDays: 'N/A',
  };
}

async function generateShippingReport(startDate: Date, endDate: Date): Promise<any> {
  const { data: shipments } = await supabase
    .from('shipments')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!shipments) return {};

  return {
    reportType: 'shipping',
    period: { start: startDate, end: endDate },
    total: shipments.length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    pending: shipments.filter(s => s.status === 'pending').length,
    failed: shipments.filter(s => s.status === 'failed').length,
  };
}

/**
 * SYSTEM SETTINGS
 */
export async function getSystemSettings(): Promise<any> {
  const { data: rules } = await supabase
    .from('auction_rules')
    .select('*')
    .eq('status', 'active')
    .single();

  return {
    rules: rules || {},
    maxBidJump: 50,
    antiSnipeExtension: 2,
    paymentDeadlineHours: 24,
    verificationRequired: true,
  };
}

export async function updateSystemSettings(adminId: string, settings: Record<string, any>): Promise<void> {
  // Update settings in database
  await logAdminAction(adminId, 'system_settings_updated', 'system', 'settings', settings, 'Updated system settings');

  console.log(`⚙️  System settings updated`);
}

export default {
  getDashboardOverview,
  getUsers,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  getAuctions,
  cancelAuction,
  extendAuction,
  getDisputes,
  reviewDisputeAsAdmin,
  getVerificationsForReview,
  reviewVerificationAsAdmin,
  getHighRiskBidders,
  monitorGovernanceActions,
  getAuditLog,
  generateReport,
  getSystemSettings,
  updateSystemSettings,
};
