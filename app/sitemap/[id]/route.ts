import { NextResponse } from 'next/server';

import { getChunkUrls, renderSitemapXml } from '@/lib/sitemap/chunks';
import { allSitemapChunkIds } from '@/lib/sitemap-config';

// Per-chunk sitemap handler at /sitemap/<id>.xml.
//
// Why this exists instead of Next.js's `generateSitemaps` metadata API:
//   * metadata sitemaps run with `force-static` (silently skipped chunks
//     under build memory pressure → GSC saw "Couldn't fetch") or
//     `force-dynamic` (responses always carry `Cache-Control: max-age=0,
//     must-revalidate`, which `next.config.js#headers()` can't override —
//     so the edge had to revalidate every fetch and slow chunks occasionally
//     timed out on Googlebot's side).
//   * A plain route handler lets us set our own Cache-Control:
//     s-maxage=86400 + stale-while-revalidate=604800. That gives Caddy a
//     hot cache for a full day after the first fetch, and a stale-but-fresh
//     copy for an entire week while a regen runs in the background, so GSC
//     never sees a slow upstream.
//
// Accepted segment shapes:
//   /sitemap/0          → id = 0
//   /sitemap/0.xml      → id = 0 (canonical, matches old URLs in GSC)
//   /sitemap/11.xml     → id = 11
// Anything that doesn't parse to a non-negative integer → 404. We are
// strict here because Google's crawler caches 404s for a long time, and
// we never want a malformed URL to silently succeed with an empty body.
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const raw = params.id ?? '';
  const stripped = raw.endsWith('.xml') ? raw.slice(0, -4) : raw;
  const id = Number(stripped);

  if (!Number.isInteger(id) || id < 0) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Reject chunk IDs that aren't part of the index. Without this, a crawler
  // probing /sitemap/9999.xml would get an empty <urlset> and treat it as
  // a real (just-empty) sitemap, which clutters GSC. Returning 404 keeps
  // discovery aligned with what /sitemap.xml advertises.
  const validIds = new Set(allSitemapChunkIds());
  if (!validIds.has(id)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const entries = getChunkUrls(id);
  const xml = renderSitemapXml(entries);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // 1h browser cache, 24h shared/edge cache, 7d stale-while-revalidate.
      // SWR is the key bit — GSC always gets an instant cached response,
      // and the regen runs in the background even if it takes several
      // seconds, so no more "Couldn't fetch" entries in Search Console.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
