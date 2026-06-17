/**
 * POST /api/tycoon/tick
 *
 * Internal cron endpoint that runs one sweep of the tycoon tick worker
 * (lib/tycoon/tickWorker.ts). Wired here so it can be hit by an external
 * scheduler (Vercel cron, Supabase pg_cron via http, etc.) until the
 * bot-side scheduler picks it up.
 *
 * Auth: must present `Authorization: Bearer <TYCOON_CRON_TOKEN>` header.
 * If the env var isn't set, the endpoint refuses (default-deny — better
 * than a free hatch into the player table).
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTycoonTickSweepWithAdminClient } from '@/lib/tycoon/tickWorker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const expected = process.env.TYCOON_CRON_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'cron_token_not_configured' },
      { status: 503 },
    );
  }
  const got = req.headers.get('authorization') || '';
  if (got !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await runTycoonTickSweepWithAdminClient();
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    advanced: result.advanced,
    failed: result.failed,
  });
}
