/**
 * Single source of truth for sitemap chunking.
 *
 * Both the sitemap index (`app/sitemap.xml/route.ts`) and the
 * per-chunk generator (`app/sitemap.ts`) MUST import from here so
 * the chunk count, chunk ID layout, and chunk size stay in sync.
 *
 * Why this matters for GSC stability:
 *
 * Google Search Console treats every `<loc>` it sees in a chunk as
 * "owned by that chunk". If a URL silently moves from
 * `/sitemap/11.xml` to `/sitemap/12.xml` between two crawls — which
 * is exactly what happens if `LANDING_CHUNK_SIZE` shrinks — GSC
 * records "Couldn't fetch" on the chunks it thinks went missing
 * and re-discovers the URLs from scratch. To avoid that, treat
 * `LANDING_CHUNK_SIZE` and the `landingPages` order as
 * append-only: never resize, never reorder.
 */
import { landingPages } from '@/lib/landing/data';

/**
 * Number of landing-page URLs per sitemap chunk.
 *
 * Sitemap protocol allows up to 50,000 URLs / 50MB per chunk. We
 * use 2000 so each chunk is small (~370KB) and renders quickly,
 * and so GSC can index each chunk independently without a single
 * slow chunk blocking the rest.
 *
 * ⚠️  DO NOT change this value once URLs are in the wild — it
 * causes every landing URL to shift to a different chunk, which
 * GSC treats as "all chunks broken".
 */
export const LANDING_CHUNK_SIZE = 2000;

/** Static (non-landing) chunk ids. */
export const STATIC_CHUNK_IDS = [
  0, // core pages
  1, // commands
  2, // docs, faq, use-cases, compare, fix, how-to, mailbox
  3, // blog
] as const;

/** First landing-chunk id. Landing chunks live at 10, 11, 12, … to leave room for new static categories. */
export const LANDING_CHUNK_ID_START = 10;

/**
 * Number of landing-page chunks needed to cover every landing page.
 * Grows by 1 each time `landingPages` crosses a `LANDING_CHUNK_SIZE`
 * boundary; never shrinks in practice because `landingPages` is
 * append-only.
 */
export function landingChunkCount(): number {
  return Math.ceil(landingPages.length / LANDING_CHUNK_SIZE);
}

/** All sitemap chunk ids, in the order they appear in the index. */
export function allSitemapChunkIds(): number[] {
  const ids: number[] = [...STATIC_CHUNK_IDS];
  const count = landingChunkCount();
  for (let i = 0; i < count; i++) {
    ids.push(LANDING_CHUNK_ID_START + i);
  }
  return ids;
}
