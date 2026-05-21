import { NextResponse } from 'next/server';
import { landingPages } from '@/lib/landing/data';

// Must match LANDING_CHUNK_SIZE in app/sitemap.ts — both files reference the
// same chunk count. Keep them in sync.
const LANDING_CHUNK_SIZE = 2000;

// Sitemap index is cheap to render and changes only on deploy. Force-static
// so it is served from a built file without touching Node CPU.
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  const baseUrl = 'https://www.botwave.online';
  const landingChunks = Math.ceil(landingPages.length / LANDING_CHUNK_SIZE);

  const ids = [0, 1, 2, 3];
  for (let i = 0; i < landingChunks; i++) {
    ids.push(10 + i);
  }

  const sitemaps = ids
    .map(
      (id) =>
        `  <sitemap>\n    <loc>${baseUrl}/sitemap/${id}.xml</loc>\n  </sitemap>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
