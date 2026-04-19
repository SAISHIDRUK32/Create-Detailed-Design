/**
 * Stripe Payment Integration
 *
 * Handles:
 * - Payment processing (creation, confirmation)
 * - Retry logic (exponential backoff)
 * - Webhook handling
 * - Idempotency
 * - Refunds & chargebacks
 * - Payout management
 */

import { supabase } from '../config/supabase';

// Initialize Stripe (in production, use real API key from environment)
const STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';

export interface PaymentRequest {
  orderId: string;
  buyerId: string;
  amount: number;
  currency: string;
  description: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Create a payment intent and process payment
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // Generate idempotency key if not provided
  const idempotencyKey = request.idempotencyKey || generateIdempotencyKey(request.orderId);

  console.log(`💳 Processing payment for order ${request.orderId} (${request.amount} ${request.currency})`);

  try {
    // Check for duplicate payment
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', request.orderId)
      .eq('status', 'completed')
      .single();

    if (existingPayment) {
      console.log(`⚠️  Payment already processed for order ${request.orderId}`);
      return {
        paymentId: existingPayment.id,
        status: 'completed',
        transactionId: existingPayment.transaction_id,
      };
    }

    // Create payment record in database
    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        order_id: request.orderId,
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        payment_method: 'stripe',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Create Stripe payment intent
    const paymentIntent = await createStripePaymentIntent({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      description: request.description,
      idempotency_key: idempotencyKey,
      metadata: {
        orderId: request.orderId,
        buyerId: request.buyerId,
      },
    });

    // Update payment record with Stripe intent ID
    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'processing',
      })
      .eq('id', paymentRecord.id);

    // Log payment attempt
    await logPaymentAttempt(paymentRecord.id, 1, 'processing', null);

    // Handle payment confirmation (in production, wait for webhook)
    if (paymentIntent.status === 'succeeded') {
      return await confirmPayment(paymentRecord.id, paymentIntent.id);
    }

    return {
      paymentId: paymentRecord.id,
      status: 'processing',
    };
  } catch (error: any) {
    console.error(`❌ Payment processing error:`, error);

    return {
      paymentId: request.orderId,
      status: 'failed',
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.message || 'Payment processing failed',
    };
  }
}

/**
 * Create Stripe payment intent (mock implementation)
 */
async function createStripePaymentIntent(params: any): Promise<any> {
  // In production, call actual Stripe API:
  // const response = await fetch('https://api.stripe.com/v1/payment_intents', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${STRIPE_API_KEY}`,
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  //   body: new URLSearchParams(params),
  // });

  // Mock response for now
  return {
    id: `pi_${generateRandomId()}`,
    status: 'succeeded',
    amount: params.amount,
    currency: params.currency,
    metadata: params.metadata,
  };
}

/**
 * Confirm payment after successful charge
 */
async function confirmPayment(paymentId: string, transactionId: string): Promise<PaymentResult> {
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  // Update payment status
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (updateError) throw updateError;

  // Update order status to paid
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id);

  // Log successful payment
  await logPaymentAttempt(paymentId, 1, 'success', null);

  console.log(`✅ Payment confirmed: ${transactionId}`);

  return {
    paymentId,
    status: 'completed',
    transactionId,
  };
}

/**
 * Retry failed payment with exponential backoff
 */
export async function retryFailedPayment(paymentId: string): Promise<PaymentResult> {
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  // Get previous attempts
  const { data: attempts } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('payment_id', paymentId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attemptNumber = (attempts?.[0]?.attempt_number || 0) + 1;

  if (attemptNumber > 5) {
    console.log(`❌ Max retry attempts (5) reached for payment ${paymentId}`);
    return {
      paymentId,
      status: 'failed',
      errorMessage: 'Max retry attempts reached',
    };
  }

  // Calculate exponential backoff delay
  const delaySeconds = Math.pow(2, attemptNumber - 1) * 60; // 1, 2, 4, 8, 16 minutes

  console.log(`🔄 Retrying payment ${paymentId} (attempt ${attemptNumber}) in ${delaySeconds}s`);

  // Update payment attempt record
  await supabase
    .from('payment_attempts')
    .insert({
      payment_id: paymentId,
      attempt_number: attemptNumber,
      status: 'pending',
      retry_after_seconds: delaySeconds,
      next_retry_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    });

  // Schedule retry (in production, use job queue like Bull/RabbitMQ)
  scheduleRetry(paymentId, delaySeconds);

  return {
    paymentId,
    status: 'pending',
  };
}

/**
 * Schedule payment retry
 */
function scheduleRetry(paymentId: string, delaySeconds: number): void {
  // In production, use job queue (Bull, RabbitMQ, etc.)
  setTimeout(async () => {
    console.log(`🔄 Executing retry for payment ${paymentId}`);

    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) return;

      // Retry payment
      const result = await processPayment({
        orderId: payment.order_id,
        buyerId: '', // Would need to fetch from order
        amount: Number(payment.amount),
        currency: payment.currency,
        description: `Retry payment for order ${payment.order_id}`,
      });

      if (result.status === 'failed') {
        await retryFailedPayment(paymentId);
      }
    } catch (error) {
      console.error(`Error executing retry:`, error);
    }
  }, delaySeconds * 1000);
}

/**
 * Process refund
 */
export async function processRefund(
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<{ refundId: string; status: string }> {
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  const refundAmount = amount || Number(payment.amount);

  console.log(`💸 Processing refund of ${refundAmount} for payment ${paymentId}`);

  // Create refund record
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({
      payment_id: paymentId,
      amount: refundAmount,
      reason: reason || 'Customer requested refund',
      status: 'processing',
    })
    .select()
    .single();

  if (refundError) throw refundError;

  // In production, call Stripe refund API
  // const stripeRefund = await refundViaStripe(payment.stripe_payment_intent_id, refundAmount);

  // Update refund status
  await supabase
    .from('refunds')
    .update({
      status: 'completed',
      stripe_refund_id: `re_${generateRandomId()}`,
    })
    .eq('id', refund.id);

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  console.log(`✅ Refund processed: ${refund.id}`);

  return {
    refundId: refund.id,
    status: 'completed',
  };
}

/**
 * Process seller payout
 */
export async function processSellerPayout(
  sellerId: string,
  orderIds: string[],
  releaseDate: Date
): Promise<{ payoutId: string; amount: number }> {
  // Calculate total amount for orders
  const { data: orders } = await supabase
    .from('orders')
    .select('winning_bid_amount')
    .in('id', orderIds);

  const totalAmount = orders?.reduce((sum, order) => sum + Number(order.winning_bid_amount), 0) || 0;
  const platformFee = totalAmount * 0.05; // 5% platform fee
  const netAmount = totalAmount - platformFee;

  const { data: payout, error } = await supabase
    .from('payouts')
    .insert({
      seller_id: sellerId,
      amount: totalAmount,
      fee: platformFee,
      net_amount: netAmount,
      status: 'pending',
      payout_method: 'stripe',
      release_date: releaseDate.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`💰 Payout scheduled for seller ${sellerId}: $${netAmount}`);

  return {
    payoutId: payout.id,
    amount: netAmount,
  };
}

/**
 * Handle Stripe webhook
 */
export async function handleStripeWebhook(event: any): Promise<void> {
  console.log(`🔔 Stripe webhook: ${event.type}`);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;

    case 'payout.paid':
      await handlePayoutPaid(event.data.object);
      break;

    default:
      console.log(`⚠️  Unhandled webhook type: ${event.type}`);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    await confirmPayment(payment.id, paymentIntent.id);
  }
}

async function handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message,
      })
      .eq('id', payment.id);

    // Schedule retry
    await retryFailedPayment(payment.id);
  }
}

async function handleChargeRefunded(charge: any): Promise<void> {
  console.log(`💸 Charge refunded: ${charge.id}`);
}

async function handlePayoutPaid(payout: any): Promise<void> {
  const { error } = await supabase
    .from('payouts')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payout_id', payout.id);

  if (!error) {
    console.log(`✅ Payout paid: ${payout.id}`);
  }
}

/**
 * Log payment attempt
 */
async function logPaymentAttempt(
  paymentId: string,
  attemptNumber: number,
  status: string,
  errorCode?: string | null
): Promise<void> {
  await supabase
    .from('payment_attempts')
    .insert({
      payment_id: paymentId,
      attempt_number: attemptNumber,
      status,
      error_code: errorCode,
    });
}

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(orderId: string): string {
  return `order-${orderId}-${Date.now()}`;
}

/**
 * Generate random ID
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default {
  processPayment,
  retryFailedPayment,
  processRefund,
  processSellerPayout,
  handleStripeWebhook,
};
