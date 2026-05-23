/**
 * POST /api/tycoon/auth
 *
 * First call from the WebApp. Verifies Telegram `initData`, creates a
 * `tycoon_players` row if one doesn't exist for (telegram_user_id, host_bot),
 * applies any pending tick, and returns the player snapshot. Idempotent —
 * safe to call on every cold open.
 *
 * Body: { initData: string, session_id?: string, display_name?: string }
 * Returns: TycoonStateResponse + { created: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import {
  createPlayer,
  findPlayer,
  loadAndTickPlayer,
} from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  display_name?: string;
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
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status },
    );
  }

  const hostBot =
    auth.source.kind === 'session' ? auth.source.session_id : null;

  const existing = await findPlayer(supabase, auth.user.telegram_user_id, hostBot);
  let created = false;
  if (!existing) {
    const displayName =
      (body.display_name || '').trim().slice(0, 32) ||
      auth.user.first_name ||
      auth.user.username ||
      `Boss ${auth.user.telegram_user_id}`;

    await createPlayer(supabase, {
      telegram_user_id: auth.user.telegram_user_id,
      telegram_username: auth.user.username,
      display_name: displayName,
      host_bot: hostBot,
    });
    created = true;
  }

  const player = await loadAndTickPlayer(
    supabase,
    auth.user.telegram_user_id,
    hostBot,
  );
  if (!player) {
    // Extremely unlikely (we just created the row) but worth guarding.
    return NextResponse.json({ error: 'player_not_found' }, { status: 500 });
  }

  return NextResponse.json({ created, ...snapshotPlayer(player) }, { status: 200 });
}
