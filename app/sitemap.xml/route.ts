import { NextResponse } from 'next/server';
import { allSitemapChunkIds } from '@/lib/sitemap-config';

// Sitemap index is cheap to render and changes only on deploy. Force-static
// so it is served from a built file without touching Node CPU.
export const dynamic = 'force-static';
export const revalidate = 86400;

// Build timestamp used as the index's <lastmod>. Deploys regenerate it; in
// between deploys the static file is reused, so GSC always sees a consistent
// freshness signal that matches the chunks themselves.
const BUILD_LASTMOD = new Date().toISOString();

export async function GET() {
  const baseUrl = 'https://www.botwave.online';
  const ids = allSitemapChunkIds();

  const sitemaps = ids
    .map(
      (id) =>
        `  <sitemap>\n    <loc>${baseUrl}/sitemap/${id}.xml</loc>\n    <lastmod>${BUILD_LASTMOD}</lastmod>\n  </sitemap>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // stale-while-revalidate lets the CDN keep serving the previous
      // index while a regen is in flight — GSC never sees a 5xx even if
      // the upstream is slow.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
