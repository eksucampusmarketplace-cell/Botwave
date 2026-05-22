'use client';

import { currentReviewDate, formatReviewDate } from '@/lib/content/reviewed';

/**
 * Small footer line: "Last reviewed: May 2026".
 *
 * Renders both the human-readable label AND a hidden machine-readable
 * <time datetime="..."> so Google can pick it up as the page's
 * publish/modified marker. Pair with sitemap `<lastmod>` sourced from
 * the same `currentReviewDate()` so the two signals match.
 *
 * Bump `lib/content/reviewed.ts` monthly to refresh the entire catalogue
 * in one config change — no per-page edits needed.
 */
export default function LastReviewed({ className = '' }: { className?: string }) {
  const date = currentReviewDate();
  const iso = date.toISOString();
  const label = formatReviewDate(date);
  return (
    <p
      className={`text-xs text-slate-500 ${className}`}
      data-testid="last-reviewed"
    >
      Last reviewed:{' '}
      <time dateTime={iso}>{label}</time>
    </p>
  );
}
