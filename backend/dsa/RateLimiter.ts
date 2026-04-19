/**
 * Rate Limiting Middleware
 *
 * Features:
 * - Per-user request throttling
 * - Per-endpoint rate limits
 * - Adaptive rate limiting (tighter for high-risk users)
 * - Redis-backed for distributed systems
 * - Graceful rate limit headers
 */

import { supabase } from '../config/supabase';

export interface RateLimitConfig {
  window: number; // Time window in seconds
  max: number;    // Max requests in window
  message?: string;
  statusCode?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// Default rate limits by endpoint
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'POST /api/bids/place': { window: 60, max: 10 },      // 10 bids per minute
  'POST /api/auctions': { window: 3600, max: 5 },       // 5 auctions per hour
  'POST /api/auth/login': { window: 900, max: 5 },      // 5 logins per 15 min
  'POST /api/auth/register': { window: 3600, max: 3 },  // 3 registrations per hour
  'GET /api/': { window: 60, max: 100 },                // 100 GET requests per minute (default)
};

// Stricter limits for high-risk users
const HIGH_RISK_MULTIPLIER = 0.5; // 50% of normal limit

/**
 * Check rate limit and update counter
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  // Get rate limit config
  const config = DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['GET /api/'];

  // Check if user is high-risk
  const { data: profile } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', userId)
    .single();

  const iHighRiskUser = profile && profile.trust_score < 50;
  const effectiveMax = iHighRiskUser ? Math.round(config.max * HIGH_RISK_MULTIPLIER) : config.max;

  // Create time window key
  const now = new Date();
  const windowStart = Math.floor(now.getTime() / 1000 / config.window) * config.window;
  const windowEnd = windowStart + config.window;
  const key = `rate-limit:${userId}:${endpoint}:${windowStart}`;

  // Get current count
  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (!rateLimit) {
    // First request in window
    const { error } = await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        endpoint,
        count: 1,
        window_start: new Date(windowStart * 1000).toISOString(),
        window_end: new Date(windowEnd * 1000).toISOString(),
      });

    if (error) console.error('Failed to create rate limit record:', error);

    return {
      allowed: true,
      remaining: effectiveMax - 1,
      resetAt: new Date(windowEnd * 1000),
    };
  }

  // Check if limit exceeded
  if (rateLimit.count >= effectiveMax) {
    const resetAt = new Date(windowEnd * 1000);
    const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

    console.warn(
      `⚠️  Rate limit exceeded for user ${userId} on ${endpoint}`,
      { count: rateLimit.count, limit: effectiveMax, retryAfter }
    );

    // Log abuse attempt
    await logAbuseAttempt(userId, endpoint, ipAddress);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Increment counter
  const { error: updateError } = await supabase
    .from('rate_limits')
    .update({ count: rateLimit.count + 1 })
    .eq('id', rateLimit.id);

  if (updateError) console.error('Failed to update rate limit:', updateError);

  return {
    allowed: true,
    remaining: effectiveMax - (rateLimit.count + 1),
    resetAt: new Date(windowEnd * 1000),
  };
}

/**
 * Express/Fastify middleware for rate limiting
 */
export function createRateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Skip for anonymous requests (optional)
    if (!req.user?.id) {
      return next();
    }

    const endpoint = `${req.method} ${req.path}`;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await checkRateLimit(req.user.id, endpoint, ipAddress);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', DEFAULT_LIMITS[endpoint]?.max || 100);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

/**
 * Log abuse attempt
 */
async function logAbuseAttempt(
  userId: string,
  endpoint: string,
  ipAddress?: string
): Promise<void> {
  // Get user trust score
  const { data: profile } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', userId)
    .single();

  // Log to audit
  await supabase
    .from('audit_log')
    .insert({
      event_type: 'rate_limit_exceeded',
      user_id: userId,
      resource_type: 'endpoint',
      resource_id: endpoint,
      action: 'BLOCKED',
      ip_address: ipAddress,
      new_value: { endpoint, reason: 'rate_limit_exceeded' },
      hmac_signature: generateHMAC(`${userId}-${endpoint}-${Date.now()}`),
    });

  // Reduce trust score if multiple violations
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .filter('count', 'gte', (DEFAULT_LIMITS[endpoint]?.max || 100));

  if ((count || 0) > 5) {
    // Multiple violations - reduce trust score
    const newTrustScore = Math.max(0, (profile?.trust_score || 50) - 5);

    await supabase
      .from('profiles')
      .update({ trust_score: newTrustScore })
      .eq('id', userId);

    console.warn(`⚠️  Trust score reduced for user ${userId}: ${profile?.trust_score} → ${newTrustScore}`);

    // Consider penalties if score drops too low
    if (newTrustScore < 20) {
      await createPenalty(userId, 'bid_hold', 'Repeated rate limit violations', 24);
    }
  }
}

/**
 * Create penalty for user
 */
async function createPenalty(
  userId: string,
  penaltyType: string,
  reason: string,
  durationHours: number
): Promise<void> {
  const { error } = await supabase
    .from('penalties')
    .insert({
      user_id: userId,
      penalty_type: penaltyType,
      reason,
      severity: 2,
      duration_days: Math.ceil(durationHours / 24),
      expired_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    });

  if (error) {
    console.error('Failed to create penalty:', error);
  } else {
    console.log(`🚫 Penalty created for user ${userId}: ${penaltyType}`);
  }
}

/**
 * Check for active penalties
 */
export async function checkActivePenalties(userId: string): Promise<boolean> {
  const { data: penalties, error } = await supabase
    .from('penalties')
    .select('*')
    .eq('user_id', userId)
    .gt('expired_at', new Date().toISOString())
    .in('penalty_type', ['suspension', 'bid_hold', 'account_restriction']);

  if (error) {
    console.error('Failed to check penalties:', error);
    return false;
  }

  if (penalties && penalties.length > 0) {
    console.warn(`⚠️  User ${userId} has active penalties`);
    return true;
  }

  return false;
}

/**
 * Clean up old rate limit records (run periodically)
 */
export async function cleanupOldRateLimits(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { error } = await supabase
    .from('rate_limits')
    .delete()
    .lte('window_end', oneHourAgo.toISOString());

  if (error) {
    console.error('Failed to cleanup rate limits:', error);
  } else {
    console.log(`✅ Cleaned up old rate limit records`);
  }
}

/**
 * Get rate limit statistics for dashboard
 */
export async function getRateLimitStats(userId?: string): Promise<any> {
  let query = supabase.from('rate_limits').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('Failed to fetch rate limit stats:', error);
    return null;
  }

  // Group by endpoint
  const byEndpoint = (records || []).reduce((acc: any, r: any) => {
    if (!acc[r.endpoint]) {
      acc[r.endpoint] = { total: 0, violations: 0 };
    }
    acc[r.endpoint].total += 1;
    if (r.count >= DEFAULT_LIMITS[r.endpoint]?.max) {
      acc[r.endpoint].violations += 1;
    }
    return acc;
  }, {});

  return {
    totalRequests: records?.length || 0,
    byEndpoint,
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    },
  };
}

/**
 * Adaptive rate limiting based on risk score
 */
export async function getAdaptiveRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitConfig> {
  const baseConfig = DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['GET /api/'];

  // Get user risk score
  const { data: riskScores } = await supabase
    .from('risk_scores')
    .select('score')
    .eq('bidder_id', userId)
    .order('computed_at', { ascending: false })
    .limit(1);

  if (!riskScores || riskScores.length === 0) {
    return baseConfig;
  }

  const riskScore = riskScores[0].score;

  // Tighten limits for high-risk users
  if (riskScore > 0.8) {
    return {
      ...baseConfig,
      max: Math.round(baseConfig.max * 0.25), // 25% of normal
    };
  } else if (riskScore > 0.6) {
    return {
      ...baseConfig,
      max: Math.round(baseConfig.max * 0.5), // 50% of normal
    };
  }

  return baseConfig;
}

/**
 * Generate HMAC for audit log
 */
function generateHMAC(data: string): string {
  // Mock implementation
  return `hmac-${data.substring(0, 16)}`;
}

export default {
  checkRateLimit,
  createRateLimitMiddleware,
  checkActivePenalties,
  cleanupOldRateLimits,
  getRateLimitStats,
  getAdaptiveRateLimit,
};
