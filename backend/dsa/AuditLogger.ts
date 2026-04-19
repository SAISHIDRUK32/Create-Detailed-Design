/**
 * Audit Logging System
 *
 * Features:
 * - HMAC-signed events (tamper-proof)
 * - Comprehensive event tracking
 * - Admin override logging
 * - Risk scoring integration
 * - Policy version tracking
 */

import { supabase } from '../config/supabase';
import * as crypto from 'crypto';

const AUDIT_SECRET = process.env.AUDIT_HMAC_SECRET || 'audit-secret-key';

export interface AuditEvent {
  eventType: string;
  userId?: string;
  resourceType: string;
  resourceId: string;
  action: string; // CREATE, UPDATE, DELETE, VIEW, EXPORT
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  riskScore?: number;
  governanceActionId?: string;
  policyVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  adminOverride?: boolean;
  adminId?: string;
  overrideReason?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(event: AuditEvent): Promise<string> {
  const auditId = generateAuditId();
  const timestamp = new Date();

  // Create event payload
  const eventPayload = {
    id: auditId,
    eventType: event.eventType,
    userId: event.userId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    action: event.action,
    oldValue: event.oldValue || null,
    newValue: event.newValue || null,
    riskScore: event.riskScore || null,
    governanceActionId: event.governanceActionId,
    policyVersion: event.policyVersion || '1.0',
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    adminOverride: event.adminOverride || false,
    adminId: event.adminId,
    overrideReason: event.overrideReason,
    timestamp: timestamp.toISOString(),
  };

  // Generate HMAC signature
  const hmacSignature = generateHMAC(eventPayload);

  // Store in database
  const { data, error } = await supabase
    .from('audit_log')
    .insert({
      ...eventPayload,
      hmac_signature: hmacSignature,
      is_valid: true,
      created_at: timestamp.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log audit event:', error);
    throw error;
  }

  console.log(`📝 Audit logged: ${event.eventType} on ${event.resourceType}`);

  return auditId;
}

/**
 * Log bid placement with risk score
 */
export async function logBidPlaced(
  bidderId: string,
  auctionId: string,
  bidAmount: number,
  riskScore: number,
  ipAddress?: string
): Promise<string> {
  return logAuditEvent({
    eventType: 'bid_placed',
    userId: bidderId,
    resourceType: 'bid',
    resourceId: auctionId,
    action: 'CREATE',
    newValue: {
      auctionId,
      bidderId,
      amount: bidAmount,
    },
    riskScore,
    policyVersion: '1.0',
    ipAddress,
  });
}

/**
 * Log auction created
 */
export async function logAuctionCreated(
  sellerId: string,
  auctionId: string,
  auctionData: Record<string, any>
): Promise<string> {
  return logAuditEvent({
    eventType: 'auction_created',
    userId: sellerId,
    resourceType: 'auction',
    resourceId: auctionId,
    action: 'CREATE',
    newValue: auctionData,
  });
}

/**
 * Log payment processed
 */
export async function logPaymentProcessed(
  buyerId: string,
  orderId: string,
  amount: number,
  status: string
): Promise<string> {
  return logAuditEvent({
    eventType: 'payment_processed',
    userId: buyerId,
    resourceType: 'payment',
    resourceId: orderId,
    action: 'CREATE',
    newValue: {
      orderId,
      amount,
      status,
    },
  });
}

/**
 * Log governance action triggered
 */
export async function logGovernanceActionTriggered(
  auctionId: string,
  actionType: string,
  riskScore: number,
  governanceActionId: string,
  reason: string
): Promise<string> {
  return logAuditEvent({
    eventType: 'governance_action_triggered',
    resourceType: 'governance_action',
    resourceId: auctionId,
    action: 'CREATE',
    newValue: {
      auctionId,
      actionType,
      reason,
    },
    riskScore,
    governanceActionId,
    policyVersion: '1.0',
  });
}

/**
 * Log admin action (with override reason)
 */
export async function logAdminAction(
  adminId: string,
  actionType: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, any>,
  overrideReason: string
): Promise<string> {
  return logAuditEvent({
    eventType: actionType,
    userId: adminId,
    resourceType,
    resourceId,
    action: 'UPDATE',
    newValue: changes,
    adminOverride: true,
    adminId,
    overrideReason,
    policyVersion: '1.0',
  });
}

/**
 * Log dispute opened
 */
export async function logDisputeOpened(
  initiatorId: string,
  orderId: string,
  reason: string,
  description: string
): Promise<string> {
  return logAuditEvent({
    eventType: 'dispute_opened',
    userId: initiatorId,
    resourceType: 'dispute',
    resourceId: orderId,
    action: 'CREATE',
    newValue: {
      orderId,
      reason,
      description,
    },
  });
}

/**
 * Log dispute resolved
 */
export async function logDisputeResolved(
  adminId: string,
  disputeId: string,
  resolution: string,
  winnerSide: string
): Promise<string> {
  return logAuditEvent({
    eventType: 'dispute_resolved',
    userId: adminId,
    resourceType: 'dispute',
    resourceId: disputeId,
    action: 'UPDATE',
    newValue: {
      resolution,
      winnerSide,
    },
    adminId,
    adminOverride: true,
    overrideReason: `Dispute resolution: ${winnerSide} wins`,
  });
}

/**
 * Log user action (login, logout, etc.)
 */
export async function logUserAction(
  userId: string,
  actionType: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return logAuditEvent({
    eventType: actionType,
    userId,
    resourceType: 'user',
    resourceId: userId,
    action: 'UPDATE',
    ipAddress,
    userAgent,
  });
}

/**
 * Verify audit log integrity (check HMAC signatures)
 */
export async function verifyAuditLogIntegrity(auditId: string): Promise<boolean> {
  const { data: auditLog, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('id', auditId)
    .single();

  if (error || !auditLog) {
    console.error('Audit log not found');
    return false;
  }

  // Reconstruct event payload
  const eventPayload = {
    id: auditLog.id,
    eventType: auditLog.event_type,
    userId: auditLog.user_id,
    resourceType: auditLog.resource_type,
    resourceId: auditLog.resource_id,
    action: auditLog.action,
    oldValue: auditLog.old_value,
    newValue: auditLog.new_value,
    riskScore: auditLog.risk_score,
    governanceActionId: auditLog.governance_action_id,
    policyVersion: auditLog.policy_version,
    ipAddress: auditLog.ip_address,
    userAgent: auditLog.user_agent,
    adminOverride: auditLog.admin_override,
    adminId: auditLog.admin_id,
    overrideReason: auditLog.override_reason,
    timestamp: auditLog.created_at,
  };

  // Compute expected HMAC
  const expectedHMAC = generateHMAC(eventPayload);

  // Compare
  const isValid = constantTimeCompare(auditLog.hmac_signature, expectedHMAC);

  if (!isValid) {
    console.error(`⚠️  AUDIT LOG TAMPERING DETECTED: ${auditId}`);

    // Mark as invalid
    await supabase
      .from('audit_log')
      .update({ is_valid: false })
      .eq('id', auditId);
  }

  return isValid;
}

/**
 * Generate HMAC signature for audit event
 */
function generateHMAC(eventPayload: any): string {
  const dataToSign = JSON.stringify(eventPayload);
  const hmac = crypto.createHmac('sha256', AUDIT_SECRET);
  hmac.update(dataToSign);
  return hmac.digest('hex');
}

/**
 * Constant-time string comparison (prevent timing attacks)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate unique audit event ID
 */
function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Retrieve audit trail for resource
 */
export async function getAuditTrail(
  resourceType: string,
  resourceId: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to retrieve audit trail:', error);
    return [];
  }

  // Verify integrity of all entries
  for (const entry of data) {
    const isValid = await verifyAuditLogIntegrity(entry.id);
    if (!isValid) {
      console.warn(`⚠️  Audit entry ${entry.id} failed integrity check`);
    }
  }

  return data;
}

/**
 * Retrieve admin actions audit trail
 */
export async function getAdminActionsAuditTrail(
  adminId: string,
  limit: number = 100
): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('admin_id', adminId)
    .eq('admin_override', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to retrieve admin audit trail:', error);
    return [];
  }

  return data;
}

/**
 * Retrieve high-risk events audit trail
 */
export async function getHighRiskEventsAuditTrail(
  minimumRiskScore: number = 0.7,
  limit: number = 100
): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .gte('risk_score', minimumRiskScore)
    .order('risk_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to retrieve high-risk events:', error);
    return [];
  }

  return data;
}

/**
 * Generate audit report
 */
export async function generateAuditReport(
  startDate: Date,
  endDate: Date,
  resourceType?: string
): Promise<{
  totalEvents: number;
  adminActions: number;
  highRiskEvents: number;
  tamperedEntries: number;
  summary: Record<string, number>;
}> {
  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { count: totalEvents } = await query;

  const { count: adminActions } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('admin_override', true)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { count: highRiskEvents } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .gte('risk_score', 0.7)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { count: tamperedEntries } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('is_valid', false)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  return {
    totalEvents: totalEvents || 0,
    adminActions: adminActions || 0,
    highRiskEvents: highRiskEvents || 0,
    tamperedEntries: tamperedEntries || 0,
    summary: {
      avgRiskPerDay: (highRiskEvents || 0) / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      adminActionsPerDay: (adminActions || 0) / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    },
  };
}

export default {
  logAuditEvent,
  logBidPlaced,
  logAuctionCreated,
  logPaymentProcessed,
  logGovernanceActionTriggered,
  logAdminAction,
  logDisputeOpened,
  logDisputeResolved,
  logUserAction,
  verifyAuditLogIntegrity,
  getAuditTrail,
  getAdminActionsAuditTrail,
  getHighRiskEventsAuditTrail,
  generateAuditReport,
};
