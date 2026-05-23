/**
 * Cosa Nostra Tycoon — power calculation.
 *
 * Server port of the mockup's `troopPower`, `buildingPower`, `heroPower`,
 * `researchPower`, `gearPower` (see `public/miniapp/tycoon-mockup.html`).
 *
 * Power is the single denormalized number used for matchmaking and
 * leaderboards (§9, §15). Recomputed by the tick reducer whenever any
 * input changes.
 */

import type { PlayerStateBlob, PowerBreakdown } from './types';

/**
 * Unit definitions — full server copy of the mockup's UNIT_DEFS.
 * Fields beyond hp/atk/def are used by the combat resolver (counters,
 * load capacity) and the tick worker (speed for marches, trainCost /
 * trainSec for training queues).
 *
 * Keep in sync with the client mockup at `public/miniapp/tycoon-mockup.html`.
 */
type UnitDef = {
  hp: number;
  atk: number;
  def: number;
  speed: number;
  /** Loot carry capacity per unit. */
  load: number;
  trainCost: number;
  trainSec: number;
  /** HQ level required to unlock training, if any. */
  unlockAt?: number;
  /** Multiplicative bonus vs a focused unit type. */
  counters: Partial<Record<'bruiser' | 'shooter' | 'biker' | 'driver' | 'made_man', number>>;
};

export const UNIT_DEFS: Record<
  'bruiser' | 'shooter' | 'biker' | 'driver' | 'made_man',
  UnitDef
> = {
  bruiser: {
    hp: 200, atk: 60, def: 140, speed: 1.0, load: 12,
    trainCost: 800, trainSec: 60,
    counters: { biker: 1.5 },
  },
  shooter: {
    hp: 90, atk: 220, def: 50, speed: 1.2, load: 8,
    trainCost: 1200, trainSec: 90,
    counters: { bruiser: 1.5 },
  },
  biker: {
    hp: 130, atk: 150, def: 80, speed: 2.4, load: 6,
    trainCost: 1600, trainSec: 75,
    counters: { shooter: 1.5 },
  },
  driver: {
    hp: 600, atk: 50, def: 380, speed: 0.8, load: 200,
    trainCost: 4500, trainSec: 240,
    counters: {},
  },
  made_man: {
    hp: 480, atk: 380, def: 280, speed: 1.6, load: 18,
    trainCost: 8000, trainSec: 480,
    unlockAt: 13,
    counters: { bruiser: 1.25, shooter: 1.25, biker: 1.25 },
  },
};

export type UnitKey = keyof typeof UNIT_DEFS;

function troopPower(state: PlayerStateBlob): number {
  let p = 0;
  for (const key of Object.keys(state.troops) as UnitKey[]) {
    const def = UNIT_DEFS[key];
    if (!def) continue;
    const c = state.troops[key]?.count ?? 0;
    p += c * (def.atk + def.def + def.hp * 0.4);
  }
  return Math.floor(p);
}

function buildingPower(state: PlayerStateBlob): number {
  let p = 0;
  for (const b of Object.values(state.buildings)) {
    p += (b?.level ?? 0) * 4200;
  }
  return p;
}

function heroPower(state: PlayerStateBlob): number {
  const s = state.hero.skills;
  return (
    (s.attack + s.defense + s.leadership + s.stealth + s.charisma) * 320
  );
}

function researchPower(state: PlayerStateBlob): number {
  let p = 0;
  for (const tier of Object.values(state.research)) {
    for (const v of Object.values(tier)) {
      p += (v as number) * 60000;
    }
  }
  return Math.floor(p);
}

function gearPower(state: PlayerStateBlob): number {
  let p = 0;
  for (const item of Object.values(state.hero.gear)) {
    if (!item) continue;
    p +=
      item.rarity === 'legendary' ? 80000 :
      item.rarity === 'epic'      ? 45000 :
      item.rarity === 'rare'      ? 22000 :
      8000;
  }
  return p;
}

export function computePower(state: PlayerStateBlob): PowerBreakdown {
  const t = troopPower(state);
  const b = buildingPower(state);
  const h = heroPower(state);
  const r = researchPower(state);
  const g = gearPower(state);
  return {
    troops: t,
    buildings: b,
    hero: h,
    research: r,
    gear: g,
    total: t + b + h + r + g,
  };
}
