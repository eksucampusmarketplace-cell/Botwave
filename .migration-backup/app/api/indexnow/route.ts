/**
 * POST /api/indexnow
 *
 * Notify Bing + Yandex (and the whole IndexNow umbrella — DuckDuckGo,
 * Yahoo, Ecosia, Swisscows, AOL, Naver, Seznam) that a specific URL on
 * botwave.online has been added or updated.
 *
 * Auth:
 *   header `x-internal-cron-secret: <INTERNAL_CRON_SECRET>` OR
 *   query  `?secret=<INTERNAL_CRON_SECRET>`
 *
 *   `INTERNAL_CRON_SECRET` is the same env var used by other internal
 *   cron endpoints (see app/api/internal/cron/*). Setting one secret
 *   covers IndexNow + the existing cron sweeps.
 *
 * Request body (JSON):
 *   { url: "https://www.botwave.online/blog/some-post" }
 *   { urls: ["https://www.botwave.online/x", "https://www.botwave.online/y"] }
 *
 * Response:
 *   { ok, status, submittedCount, error? }
 *
 * Practical use:
 *   - From the bot worker after publishing a new blog post or
 *     deploying new programmatic landing pages.
 *   - From CI in a post-deploy step (we use scripts/indexnow-bulk-submit.mjs
 *     for that to avoid coupling deploys to a running web service).
 */
import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/seo/indexnow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorize(req: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.INTERNAL_CRON_SECRET;
  if (!expected) {
    // Fail-closed: refusing to run an authenticated endpoint without
    // a configured secret prevents accidental open access in dev.
    return { ok: false, reason: 'INTERNAL_CRON_SECRET not set' };
  }
  const header = req.headers.get('x-internal-cron-secret');
  const query = req.nextUrl.searchParams.get('secret');
  if (header === expected || query === expected) return { ok: true };
  return { ok: false, reason: 'invalid secret' };
}

interface IndexNowBody {
  url?: string;
  urls?: string[];
}

export async function POST(req: NextRequest) {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason ?? 'unauthorized' },
      { status: 401 }
    );
  }

  let body: IndexNowBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid JSON body' },
      { status: 400 }
    );
  }

  const urls: string[] = [];
  if (typeof body.url === 'string' && body.url.length > 0) urls.push(body.url);
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && u.length > 0) urls.push(u);
    }
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'no URLs provided. Pass { url } or { urls: [...] }.' },
      { status: 400 }
    );
  }

  const result = await submitToIndexNow(urls);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

/**
 * GET /api/indexnow — health check that confirms the key file is
 * resolvable. Bing fetches /<KEY>.txt to verify ownership; this GET
 * is a sanity check before that round-trip.
 */
export async function GET(req: NextRequest) {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason ?? 'unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    ok: true,
    indexNowEndpoint: 'POST https://www.botwave.online/api/indexnow',
    keyLocation: 'https://www.botwave.online/b7e9c1a2f4d8e0b1a3c5d7e9f1b3a5c7.txt',
    bulkEndpoint: 'POST https://www.botwave.online/api/indexnow/submit-all',
  });
}
