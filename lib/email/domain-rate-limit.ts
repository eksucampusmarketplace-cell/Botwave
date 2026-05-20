/**
 * Email Domain Rate Limiter
 * 
 * Prevents hitting sending limits for major email providers.
 * Tracks emails sent per domain per hour and enforces limits.
 */

// Default limits per domain per hour
const DOMAIN_LIMITS: Record<string, number> = {
  'gmail.com': 50,
  'googlemail.com': 50,
  'yahoo.com': 40,
  'yahoo.co.uk': 40,
  'hotmail.com': 40,
  'outlook.com': 40,
  'live.com': 40,
  'aol.com': 30,
  'icloud.com': 30,
  'me.com': 30,
  'mac.com': 30,
};

const DEFAULT_LIMIT = 100; // per hour for unknown domains

// In-memory counters: domain -> { count, windowStart }
const domainCounters = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 3600_000; // 1 hour

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || 'unknown';
}

/**
 * Check if sending to this domain is allowed.
 * Returns true if under the rate limit.
 */
export function checkDomainRateLimit(email: string): boolean {
  const domain = extractDomain(email);
  const limit = DOMAIN_LIMITS[domain] || DEFAULT_LIMIT;
  const now = Date.now();

  const counter = domainCounters.get(domain);
  if (!counter || now - counter.windowStart > WINDOW_MS) {
    // New window
    domainCounters.set(domain, { count: 1, windowStart: now });
    return true;
  }

  if (counter.count >= limit) {
    console.warn(`[EMAIL-RATE] Domain ${domain} rate limit reached (${counter.count}/${limit} per hour)`);
    return false;
  }

  counter.count++;
  return true;
}

/**
 * Get remaining quota for a domain.
 */
export function getDomainQuota(email: string): { sent: number; limit: number; remaining: number } {
  const domain = extractDomain(email);
  const limit = DOMAIN_LIMITS[domain] || DEFAULT_LIMIT;
  const counter = domainCounters.get(domain);

  if (!counter || Date.now() - counter.windowStart > WINDOW_MS) {
    return { sent: 0, limit, remaining: limit };
  }

  return {
    sent: counter.count,
    limit,
    remaining: Math.max(0, limit - counter.count),
  };
}

// Cleanup expired counters every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [domain, counter] of domainCounters) {
    if (now - counter.windowStart > WINDOW_MS * 2) {
      domainCounters.delete(domain);
    }
  }
}, 900_000);
