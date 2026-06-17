/**
 * Cosa Nostra Tycoon — new-player initial state.
 *
 * The mockup's `freshState()` in `public/miniapp/tycoon-mockup.html`
 * starts the player at level 12 with 124 bruisers; that's a *demo* state
 * for screenshot purposes. On the real backend, brand-new players start
 * here.
 *
 * Tuned to satisfy the §4 5-minute hook:
 *   1. Bare HQ + Yard so the new-player UI has visible buildings.
 *   2. 10 starter bruisers so the first raid is winnable.
 *   3. Newbie shield active for §15 / §32.3.2 cold-start protection.
 *   4. One starter business (pizzeria) accruing income immediately so
 *      the first idle-collect dopamine hit fires within minutes.
 *   5. Starter gem stipend (50) so the first Stars-purchase tutorial
 *      isn't gated behind paying first.
 */

import type {
  Building,
  Buildings,
  Business,
  Hero,
  PlayerStateBlob,
  Research,
  Troops,
} from './types';

/**
 * Newbie shield duration, in seconds.
 *
 * §32.3.2 mitigation: ramp from a hard floor up to a soft floor over
 * the first N days. For V1 we ship a single fixed 7-day shield which
 * can be bumped via env if launch retention shows it's too short.
 */
export const NEWBIE_SHIELD_SECONDS = parseInt(
  process.env.TYCOON_NEWBIE_SHIELD_SECONDS || `${7 * 24 * 3600}`,
  10,
);

/** Starting hero — no skill/talent allocations, no gear. */
function freshHero(): Hero {
  return {
    skill_pts: 0,
    skills: { attack: 0, defense: 0, leadership: 0, stealth: 0, charisma: 0 },
    talent_pts: 0,
    talents: { economy: 0, military: 0, defense: 0, raid: 0 },
    gear: {},
  };
}

function freshResearch(): Research {
  return {
    economy: { income_pct: 0 },
    military: { atk_pct: 0, def_pct: 0, march_pct: 0, load_pct: 0 },
    defense: { wall_pct: 0, vault_pct: 0, shield_pct: 0 },
    espionage: { scout_pct: 0 },
  };
}

function emptyBuilding(name: string, unlockAt?: number): Building {
  return {
    name,
    level: 0,
    upgrading_ends_at: null,
    ...(typeof unlockAt === 'number' ? { unlock_at: unlockAt } : {}),
  };
}

function freshBuildings(): Buildings {
  return {
    hq: { name: 'Hideout HQ', level: 1, upgrading_ends_at: null },
    vault: { name: 'The Vault', level: 1, upgrading_ends_at: null },
    yard: { name: 'Training Yard', level: 1, upgrading_ends_at: null },
    clinic: emptyBuilding("Doc's Clinic", 3),
    garage: emptyBuilding('Garage', 4),
    armory: emptyBuilding('Armory', 5),
    walls: { name: 'Walls', level: 1, upgrading_ends_at: null },
    speakeasy: emptyBuilding('Speakeasy', 13),
  };
}

function freshTroops(): Troops {
  return {
    bruiser: {
      count: 10,        // starter army so first raid is winnable
      wounded: 0,
      training_ends_at: null,
      training_count: 0,
    },
    shooter: { count: 0, wounded: 0, training_ends_at: null, training_count: 0 },
    biker: { count: 0, wounded: 0, training_ends_at: null, training_count: 0 },
    driver: { count: 0, wounded: 0, training_ends_at: null, training_count: 0 },
    made_man: { count: 0, wounded: 0, training_ends_at: null, training_count: 0 },
  };
}

function freshBusinesses(nowIso: string): Business[] {
  return [
    {
      id: 'pizzeria',
      name: "Tony's Pizzeria",
      icon: '🍕',
      level: 1,
      rate: 300,
      cap: 2400,
      last_collected_at: nowIso,
      unlock_at: 1,
    },
    {
      id: 'casino',
      name: 'Lucky Cat Casino',
      icon: '🎰',
      level: 0,
      rate: 0,
      cap: 1800,
      last_collected_at: nowIso,
      unlock_at: 1,
    },
    {
      id: 'laundry',
      name: 'Clean Sheets',
      icon: '🧺',
      level: 0,
      rate: 0,
      cap: 1200,
      last_collected_at: nowIso,
      unlock_at: 1,
    },
    {
      id: 'docks',
      name: 'Eastside Docks',
      icon: '🚢',
      level: 0,
      rate: 0,
      cap: 3000,
      last_collected_at: nowIso,
      unlock_at: 1,
    },
    {
      id: 'autobody',
      name: 'Auto Body Shop',
      icon: '🛠',
      level: 0,
      rate: 0,
      cap: 0,
      last_collected_at: nowIso,
      unlock_at: 10,
    },
    {
      id: 'underground',
      name: 'Underground Casino',
      icon: '🕯',
      level: 0,
      rate: 0,
      cap: 0,
      last_collected_at: nowIso,
      unlock_at: 15,
    },
  ];
}

/** Build a brand-new player's `state` JSONB blob. */
export function freshPlayerStateBlob(nowIso: string): PlayerStateBlob {
  return {
    blob_version: 1,
    hero: freshHero(),
    research: freshResearch(),
    buildings: freshBuildings(),
    troops: freshTroops(),
    businesses: freshBusinesses(nowIso),
  };
}

/** Column-level defaults for a new tycoon_players row. */
export function freshPlayerColumns(now: Date = new Date()) {
  const shieldUntil = new Date(now.getTime() + NEWBIE_SHIELD_SECONDS * 1000);
  return {
    level: 1,
    xp: 0,
    hq_level: 1,
    coins: 1000,
    gems: 50,
    energy: 100,
    energy_max: 100,
    energy_regen_sec: 90,
    rep: 0,
    war_pts: 0,
    power: 0,
    family_role: 1 as const,
    shield_until: shieldUntil.toISOString(),
    last_tick_at: now.toISOString(),
    state_dirty_until: null as string | null,
    save_version: 1,
    born_at: now.toISOString(),
    state: freshPlayerStateBlob(now.toISOString()),
  };
}
