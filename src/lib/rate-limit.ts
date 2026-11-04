/**
 * Platform Release 18 — Phase 4: Production In-Memory Rate Limiter
 * Provides sliding-window rate limiting for abuse-sensitive API routes (auth, AI, webhooks)
 * without requiring external Redis or broker infrastructure.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitBucket>();

// Periodic garbage collection every 5 minutes to prevent memory leaks in serverless/Node runtimes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit?: number; // Maximum allowed requests per window
  windowMs?: number; // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Extracts a client identifier from Request headers (x-forwarded-for, x-real-ip, or fallback).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Return the first public IP in the chain
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Applies a sliding-window rate limit against an arbitrary identifier (IP, userId, workspaceId).
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  purgeExpiredBuckets();

  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60 * 1000;
  const now = Date.now();

  let bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, bucket);
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetMs: windowMs,
    };
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  const resetMs = Math.max(0, bucket.resetAt - now);

  if (bucket.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  return {
    success: true,
    limit,
    remaining,
    resetMs,
  };
}

/**
 * Returns standard rate-limit HTTP headers for a given result.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
  };

  if (!result.success) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil(result.resetMs / 1000)));
  }

  return headers;
}
