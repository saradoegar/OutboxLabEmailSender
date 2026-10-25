import { redisConnection } from '../config/redis';

export interface RateLimitCheckResult {
  allowed: boolean;
  nextAvailableWindowMs: number;
  currentCount: number;
}

/**
 * Returns a deterministic hourly key format: ratelimit:{senderId}:{YYYY-MM-DD-HH}
 */
export function getHourlyRateLimitKey(senderId: string, date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `ratelimit:${senderId}:${yyyy}-${mm}-${dd}-${hh}`;
}

/**
 * Calculates milliseconds until the next UTC clock hour begins.
 */
export function getMillisecondsUntilNextHour(now: Date = new Date()): number {
  const nextHour = new Date(now);
  nextHour.setUTCMinutes(0, 0, 0);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  return Math.max(1000, nextHour.getTime() - now.getTime());
}

/**
 * Distributed rate limiter using Redis INCR and TTL.
 * Checks and increments the hourly sending count for a sender.
 */
export async function checkAndIncrementRateLimit(
  senderId: string,
  maxPerHour: number
): Promise<RateLimitCheckResult> {
  const now = new Date();
  const key = getHourlyRateLimitKey(senderId, now);

  // Atomically increment the counter in Redis
  const currentCount = await redisConnection.incr(key);

  // Set expiration on first increment (3600s TTL + 60s buffer)
  if (currentCount === 1) {
    await redisConnection.expire(key, 3660);
  }

  // Under or at limit: allowed
  if (currentCount <= maxPerHour) {
    return {
      allowed: true,
      nextAvailableWindowMs: 0,
      currentCount,
    };
  }

  // Exceeded limit: calculate time until the next clock hour begins
  const nextAvailableWindowMs = getMillisecondsUntilNextHour(now);

  console.warn(
    `[RateLimiter] Limit exceeded for sender ${senderId}: count=${currentCount}, max=${maxPerHour}. Next window in ${Math.round(
      nextAvailableWindowMs / 1000
    )}s`
  );

  return {
    allowed: false,
    nextAvailableWindowMs,
    currentCount,
  };
}

/**
 * Returns the current usage count for the current hour window without incrementing.
 */
export async function getRateLimitStatus(senderId: string): Promise<{ count: number; key: string }> {
  const key = getHourlyRateLimitKey(senderId);
  const raw = await redisConnection.get(key);
  return {
    count: raw ? parseInt(raw, 10) : 0,
    key,
  };
}
