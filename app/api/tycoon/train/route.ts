import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer, nextDirtyUntil } from '@/lib/tycoon/actions';
import { UNIT_DEFS } from '@/lib/tycoon/power';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';
import { addQuestProgress } from '@/lib/tycoon/quests';
import type { UnitKey } from '@/lib/tycoon/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  unit?: UnitKey;
  quantity?: number;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const unit = body.unit;
  if (!unit || !UNIT_DEFS[unit]) {
    return NextResponse.json({ error: 'invalid_unit' }, { status: 400 });
  }
  const quantity = Math.floor(Number(body.quantity) || 0);
  if (quantity <= 0 || quantity > 1000) {
    return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 });
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

  const hostBot = auth.source.kind === 'session' ? auth.source.session_id : null;
  const loaded = await loadAndTickPlayerInMemory(supabase, auth.user.telegram_user_id, hostBot);
  if (!loaded) {
    return NextResponse.json({ error: 'player_not_found', exists: false }, { status: 404 });
  }

  const player = clonePlayer(loaded.ticked.player);
  const def = UNIT_DEFS[unit];
  if (def.unlockAt && player.hq_level < def.unlockAt) {
    return NextResponse.json({ error: 'unit_locked', required_hq: def.unlockAt }, { status: 409 });
  }

  const troop = player.state.troops[unit];
  if (troop.training_ends_at) {
    return NextResponse.json({ error: 'training_busy' }, { status: 409 });
  }

  const cost = def.trainCost * quantity;
  if (Number(player.coins) < cost) {
    return NextResponse.json({ error: 'insufficient_coins', cost }, { status: 402 });
  }

  const nowMs = Date.now();
  const endsAt = new Date(nowMs + def.trainSec * quantity * 1000).toISOString();
  player.coins = Number(player.coins) - cost;
  troop.training_count = quantity;
  troop.training_ends_at = endsAt;
  player.state_dirty_until = nextDirtyUntil(player.state);

  try {
    await persistTickedPlayer(supabase, player, loaded.before.save_version);
  } catch (e) {
    return NextResponse.json(
      { error: 'save_conflict', detail: e instanceof Error ? e.message : String(e) },
      { status: 409 },
    );
  }

  await supabase.from('tycoon_events').insert({
    player_id: player.id,
    kind: 'training_started',
    payload: { unit, quantity, cost, ends_at: endsAt },
  });
  await addQuestProgress(supabase, player.id, 'troops_trained', quantity);

  return NextResponse.json({ queued: { unit, quantity, cost, ends_at: endsAt }, ...snapshotPlayer(player) });
}
