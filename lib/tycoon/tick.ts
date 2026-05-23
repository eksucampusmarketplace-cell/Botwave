/**
 * Cosa Nostra Tycoon — lazy tick reducer.
 *
 * §29.2: state is lazy-evaluated. The tick reducer is a *pure function*
 * over (PlayerRecord, now) that produces (new PlayerRecord, side effects).
 * It is called:
 *
 *   - On every state read, so the response reflects accrual since
 *     `last_tick_at`.
 *   - On every state write, so the write builds on the freshest base.
 *   - By the sweeper worker every minute, to fire scheduled timer
 *     completions (training, upgrades) even when no one is reading.
 *
 * What it does:
 *
 *   1. Regenerates energy at `energy_regen_sec` per point, capped at
 *      `energy_max`.
 *   2. Accrues idle income from each `state.businesses[i]`, capped at
 *      that business's `cap`. (Pickup is a separate action; tick just
 *      bumps the bucket.)  In V1 we model idle accrual as auto-collect
 *      because there is no "tap to collect" mechanic yet.
 *   3. Completes any training tasks whose `training_ends_at` has passed,
 *      moves the trained units into `count`.
 *   4. Completes any building upgrades whose `upgrading_ends_at` has
 *      passed, bumping the building level.
 *   5. Recomputes `power` from the resulting state.
 *   6. Sets `last_tick_at = now` and recomputes `state_dirty_until` to
 *      whichever timer fires next.
 *
 * The reducer never reaches for the database; it's a pure function so
 * we can unit-test it cheaply.
 */

import type { PlayerRecord, PlayerStateBlob } from './types';
import { computePower } from './power';
import { clinicHealCapacityPerTick, pendingBusinessCoins } from './actions';

export type TickResult = {
  /** The mutated player record (new object — reducer does not mutate in place). */
  player: PlayerRecord;
  /** Side-effect summary, useful for analytics / event logging. */
  effects: {
    energy_regenerated: number;
    coins_accrued: number;
    troops_healed: Partial<Record<string, number>>;
    troops_completed: Partial<Record<string, number>>;
    buildings_completed: string[];
  };
};

/** Pure tick reducer. `nowMs` is injectable for tests. */
export function applyTick(player: PlayerRecord, nowMs: number = Date.now()): TickResult {
  const lastTickMs = new Date(player.last_tick_at).getTime();
  const elapsedSec = Math.max(0, Math.floor((nowMs - lastTickMs) / 1000));

  // Always copy — never mutate in place.
  const state: PlayerStateBlob = JSON.parse(JSON.stringify(player.state));
  let coinsAccrued = 0;
  const troopsHealed: Record<string, number> = {};
  const troopsCompleted: Record<string, number> = {};
  const buildingsCompleted: string[] = [];

  // ---------- 1. Energy regen --------------------------------------------
  let energy = player.energy;
  const energyMax = player.energy_max;
  const energyRegenSec = player.energy_regen_sec;
  let energyRegenerated = 0;
  if (energyRegenSec > 0 && energy < energyMax && elapsedSec > 0) {
    const points = Math.floor(elapsedSec / energyRegenSec);
    if (points > 0) {
      const before = energy;
      energy = Math.min(energyMax, energy + points);
      energyRegenerated = energy - before;
    }
  }

  // ---------- 2. Idle business accrual ----------------------------------
  // Income stays in each business bucket until collected. The collect route
  // pays it out and resets last_collected_at.
  for (const biz of state.businesses) {
    const accrued = pendingBusinessCoins(biz, nowMs);
    if (accrued > 0) coinsAccrued += accrued;
  }

  // ---------- 3. Wounded healing ----------------------------------------
  if (elapsedSec > 0) {
    const clinicLevel = state.buildings.clinic?.level ?? 0;
    const healPerHour = clinicHealCapacityPerTick(clinicLevel);
    let remainingHeal = Math.floor((elapsedSec / 3600) * healPerHour);
    if (remainingHeal > 0) {
      for (const [unit, troop] of Object.entries(state.troops)) {
        if (remainingHeal <= 0) break;
        if (!troop.wounded) continue;
        const healed = Math.min(troop.wounded, remainingHeal);
        troop.wounded -= healed;
        remainingHeal -= healed;
        troopsHealed[unit] = healed;
      }
    }
  }

  // ---------- 4. Training completion ------------------------------------
  for (const [unit, troop] of Object.entries(state.troops)) {
    if (!troop.training_ends_at) continue;
    const endsMs = new Date(troop.training_ends_at).getTime();
    if (endsMs > nowMs) continue;
    troop.count += troop.training_count;
    troopsCompleted[unit] = (troopsCompleted[unit] || 0) + troop.training_count;
    troop.training_ends_at = null;
    troop.training_count = 0;
  }

  // ---------- 5. Building upgrade completion ----------------------------
  let hqLevel = player.hq_level;
  for (const [key, b] of Object.entries(state.buildings)) {
    if (!b.upgrading_ends_at) continue;
    const endsMs = new Date(b.upgrading_ends_at).getTime();
    if (endsMs > nowMs) continue;
    b.level += 1;
    b.upgrading_ends_at = null;
    buildingsCompleted.push(key);
    if (key === 'hq') hqLevel = b.level;
  }

  // ---------- 6. Recompute power -----------------------------------------
  const breakdown = computePower(state);
  state.power_breakdown = breakdown;

  // ---------- 7. Recompute state_dirty_until ----------------------------
  const nextTimerMs = nextTimerForState(state);
  const stateDirtyUntil = nextTimerMs != null ? new Date(nextTimerMs).toISOString() : null;

  return {
    player: {
      ...player,
      energy,
      coins: player.coins,
      hq_level: hqLevel,
      power: breakdown.total,
      state,
      last_tick_at: new Date(nowMs).toISOString(),
      state_dirty_until: stateDirtyUntil,
    },
    effects: {
      energy_regenerated: energyRegenerated,
      coins_accrued: coinsAccrued,
      troops_healed: troopsHealed,
      troops_completed: troopsCompleted,
      buildings_completed: buildingsCompleted,
    },
  };
}

/** Earliest pending timer (training end, upgrade end). */
function nextTimerForState(state: PlayerStateBlob): number | null {
  let earliest: number | null = null;
  const consider = (iso: string | null) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && (earliest == null || ms < earliest)) earliest = ms;
  };

  for (const t of Object.values(state.troops)) consider(t.training_ends_at);
  for (const b of Object.values(state.buildings)) consider(b.upgrading_ends_at);

  return earliest;
}
