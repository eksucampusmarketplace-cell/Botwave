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
 * Unit stat definitions, matching the mockup's `UNIT_DEFS`. Kept here on
 * the server so combat math is server-authoritative.
 */
export const UNIT_DEFS = {
  bruiser: { hp: 200, atk: 60, def: 140 },
  shooter: { hp: 90, atk: 220, def: 50 },
  biker: { hp: 130, atk: 150, def: 80 },
  driver: { hp: 600, atk: 50, def: 380 },
  made_man: { hp: 480, atk: 380, def: 280 },
} as const;

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
