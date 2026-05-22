/**
 * POST /api/indexnow/submit-all
 *
 * Submit every public URL on botwave.online to IndexNow. Intended to be
 * called once per deploy + once per cron sweep (e.g. every 24h) to keep
 * Bing / Yandex / DDG / Yahoo / Ecosia in sync without ever needing a
 * webmaster console login.
 *
 * URLs are loaded from `lib/seo/all-urls.ts` (the same source of truth
 * the sitemap chunker reads from). IndexNow caps a single submission at
 * 10,000 URLs, so we chunk into batches of 500 — small enough to recover
 * fast on partial failure, big enough to avoid hammering api.indexnow.org
 * with thousands of individual requests.
 *
 * Auth: same `INTERNAL_CRON_SECRET` posture as /api/indexnow.
 *
 * Query params:
 *   limit  — optional max number of URLs to submit (handy for smoke
 *            testing without burning rate limits). Default: all.
 *   dryRun — '1' to compute the URL list without actually submitting.
 *
 * Response:
 *   {
 *     ok: bool,
 *     totalUrls: number,
 *     batches: [{ index, count, status, ok, error? }, ...],
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/seo/indexnow';
import { getAllPublicUrls, chunkUrls } from '@/lib/seo/all-urls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// IndexNow round-trip + 50+ batches can comfortably take >30s on big
// catalogs; opt out of the default Vercel/Render serverless 10s cap.
export const maxDuration = 300;

function authorize(req: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.INTERNAL_CRON_SECRET;
  if (!expected) return { ok: false, reason: 'INTERNAL_CRON_SECRET not set' };
  const header = req.headers.get('x-internal-cron-secret');
  const query = req.nextUrl.searchParams.get('secret');
  if (header === expected || query === expected) return { ok: true };
  return { ok: false, reason: 'invalid secret' };
}

async function runSubmit(req: NextRequest) {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason ?? 'unauthorized' },
      { status: 401 }
    );
  }

  const limitParam = req.nextUrl.searchParams.get('limit');
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const batchSizeParam = req.nextUrl.searchParams.get('batchSize');

  const all = getAllPublicUrls();
  const limit = limitParam ? Math.max(0, Number(limitParam)) : all.length;
  const urls = Number.isFinite(limit) ? all.slice(0, limit) : all;
  const batchSize = batchSizeParam
    ? Math.max(1, Math.min(10000, Number(batchSizeParam)))
    : 500;
  const batches = chunkUrls(urls, batchSize);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      totalUrls: urls.length,
      batchCount: batches.length,
      batchSize,
      firstBatchSample: batches[0]?.slice(0, 5) ?? [],
    });
  }

  const results: {
    index: number;
    count: number;
    status: number;
    ok: boolean;
    error?: string;
  }[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const res = await submitToIndexNow(batch);
    results.push({
      index: i,
      count: batch.length,
      status: res.status,
      ok: res.ok,
      ...(res.error ? { error: res.error } : {}),
    });
    // Small gap between batches to be neighbourly to api.indexnow.org.
    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    {
      ok: allOk,
      totalUrls: urls.length,
      batches: results,
    },
    { status: allOk ? 200 : 502 }
  );
}

export async function POST(req: NextRequest) {
  return runSubmit(req);
}

/**
 * GET works the same — convenient for cron services like Render Cron
 * or GitHub Actions cron that prefer simple GETs.
 */
export async function GET(req: NextRequest) {
  return runSubmit(req);
}
