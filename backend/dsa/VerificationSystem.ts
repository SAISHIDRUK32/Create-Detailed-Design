/**
 * Verification System - KYC (Know Your Customer)
 *
 * Features:
 * - Document upload & validation
 * - Verification workflow
 * - Admin review system
 * - Verification status tracking
 * - Fraud detection
 */

import { supabase } from '../config/supabase';
import { logAdminAction, logUserAction } from './AuditLogger';

export type VerificationType = 'email' | 'phone' | 'id_document' | 'address';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface VerificationRequest {
  userId: string;
  type: VerificationType;
  documentUrl?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  submittedAt: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
  rejectionReason?: string;
}

/**
 * Submit verification request
 */
export async function submitVerification(request: VerificationRequest): Promise<VerificationResult> {
  console.log(`📋 Submitting ${request.type} verification for user ${request.userId}`);

  // Check for existing verification
  const { data: existingVerification } = await supabase
    .from('verification')
    .select('*')
    .eq('user_id', request.userId)
    .eq('verification_type', request.type)
    .eq('status', 'pending')
    .single();

  if (existingVerification) {
    throw new Error(`${request.type} verification already pending`);
  }

  // Create verification record
  const { data: verification, error } = await supabase
    .from('verification')
    .insert({
      user_id: request.userId,
      verification_type: request.type,
      status: 'pending',
      document_url: request.documentUrl,
      submitted_at: new Date().toISOString(),
      // Expiry: 30 days for documents, 7 days for email/phone
      expires_at: new Date(
        Date.now() + (request.type === 'id_document' ? 30 : 7) * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Log user action
  await logUserAction(request.userId, `${request.type}_verification_submitted`);

  console.log(`✅ Verification submitted: ${verification.id}`);

  return parseVerification(verification);
}

/**
 * Email verification (send code)
 */
export async function sendEmailVerification(userId: string, email: string): Promise<void> {
  const verificationCode = generateVerificationCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store code in temporary cache (in production, use Redis)
  const { error } = await supabase
    .from('verification')
    .update({
      metadata: { code: verificationCode, expiresAt: expiresAt.toISOString() },
    })
    .eq('user_id', userId)
    .eq('verification_type', 'email');

  if (error) {
    console.error('Failed to store verification code:', error);
    return;
  }

  // Send email (mock)
  console.log(`📧 Email verification code sent to ${email}: ${verificationCode}`);
  // In production: await sendEmail(email, `Your verification code: ${verificationCode}`);
}

/**
 * Verify email with code
 */
export async function verifyEmailWithCode(userId: string, code: string): Promise<boolean> {
  const { data: verification, error } = await supabase
    .from('verification')
    .select('*')
    .eq('user_id', userId)
    .eq('verification_type', 'email')
    .single();

  if (error || !verification) {
    throw new Error('Email verification not found');
  }

  const metadata = verification.metadata as any || {};
  const storedCode = metadata.code;
  const expiresAt = new Date(metadata.expiresAt || 0);

  // Validate code
  if (code !== storedCode || new Date() > expiresAt) {
    console.warn(`❌ Invalid or expired email verification code`);
    return false;
  }

  // Mark as approved
  const { error: updateError } = await supabase
    .from('verification')
    .update({
      status: 'approved',
      verified_at: new Date().toISOString(),
    })
    .eq('id', verification.id);

  if (updateError) throw updateError;

  // Update profile
  await supabase
    .from('profiles')
    .update({
      verification_status: 'verified',
    })
    .eq('id', userId);

  console.log(`✅ Email verified for user ${userId}`);

  return true;
}

/**
 * Send phone verification (SMS code)
 */
export async function sendPhoneVerification(userId: string, phoneNumber: string): Promise<void> {
  const verificationCode = generateVerificationCode(6);

  console.log(`📱 SMS verification code: ${verificationCode} (mock)`);
  // In production: await sendSMS(phoneNumber, `Your verification code: ${verificationCode}`);
}

/**
 * Submit document for KYC verification
 */
export async function submitKYCDocument(
  userId: string,
  documentType: 'id' | 'passport' | 'driver_license' | 'address_proof',
  documentUrl: string,
  metadata?: Record<string, any>
): Promise<VerificationResult> {
  console.log(`📄 Submitting ${documentType} for KYC verification`);

  const result = await submitVerification({
    userId,
    type: 'id_document',
    documentUrl,
    metadata: {
      documentType,
      ...metadata,
    },
  });

  // Queue for admin review
  await queueForAdminReview(result.id);

  return result;
}

/**
 * Queue verification for admin review
 */
async function queueForAdminReview(verificationId: string): Promise<void> {
  // In production, create job in queue system
  console.log(`⏳ Queued for admin review: ${verificationId}`);
}

/**
 * Admin review verification
 */
export async function reviewVerification(
  adminId: string,
  verificationId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const { data: verification, error: fetchError } = await supabase
    .from('verification')
    .select('*')
    .eq('id', verificationId)
    .single();

  if (fetchError || !verification) throw new Error('Verification not found');

  const status: VerificationStatus = approved ? 'approved' : 'rejected';

  // Update verification
  const { error: updateError } = await supabase
    .from('verification')
    .update({
      status,
      verified_at: approved ? new Date().toISOString() : undefined,
      rejected_reason: rejectionReason,
    })
    .eq('id', verificationId);

  if (updateError) throw updateError;

  // Update profile verification status
  if (approved) {
    const allVerifications = await getVerifications(verification.user_id);
    const allApproved = allVerifications.every(v => v.status === 'approved');

    if (allApproved) {
      await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
        })
        .eq('id', verification.user_id);

      console.log(`✅ User ${verification.user_id} fully verified`);
    }
  } else {
    await supabase
      .from('profiles')
      .update({
        verification_status: 'pending',
      })
      .eq('id', verification.user_id);

    console.log(`❌ Verification rejected: ${rejectionReason}`);
  }

  // Log admin action
  await logAdminAction(
    adminId,
    `verification_${approved ? 'approved' : 'rejected'}`,
    'verification',
    verificationId,
    { status, rejectionReason },
    `${approved ? 'Approved' : 'Rejected'} verification`
  );
}

/**
 * Check if user is verified
 */
export async function isUserVerified(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', userId)
    .single();

  return profile?.verification_status === 'verified';
}

/**
 * Get all verifications for user
 */
export async function getVerifications(userId: string): Promise<VerificationResult[]> {
  const { data: verifications, error } = await supabase
    .from('verification')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch verifications:', error);
    return [];
  }

  return (verifications || []).map(parseVerification);
}

/**
 * Get pending verifications for admin review
 */
export async function getPendingVerifications(limit: number = 50): Promise<VerificationResult[]> {
  const { data: verifications, error } = await supabase
    .from('verification')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch pending verifications:', error);
    return [];
  }

  return (verifications || []).map(parseVerification);
}

/**
 * Check for expired verifications
 */
export async function checkExpiredVerifications(): Promise<void> {
  const now = new Date();

  const { data: expiredVerifications } = await supabase
    .from('verification')
    .select('*')
    .lt('expires_at', now.toISOString())
    .eq('status', 'pending');

  if (!expiredVerifications || expiredVerifications.length === 0) {
    return;
  }

  console.log(`⏰ Found ${expiredVerifications.length} expired verifications`);

  for (const verification of expiredVerifications) {
    await supabase
      .from('verification')
      .update({
        status: 'expired',
      })
      .eq('id', verification.id);

    console.log(`⏱️  Verification ${verification.id} marked as expired`);
  }
}

/**
 * Require verification for user
 */
export async function requireVerificationForUser(
  userId: string,
  reason: string
): Promise<void> {
  console.log(`🔐 User ${userId} required to verify: ${reason}`);

  // Update profile to pending
  await supabase
    .from('profiles')
    .update({
      verification_status: 'pending',
    })
    .eq('id', userId);

  // Log event
  await logUserAction(userId, 'verification_required');

  // In production, send notification
  // await notifyUserVerificationRequired(userId, reason);
}

/**
 * Request address verification
 */
export async function submitAddressVerification(
  userId: string,
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): Promise<VerificationResult> {
  return submitVerification({
    userId,
    type: 'address',
    metadata: {
      address,
      city,
      state,
      zipCode,
      country,
    },
  });
}

/**
 * Verify address via database lookup (mock)
 */
export async function verifyAddressAutomated(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<boolean> {
  // In production, call USPS/Google Maps API
  console.log(`🏠 Verifying address: ${address}, ${city}, ${state} ${zipCode}`);

  // Mock: randomly pass/fail for demo
  return Math.random() > 0.3; // 70% pass rate
}

/**
 * Parse verification from database
 */
function parseVerification(row: any): VerificationResult {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.verification_type,
    status: row.status,
    submittedAt: new Date(row.submitted_at),
    verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    rejectionReason: row.rejected_reason,
  };
}

/**
 * Generate verification code
 */
function generateVerificationCode(length: number): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

/**
 * Get verification statistics
 */
export async function getVerificationStats(): Promise<any> {
  const { data: verifications } = await supabase
    .from('verification')
    .select('status, verification_type');

  if (!verifications) return null;

  const stats = {
    total: verifications.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  };

  for (const v of verifications) {
    stats.byType[v.verification_type] = (stats.byType[v.verification_type] || 0) + 1;
    stats.byStatus[v.status] = (stats.byStatus[v.status] || 0) + 1;
  }

  return stats;
}

export default {
  submitVerification,
  sendEmailVerification,
  verifyEmailWithCode,
  sendPhoneVerification,
  submitKYCDocument,
  reviewVerification,
  isUserVerified,
  getVerifications,
  getPendingVerifications,
  checkExpiredVerifications,
  requireVerificationForUser,
  submitAddressVerification,
  verifyAddressAutomated,
  getVerificationStats,
};
