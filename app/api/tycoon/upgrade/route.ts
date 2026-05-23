import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer, nextDirtyUntil } from '@/lib/tycoon/actions';
import {
  BUILDING_UPGRADE_DEFS,
  buildingUpgradeCost,
  buildingUpgradeSeconds,
} from '@/lib/tycoon/catalog';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';
import type { BuildingKey } from '@/lib/tycoon/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  building_key?: BuildingKey;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const key = body.building_key;
  if (!key || !BUILDING_UPGRADE_DEFS[key]) {
    return NextResponse.json({ error: 'invalid_building' }, { status: 400 });
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
  const building = player.state.buildings[key];
  if (!building) {
    return NextResponse.json({ error: 'building_not_found' }, { status: 404 });
  }
  const unlockAt = building.unlock_at ?? 1;
  if (building.level <= 0 && player.hq_level < unlockAt) {
    return NextResponse.json({ error: 'building_locked', required_hq: unlockAt }, { status: 409 });
  }
  if (building.upgrading_ends_at) {
    return NextResponse.json({ error: 'upgrade_busy' }, { status: 409 });
  }

  const currentLevel = Math.max(0, building.level);
  const def = BUILDING_UPGRADE_DEFS[key];
  if (currentLevel >= def.maxLevel) {
    return NextResponse.json({ error: 'max_level' }, { status: 409 });
  }

  const cost = buildingUpgradeCost(key, Math.max(1, currentLevel));
  if (Number(player.coins) < cost) {
    return NextResponse.json({ error: 'insufficient_coins', cost }, { status: 402 });
  }

  const seconds = buildingUpgradeSeconds(key, Math.max(1, currentLevel));
  const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
  player.coins = Number(player.coins) - cost;
  building.upgrading_ends_at = endsAt;
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
    kind: 'building_upgrade_started',
    payload: { building_key: key, cost, ends_at: endsAt, next_level: currentLevel + 1 },
  });

  return NextResponse.json({
    queued: { building_key: key, cost, ends_at: endsAt, next_level: currentLevel + 1 },
    ...snapshotPlayer(player),
  });
}
