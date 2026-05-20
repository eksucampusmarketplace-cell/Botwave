import { NextResponse } from 'next/server';
import { landingPages } from '@/lib/landing/data';

const LANDING_CHUNK_SIZE = 5000;

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
