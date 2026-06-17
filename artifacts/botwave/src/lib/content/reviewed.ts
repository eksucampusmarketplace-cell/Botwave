/**
 * Single source of truth for "when did we last review this content".
 *
 * Why this exists:
 *   Search engines (Google + Bing) compare a page's sitemap `<lastmod>`
 *   against the actual rendered HTML on recrawl. If `<lastmod>` keeps
 *   advancing but the HTML body is byte-for-byte identical, they learn
 *   to ignore your freshness signals site-wide. That's the trap most
 *   programmatic SEO sites fall into.
 *
 *   This module fixes that by tying both the page's rendered
 *   "Last reviewed: <Month YYYY>" line AND the sitemap `<lastmod>` value
 *   to the same constant. Bump `CURRENT_REVIEW_DATE` once a month and:
 *     1. Every page that renders <LastReviewed /> changes its HTML
 *        (the date text updates), so the HTML hash differs.
 *     2. Every URL in the sitemap whose `<lastmod>` is sourced from
 *        `currentReviewDate()` advances by the same amount.
 *   Both signals stay in sync, so search engines see honest freshness.
 *
 * How to bump it:
 *   Edit the YEAR/MONTH constants below (or set CONTENT_REVIEW_OVERRIDE
 *   env var in CI) at the start of each month. That's it.
 *
 * Override for testing:
 *   `CONTENT_REVIEW_OVERRIDE=2026-07-01` will pin the review date to
 *   July 2026 regardless of the constants below. Useful for QA.
 */

// Bump this once a month. Treat as: "we've re-read the catalogue and
// confirmed everything is still accurate as of this date."
const REVIEW_YEAR = 2026;
const REVIEW_MONTH = 5; // 1-indexed, so 5 = May

function buildDate(): Date {
  const override = typeof process !== 'undefined' ? process.env.CONTENT_REVIEW_OVERRIDE : undefined;
  if (override) {
    const parsed = new Date(override);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Use the 1st of the month at 00:00 UTC. Day-of-month doesn't matter
  // for the freshness signal, and pinning to the 1st keeps the timestamp
  // identical across the whole month no matter when builds run.
  return new Date(Date.UTC(REVIEW_YEAR, REVIEW_MONTH - 1, 1));
}

/**
 * The canonical "last reviewed" date for evergreen content. Use this for:
 *   - Sitemap `<lastmod>` on landing pages and other evergreen URLs
 *   - The user-visible "Last reviewed" line rendered on those pages
 *
 * Returns a fresh Date object on each call so callers can safely mutate
 * it without affecting subsequent reads.
 */
export function currentReviewDate(): Date {
  return buildDate();
}

/**
 * Human-friendly formatter for the rendered "Last reviewed" line.
 *   formatReviewDate(new Date(Date.UTC(2026, 4, 1))) // "May 2026"
 */
export function formatReviewDate(d: Date = currentReviewDate()): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Short version, e.g. "May '26". For compact contexts (cards, badges).
 */
export function formatReviewDateShort(d: Date = currentReviewDate()): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
}
