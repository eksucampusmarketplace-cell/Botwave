/**
 * POST /api/tycoon/state
 *
 * Returns the player's current state, applying any pending tick first.
 * The mockup client polls this on cold open and after server-mutating
 * actions to refresh its in-memory mirror.
 *
 * Body: { initData: string, session_id?: string }
 * Returns: TycoonStateResponse
 *
 * NOTE: this is POST (not GET) because Telegram `initData` is a sensitive
 * verifiable token that we don't want sitting in URLs / browser history /
 * proxy logs. The body shape matches /api/tycoon/auth deliberately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { loadAndTickPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const auth = await authorizeTycoonRequest(
    supabase,
    body.initData || '',
    body.session_id || null,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const hostBot =
    auth.source.kind === 'session' ? auth.source.session_id : null;

  const player = await loadAndTickPlayer(supabase, auth.user.telegram_user_id, hostBot);
  if (!player) {
    return NextResponse.json({ error: 'player_not_found' }, { status: 404 });
  }

  return NextResponse.json(snapshotPlayer(player), { status: 200 });
}
