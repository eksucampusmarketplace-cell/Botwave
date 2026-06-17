/**
 * Server-authoritative combat resolver (§14, §29.3).
 *
 * Ported from the client mockup (`public/miniapp/tycoon-mockup.html`
 * — `resolveRaid` / `squadAttack` / `squadHP` / `distributeCasualties`).
 * All randomness is sourced from a seeded mulberry32 PRNG so a
 * `tycoon_raids` row can be replayed deterministically by passing back
 * (seed, attacker squad, defender snapshot).
 *
 * The resolver is pure: it takes immutable snapshots in, returns a
 * `BattleResult` out. It does NOT touch the database. Persisting the
 * battle (deducting casualties from the attacker's troops, crediting
 * loot, appending to tycoon_raids) is the caller's job.
 */

import { mulberry32 } from './prng';
import { UNIT_DEFS } from './power';
import type {
  BattleResult,
  BattleRound,
  UnitKey,
} from './types';

const MAX_ROUNDS = 6;

/* ---------- Buff snapshot used inside the round loop ---------- */

export type CombatBuffs = {
  atkBonus: number;
  defBonus: number;
  /** Fraction of incoming damage absorbed by walls (0..0.35). */
  wallAbs: number;
  /** Vault protection — fraction of attacker's coins kept safe (0..0.85). */
  vaultProt: number;
  /** Raid skill bonus, additive to win chance. */
  raidBonus: number;
};

export const NEUTRAL_BUFFS: CombatBuffs = {
  atkBonus: 0,
  defBonus: 0,
  wallAbs: 0,
  vaultProt: 0.4,
  raidBonus: 0,
};

/* ---------- Per-side snapshot the resolver consumes ----------- */

export type CombatSide = {
  troops: Partial<Record<UnitKey, number>>;
  buffs?: CombatBuffs;
  /** Defender-side fields. Ignored on the attacker. */
  walls_level?: number;
  vault_coins?: number;
  power?: number;
};

export type ResolveRaidArgs = {
  attacker: CombatSide;
  defender: CombatSide;
  seed: number;
  /** Capacity of attacker's haulers — caps coin loot. */
  loot_cap: number;
};

/* ============================================================
 * squadAttack / squadHP — mirror mockup math
 * ============================================================ */

function dominantType(live: Partial<Record<UnitKey, number>>): UnitKey | null {
  let best: UnitKey | null = null;
  let max = 0;
  for (const [type, n] of Object.entries(live) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (count > max) {
      max = count;
      best = type;
    }
  }
  return best;
}

function sumLive(live: Partial<Record<UnitKey, number>>): number {
  let s = 0;
  for (const n of Object.values(live)) s += Math.max(0, n ?? 0);
  return s;
}

function squadAttack(
  live: Partial<Record<UnitKey, number>>,
  focus: UnitKey | null,
  buffs: CombatBuffs,
): number {
  let a = 0;
  for (const [type, n] of Object.entries(live) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    const def = UNIT_DEFS[type];
    if (!def) continue;
    let bonus = 1 + buffs.atkBonus;
    if (focus && def.counters[focus]) bonus *= def.counters[focus];
    a += count * def.atk * bonus;
  }
  return a;
}

function squadHP(
  live: Partial<Record<UnitKey, number>>,
  buffs: CombatBuffs,
): number {
  let h = 0;
  for (const [type, n] of Object.entries(live) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    const def = UNIT_DEFS[type];
    if (!def) continue;
    h += count * (def.hp + def.def * 0.6) * (1 + buffs.defBonus);
  }
  return h;
}

/** Distribute incoming damage proportional to each unit type's HP share. */
function distributeCasualties(
  live: Partial<Record<UnitKey, number>>,
  incomingDmg: number,
  buffs: CombatBuffs,
  rand: () => number,
): Partial<Record<UnitKey, number>> {
  const totalHP = squadHP(live, buffs);
  if (totalHP <= 0) return {};
  // Same fudge bounds as the mockup so client expectations match.
  const lossFrac = Math.min(0.6, incomingDmg / totalHP);
  const losses: Partial<Record<UnitKey, number>> = {};
  for (const [type, n] of Object.entries(live) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    // 0.85..1.15 jitter, same shape as mockup
    const jitter = 0.85 + rand() * 0.3;
    const lost = Math.min(count, Math.ceil(count * lossFrac * jitter));
    live[type] = count - lost;
    if (lost > 0) losses[type] = lost;
  }
  return losses;
}

function totalLoad(troops: Partial<Record<UnitKey, number>>): number {
  let l = 0;
  for (const [type, n] of Object.entries(troops) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    const def = UNIT_DEFS[type];
    if (!def) continue;
    l += count * def.load;
  }
  return l;
}

/* ============================================================
 * Public entrypoint
 * ============================================================ */

export function resolveRaid(args: ResolveRaidArgs): BattleResult {
  const rand = mulberry32(args.seed);

  const atkBuffs = args.attacker.buffs ?? NEUTRAL_BUFFS;
  const defBuffs: CombatBuffs = {
    ...(args.defender.buffs ?? NEUTRAL_BUFFS),
    wallAbs: clamp(
      (args.defender.walls_level ?? 0) > 0
        ? Math.min(0.35, (args.defender.walls_level ?? 0) / 80000 + (args.defender.buffs?.wallAbs ?? 0))
        : args.defender.buffs?.wallAbs ?? 0,
      0,
      0.35,
    ),
  };

  // Mutable per-side troop counts.
  const live = {
    attacker: { ...(args.attacker.troops) } as Partial<Record<UnitKey, number>>,
    defender: { ...(args.defender.troops) } as Partial<Record<UnitKey, number>>,
  };
  // Starting counts for casualty aggregation.
  const start = {
    attacker: { ...live.attacker },
    defender: { ...live.defender },
  };

  const attackerStartPower = sideRawPower(live.attacker, atkBuffs);
  const defenderStartPower = sideRawPower(live.defender, defBuffs);

  const rounds: BattleRound[] = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const atkFocus = dominantType(live.defender);
    const defFocus = dominantType(live.attacker);

    const atkOut = squadAttack(live.attacker, atkFocus, atkBuffs);
    const defOut = squadAttack(live.defender, defFocus, defBuffs);

    // Attacker is striking the defender's HQ → walls absorb % of damage.
    // Defender is striking attacker squad in the open → no walls help them.
    const dmgToAttacker = defOut;
    const dmgToDefender = atkOut * (1 - defBuffs.wallAbs);

    const attackerLost = distributeCasualties(live.attacker, dmgToAttacker, atkBuffs, rand);
    const defenderLost = distributeCasualties(live.defender, dmgToDefender, defBuffs, rand);

    rounds.push({
      round,
      attacker_alive: { ...live.attacker },
      defender_alive: { ...live.defender },
      attacker_damage_dealt: Math.floor(atkOut),
      defender_damage_dealt: Math.floor(defOut),
    });

    void attackerLost;
    void defenderLost;

    if (sumLive(live.attacker) <= 0 || sumLive(live.defender) <= 0) break;
  }

  const attackerAlive = sumLive(live.attacker);
  const defenderAlive = sumLive(live.defender);
  // Same victory rule as the mockup: attacker wins on parity or better.
  const victory = attackerAlive >= defenderAlive;

  // Casualty split: 65 % of losses are "wounded" (recoverable in clinic),
  // 35 % are dead. Matches mockup `applyCasualties`. We don't simulate
  // clinic capacity here — the API route does that when persisting.
  const attackerCas = splitCasualties(start.attacker, live.attacker);
  const defenderCas = splitCasualties(start.defender, live.defender);

  // Loot — only on victory. Capped at attacker's effective load capacity.
  let loot_coins = 0;
  let loot_gems = 0;
  let rep_delta = -4;
  if (victory) {
    const survivingLoad = totalLoad(live.attacker);
    const unprotected = Math.max(0, (args.defender.vault_coins ?? 0) * (1 - defBuffs.vaultProt));
    loot_coins = Math.floor(Math.min(args.loot_cap, Math.min(survivingLoad, unprotected)));
    // Gems are bonus — only off NPCs / occasionally PvP at higher tiers.
    // V1: 0 gems from PvP. Always 0 here; route can override for NPC raids.
    loot_gems = 0;
    rep_delta = 8 + Math.floor((args.defender.power ?? 0) / 60000);
  }

  return {
    victory,
    rounds,
    attacker_casualties: attackerCas,
    defender_casualties: defenderCas,
    loot_coins,
    loot_gems,
    rep_delta,
    attacker_power: Math.floor(attackerStartPower),
    defender_power: Math.floor(defenderStartPower),
    seed: args.seed,
  };
}

/* ============================================================
 * Helpers
 * ============================================================ */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sideRawPower(
  troops: Partial<Record<UnitKey, number>>,
  buffs: CombatBuffs,
): number {
  // A power approximation just for the BattleResult metadata. Same shape
  // as power.computeTroopPower (atk + def + hp*0.4), with combat buffs
  // baked in. Not used for the round resolution itself.
  let p = 0;
  for (const [type, n] of Object.entries(troops) as [UnitKey, number | undefined][]) {
    const count = n ?? 0;
    if (!count) continue;
    const def = UNIT_DEFS[type];
    if (!def) continue;
    p += count * (def.atk * (1 + buffs.atkBonus) + def.def * (1 + buffs.defBonus) + def.hp * 0.4);
  }
  return p;
}

function splitCasualties(
  before: Partial<Record<UnitKey, number>>,
  after: Partial<Record<UnitKey, number>>,
): { dead: Partial<Record<UnitKey, number>>; wounded: Partial<Record<UnitKey, number>> } {
  const dead: Partial<Record<UnitKey, number>> = {};
  const wounded: Partial<Record<UnitKey, number>> = {};
  for (const type of Object.keys(before) as UnitKey[]) {
    const lost = (before[type] ?? 0) - (after[type] ?? 0);
    if (lost <= 0) continue;
    // 65 % wounded, 35 % dead — clinic absorbs the wounded if it has room.
    const woundedN = Math.floor(lost * 0.65);
    const deadN = lost - woundedN;
    if (woundedN > 0) wounded[type] = woundedN;
    if (deadN > 0) dead[type] = deadN;
  }
  return { dead, wounded };
}

/* ============================================================
 * Buff projection — convert a player's PlayerStateBlob into the
 * compact CombatBuffs the resolver uses. Mirror of `mult()` in
 * the mockup.
 * ============================================================ */

import type { PlayerStateBlob } from './types';

export function buffsFromState(state: PlayerStateBlob): CombatBuffs {
  const r = state.research;
  const g = state.hero.gear;
  const t = state.hero.talents;
  const s = state.hero.skills;

  const atkBonus =
    (r.military.atk_pct || 0) +
    (g.cigar?.mod?.atk || 0) +
    (t.military || 0) * 0.012 +
    (s.attack || 0) * 0.0008;

  const defBonus =
    (r.military.def_pct || 0) +
    (g.tie?.mod?.def || 0) +
    (t.defense || 0) * 0.012 +
    (s.defense || 0) * 0.0008;

  const vaultProt = Math.min(0.85, (r.defense.vault_pct || 0) + 0.4);
  const raidBonus = (t.raid || 0) * 0.01;

  return {
    atkBonus,
    defBonus,
    wallAbs: 0,
    vaultProt,
    raidBonus,
  };
}
