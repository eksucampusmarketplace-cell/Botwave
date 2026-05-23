import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer, nextDirtyUntil } from '@/lib/tycoon/actions';
import { gemsForSpeedup } from '@/lib/tycoon/monetization';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';
import type { BuildingKey, PlayerRecord, UnitKey } from '@/lib/tycoon/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  kind?: 'training' | 'building';
  unit?: UnitKey;
  building_key?: BuildingKey;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.kind !== 'training' && body.kind !== 'building') {
    return NextResponse.json({ error: 'invalid_speedup_kind' }, { status: 400 });
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
  const nowMs = Date.now();
  const target = speedupTarget(player, body);
  if (!target) {
    return NextResponse.json({ error: 'queue_not_found' }, { status: 404 });
  }

  const remainingSeconds = Math.ceil((new Date(target.endsAt).getTime() - nowMs) / 1000);
  const cost = gemsForSpeedup(remainingSeconds);
  if (cost <= 0) {
    return NextResponse.json({ completed: true, cost: 0, ...snapshotPlayer(player) });
  }
  if (Number(player.gems) < cost) {
    return NextResponse.json({ error: 'insufficient_gems', cost }, { status: 402 });
  }

  player.gems = Number(player.gems) - cost;
  target.finish();
  player.state_dirty_until = nextDirtyUntil(player.state);

  try {
    await persistTickedPlayer(supabase, player, loaded.before.save_version);
  } catch (e) {
    return NextResponse.json(
      { error: 'save_conflict', detail: e instanceof Error ? e.message : String(e) },
      { status: 409 },
    );
  }

  await supabase.from('tycoon_ledger').insert({
    player_id: player.id,
    kind: 'debit',
    amount: -cost,
    currency: 'gems',
    reason: `speedup_${body.kind}`,
    metadata: target.metadata,
  });
  await supabase.from('tycoon_events').insert({
    player_id: player.id,
    kind: `speedup_${body.kind}`,
    payload: { ...target.metadata, cost, remaining_seconds: Math.max(0, remainingSeconds) },
  });

  return NextResponse.json({
    completed: true,
    cost,
    remaining_seconds: Math.max(0, remainingSeconds),
    ...snapshotPlayer(player),
  });
}

function speedupTarget(player: PlayerRecord, body: Body) {
  if (body.kind === 'training') {
    const unit = body.unit;
    if (!unit || !player.state.troops[unit]) return null;
    const troop = player.state.troops[unit];
    if (!troop.training_ends_at) return null;
    return {
      endsAt: troop.training_ends_at,
      metadata: { unit, count: troop.training_count },
      finish: () => {
        troop.count += troop.training_count;
        troop.training_count = 0;
        troop.training_ends_at = null;
      },
    };
  }

  const key = body.building_key;
  if (!key || !player.state.buildings[key]) return null;
  const building = player.state.buildings[key];
  if (!building.upgrading_ends_at) return null;
  return {
    endsAt: building.upgrading_ends_at,
    metadata: { building_key: key, next_level: building.level + 1 },
    finish: () => {
      building.level += 1;
      building.upgrading_ends_at = null;
      if (key === 'hq') player.hq_level = building.level;
    },
  };
}
