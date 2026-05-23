/**
 * POST /api/tycoon/raid
 *
 * Server-authoritative raid resolution (§14, §29.3).
 *
 * Body:
 *   - initData: string                    (Telegram WebApp initData)
 *   - session_id?: string
 *   - target_player_id?: string           (UUID of defender; omit for NPC)
 *   - target_npc_kind?: string            (e.g. "npc_lieutenant_3" — V1 NPC raids)
 *   - troops_sent: { bruiser?, shooter?, biker?, driver?, made_man? }
 *
 * Flow:
 *   1. Verify initData → attacker user.
 *   2. Load attacker, apply tick (so we read post-accrual counts).
 *   3. Validate troops_sent ≤ available; reject if not.
 *   4. Load defender (or synthesize NPC); reject if defender shielded
 *      (§15 newbie shield enforcement is server-side, not client trust).
 *   5. Roll a seed, run resolveRaid(), persist losses + loot, write
 *      tycoon_raids row, return BattleResult to client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import {
  loadAndTickPlayer,
  persistTickedPlayer,
} from '@/lib/tycoon/state';
import { buffsFromState, resolveRaid } from '@/lib/tycoon/combat';
import { randomSeed } from '@/lib/tycoon/prng';
import { UNIT_DEFS, computePower } from '@/lib/tycoon/power';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';
import type { PlayerRecord, UnitKey } from '@/lib/tycoon/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  target_player_id?: string;
  target_npc_kind?: string;
  troops_sent?: Partial<Record<UnitKey, number>>;
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

  const hostBot = auth.source.kind === 'session' ? auth.source.session_id : null;

  // Validate troops_sent.
  const troopsSent = sanitizeTroops(body.troops_sent ?? {});
  if (!hasAnyTroops(troopsSent)) {
    return NextResponse.json({ error: 'empty_squad' }, { status: 400 });
  }

  // Load attacker (with tick).
  const attacker = await loadAndTickPlayer(supabase, auth.user.telegram_user_id, hostBot);
  if (!attacker) {
    return NextResponse.json({ error: 'attacker_not_found' }, { status: 404 });
  }

  // Validate the attacker actually owns the troops they sent.
  for (const [unit, count] of Object.entries(troopsSent) as [UnitKey, number][]) {
    if ((attacker.state.troops[unit]?.count ?? 0) < count) {
      return NextResponse.json(
        { error: 'insufficient_troops', detail: unit },
        { status: 400 },
      );
    }
  }

  // Resolve defender.
  let defender: PlayerRecord | null = null;
  let npcDefender: {
    troops: Partial<Record<UnitKey, number>>;
    vault_coins: number;
    walls_level: number;
    power: number;
  } | null = null;

  if (body.target_player_id) {
    const { data, error } = await supabase
      .from('tycoon_players')
      .select('*')
      .eq('id', body.target_player_id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: 'defender_lookup_failed', detail: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'defender_not_found' }, { status: 404 });
    }
    defender = data as PlayerRecord;
    // Shield enforcement — never trust client. §15 + §32.3.2.
    if (defender.shield_until && new Date(defender.shield_until).getTime() > Date.now()) {
      return NextResponse.json({ error: 'defender_shielded' }, { status: 409 });
    }
    if (defender.id === attacker.id) {
      return NextResponse.json({ error: 'cannot_raid_self' }, { status: 400 });
    }
  } else if (body.target_npc_kind) {
    npcDefender = synthesizeNpcDefender(body.target_npc_kind);
    if (!npcDefender) {
      return NextResponse.json({ error: 'unknown_npc_kind' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'target_required' }, { status: 400 });
  }

  // Build combat sides.
  const seed = randomSeed();
  const attackerBuffs = buffsFromState(attacker.state);
  const lootCap = totalLoad(troopsSent);

  const result = resolveRaid({
    attacker: {
      troops: troopsSent,
      buffs: attackerBuffs,
      power: attacker.power,
    },
    defender: defender
      ? {
          troops: collectDefenderTroops(defender),
          buffs: buffsFromState(defender.state),
          walls_level: defender.state.buildings?.walls?.level ?? 0,
          vault_coins: Math.min(defender.coins, 500_000),
          power: defender.power,
        }
      : {
          troops: npcDefender!.troops,
          walls_level: npcDefender!.walls_level,
          vault_coins: npcDefender!.vault_coins,
          power: npcDefender!.power,
        },
    seed,
    loot_cap: lootCap,
  });

  // Apply attacker casualties: dead → permanent loss; wounded → clinic queue.
  const before = JSON.parse(JSON.stringify(attacker.state.troops));
  applyCasualties(attacker, result.attacker_casualties);

  // Credit loot (V1: PvP only gives coins, no gems).
  attacker.coins = Number(attacker.coins) + result.loot_coins;
  attacker.rep = Math.max(0, attacker.rep + result.rep_delta);
  attacker.power = computePower(attacker.state).total;

  // Spend attacker energy (raids cost energy — §3 economy).
  const energyCost = Math.min(20, Math.max(5, Math.floor(totalCount(troopsSent) / 5)));
  attacker.energy = Math.max(0, attacker.energy - energyCost);

  try {
    await persistTickedPlayer(supabase, attacker, attacker.save_version);
  } catch (e) {
    // Restore state on conflict so the client can retry safely.
    attacker.state.troops = before;
    return NextResponse.json(
      {
        error: 'save_conflict',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 409 },
    );
  }

  // For PvP raids, also persist defender casualties + loot loss. Best
  // effort — if this fails we don't roll back the attacker (raid logs
  // are append-only and the defender's tick will reconcile on next read).
  if (defender) {
    applyCasualties(defender, result.defender_casualties);
    defender.coins = Math.max(0, Number(defender.coins) - result.loot_coins);
    defender.power = computePower(defender.state).total;
    try {
      await persistTickedPlayer(supabase, defender, defender.save_version);
    } catch (e) {
      console.warn(
        '[tycoon-raid] defender persist failed:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // Write the raid log row (append-only).
  await supabase.from('tycoon_raids').insert({
    attacker_player_id: attacker.id,
    defender_player_id: defender?.id ?? null,
    defender_npc_kind: defender ? null : body.target_npc_kind ?? null,
    city_id: attacker.city_id,
    troops_sent: troopsSent,
    attacker_power: result.attacker_power,
    defender_power: result.defender_power,
    seed: result.seed,
    victory: result.victory,
    attacker_casualties: result.attacker_casualties,
    defender_casualties: result.defender_casualties,
    loot_coins: result.loot_coins,
    loot_gems: result.loot_gems,
    rep_delta: result.rep_delta,
    result,
  });

  // Optional: append an in-game event for analytics.
  await supabase.from('tycoon_events').insert({
    player_id: attacker.id,
    kind: result.victory ? 'raid_victory' : 'raid_defeat',
    payload: {
      target_player_id: defender?.id ?? null,
      target_npc_kind: defender ? null : body.target_npc_kind ?? null,
      loot_coins: result.loot_coins,
      rep_delta: result.rep_delta,
    },
  });

  return NextResponse.json({
    result,
    player: snapshotPlayer(attacker),
  });
}

/* ============================================================
 * helpers
 * ============================================================ */

function sanitizeTroops(input: Partial<Record<string, unknown>>): Partial<Record<UnitKey, number>> {
  const out: Partial<Record<UnitKey, number>> = {};
  for (const key of Object.keys(UNIT_DEFS) as UnitKey[]) {
    const v = input[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[key] = Math.floor(v);
    }
  }
  return out;
}

function hasAnyTroops(t: Partial<Record<UnitKey, number>>): boolean {
  return Object.values(t).some((v) => (v ?? 0) > 0);
}

function totalCount(t: Partial<Record<UnitKey, number>>): number {
  let s = 0;
  for (const v of Object.values(t)) s += v ?? 0;
  return s;
}

function totalLoad(t: Partial<Record<UnitKey, number>>): number {
  let l = 0;
  for (const [key, n] of Object.entries(t) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    l += count * UNIT_DEFS[key].load;
  }
  return l;
}

function collectDefenderTroops(d: PlayerRecord): Partial<Record<UnitKey, number>> {
  const out: Partial<Record<UnitKey, number>> = {};
  for (const k of Object.keys(UNIT_DEFS) as UnitKey[]) {
    out[k] = d.state.troops?.[k]?.count ?? 0;
  }
  return out;
}

/**
 * Apply casualties to a player's state.troops *in place*:
 *   - dead → permanent count loss
 *   - wounded → move to wounded bucket (clinic heals them via tick worker
 *     once we ship the clinic queue persistence path)
 */
function applyCasualties(
  player: PlayerRecord,
  cas: { dead: Partial<Record<UnitKey, number>>; wounded: Partial<Record<UnitKey, number>> },
): void {
  for (const [k, dead] of Object.entries(cas.dead) as [UnitKey, number | undefined][]) {
    if (!dead) continue;
    const t = player.state.troops[k];
    if (!t) continue;
    t.count = Math.max(0, t.count - dead);
  }
  for (const [k, wounded] of Object.entries(cas.wounded) as [UnitKey, number | undefined][]) {
    if (!wounded) continue;
    const t = player.state.troops[k];
    if (!t) continue;
    t.count = Math.max(0, t.count - wounded);
    t.wounded = (t.wounded ?? 0) + wounded;
  }
}

/* ---------- NPC defender table ----------------------------- */
// V1 keeps newbie shield raids on NPCs only (§33.1, §32.3.2). The kind
// suffix encodes the tier; the table is here so combat is fully
// deterministic from (npc_kind, seed).
const NPC_TABLE: Record<
  string,
  { troops: Partial<Record<UnitKey, number>>; vault_coins: number; walls_level: number; power: number }
> = {
  npc_petty_1: {
    troops: { bruiser: 8 },
    vault_coins: 1200,
    walls_level: 0,
    power: 2400,
  },
  npc_petty_2: {
    troops: { bruiser: 16, shooter: 4 },
    vault_coins: 3600,
    walls_level: 1,
    power: 6800,
  },
  npc_petty_3: {
    troops: { bruiser: 24, shooter: 10, biker: 4 },
    vault_coins: 8000,
    walls_level: 2,
    power: 16000,
  },
};

function synthesizeNpcDefender(kind: string) {
  return NPC_TABLE[kind] ?? null;
}
