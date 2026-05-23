/**
 * Cosa Nostra Tycoon — domain types.
 *
 * The shape mirrors the client mockup state in
 * `public/miniapp/tycoon-mockup.html` (`freshState()`), with the following
 * server-side adjustments:
 *
 *  - Timers are stored as ISO timestamps, not Date.now() millis. Client
 *    converts on read.
 *  - The hot scalars (coins, gems, energy, level, hq_level, power) live
 *    as columns on `tycoon_players`; only the flexible bits live in the
 *    `state` JSONB blob (see `PlayerStateBlob`).
 *  - All randomness is server-resolved with a seeded PRNG (§29.3);
 *    client never trusts client-supplied seeds for combat.
 */

/* ============================================================
 * Top-level player record (row from tycoon_players)
 * ============================================================ */

export type PlayerRecord = {
  id: string;                   // UUID
  telegram_user_id: number;
  telegram_username: string | null;
  display_name: string;
  host_bot: string | null;
  city_id: number | null;
  family_id: string | null;
  family_role: 1 | 2 | 3 | 4 | 5;

  level: number;
  xp: number;
  hq_level: number;
  coins: number;
  gems: number;
  energy: number;
  energy_max: number;
  energy_regen_sec: number;
  rep: number;
  war_pts: number;
  power: number;

  shield_until: string | null;
  last_tick_at: string;
  state_dirty_until: string | null;
  state: PlayerStateBlob;
  save_version: number;

  born_at: string;
  created_at: string;
  updated_at: string;
};

/* ============================================================
 * The JSONB blob hung off PlayerRecord.state
 * ============================================================ */

export type PlayerStateBlob = {
  /** Schema version for this blob. Bump when a migration is needed. */
  blob_version: 1;

  hero: Hero;
  research: Research;
  buildings: Buildings;
  troops: Troops;
  businesses: Business[];
  /** Active in-flight training/upgrade queues. */
  queues?: Queues;
  /** Last computed power breakdown — for debug; recomputed each tick. */
  power_breakdown?: PowerBreakdown;
};

/* ---------- Hero (skills, talents, gear) ------------------- */

export type HeroSkillKey =
  | 'attack'
  | 'defense'
  | 'leadership'
  | 'stealth'
  | 'charisma';

export type HeroTalentKey =
  | 'economy'
  | 'military'
  | 'defense'
  | 'raid';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GearSlot = 'fedora' | 'tie' | 'ring' | 'cigar' | 'watch';

export type GearItem = {
  name: string;
  bonus: string;
  rarity: Rarity;
  mod: Partial<{
    income: number;
    def: number;
    rally: number;
    atk: number;
    speed: number;
  }>;
};

export type Hero = {
  skill_pts: number;
  skills: Record<HeroSkillKey, number>;
  talent_pts: number;
  talents: Record<HeroTalentKey, number>;
  gear: Partial<Record<GearSlot, GearItem>>;
};

/* ---------- Research tree (§19) ---------------------------- */

export type Research = {
  economy: { income_pct: number };
  military: {
    atk_pct: number;
    def_pct: number;
    march_pct: number;
    load_pct: number;
  };
  defense: { wall_pct: number; vault_pct: number; shield_pct: number };
  espionage: { scout_pct: number };
};

/* ---------- Buildings (§13) -------------------------------- */

export type BuildingKey =
  | 'hq'
  | 'vault'
  | 'yard'
  | 'clinic'
  | 'garage'
  | 'armory'
  | 'walls'
  | 'speakeasy';

export type Building = {
  name: string;
  level: number;
  /** ISO timestamp when current upgrade completes. */
  upgrading_ends_at: string | null;
  /** HQ level required to unlock this building (optional). */
  unlock_at?: number;
};

export type Buildings = Record<BuildingKey, Building>;

/* ---------- Troops (§10) ----------------------------------- */

export type UnitKey =
  | 'bruiser'
  | 'shooter'
  | 'biker'
  | 'driver'
  | 'made_man';

export type Troop = {
  count: number;
  wounded: number;
  /** Active training task ending at ISO timestamp; null when idle. */
  training_ends_at: string | null;
  /** Number being trained in the active task. */
  training_count: number;
};

export type Troops = Record<UnitKey, Troop>;

/* ---------- Businesses (§12) ------------------------------- */

export type Business = {
  id: string;
  name: string;
  icon: string;
  level: number;
  /** Coins/hour accrual at this level. */
  rate: number;
  /** Capacity ceiling before pickup is required. */
  cap: number;
  /** ISO timestamp of last collection (drives idle accrual). */
  last_collected_at: string;
  unlock_at: number;
};

/* ---------- Async work queues ------------------------------ */

export type Queues = {
  building_upgrades?: Array<{ key: BuildingKey; ends_at: string }>;
  troop_training?: Array<{ unit: UnitKey; count: number; ends_at: string }>;
  marches?: Array<{
    target_player_id: string;
    troops_sent: Partial<Record<UnitKey, number>>;
    arrives_at: string;
  }>;
};

/* ---------- Power breakdown -------------------------------- */

export type PowerBreakdown = {
  troops: number;
  buildings: number;
  hero: number;
  research: number;
  gear: number;
  total: number;
};

/* ============================================================
 * Combat (§14, §29.3) — used by /api/tycoon/raid in PR-D
 * ============================================================ */

export type BattleRequest = {
  attacker_player_id: string;
  defender_player_id: string | null;
  defender_npc_kind?: string | null;
  troops_sent: Partial<Record<UnitKey, number>>;
};

export type BattleResult = {
  victory: boolean;
  rounds: BattleRound[];
  attacker_casualties: { dead: Partial<Record<UnitKey, number>>; wounded: Partial<Record<UnitKey, number>> };
  defender_casualties: { dead: Partial<Record<UnitKey, number>>; wounded: Partial<Record<UnitKey, number>> };
  loot_coins: number;
  loot_gems: number;
  rep_delta: number;
  attacker_power: number;
  defender_power: number;
  seed: number;
};

export type BattleRound = {
  /** Round index 1..N. */
  round: number;
  attacker_alive: Partial<Record<UnitKey, number>>;
  defender_alive: Partial<Record<UnitKey, number>>;
  attacker_damage_dealt: number;
  defender_damage_dealt: number;
};

/* ============================================================
 * API DTOs
 * ============================================================ */

export type TycoonStateResponse = {
  player: Pick<
    PlayerRecord,
    | 'id'
    | 'telegram_user_id'
    | 'telegram_username'
    | 'display_name'
    | 'city_id'
    | 'family_id'
    | 'family_role'
    | 'level'
    | 'xp'
    | 'hq_level'
    | 'coins'
    | 'gems'
    | 'energy'
    | 'energy_max'
    | 'energy_regen_sec'
    | 'rep'
    | 'war_pts'
    | 'power'
    | 'shield_until'
    | 'save_version'
  >;
  state: PlayerStateBlob;
  /** Seconds since UNIX epoch the server applied this tick. */
  server_now: number;
};

export type TycoonInitRequest = {
  initData: string;
  /** Optional Botwave session id; identifies the host bot when present. */
  session_id?: string;
  /** Optional display name override (otherwise pulled from initData). */
  display_name?: string;
};

export type TycoonInitResponse = {
  created: boolean;
  player_id: string;
};

export type TycoonWriteRequest = {
  initData: string;
  session_id?: string;
  /** Optimistic lock token; must match server's current save_version. */
  save_version: number;
  /**
   * Whitelisted client-side fields the client is allowed to send for
   * convenience (e.g. cosmetic name change). Authoritative numbers
   * (coins, gems, energy, power) are NEVER trusted from the client.
   */
  patch?: {
    display_name?: string;
  };
};

export type TycoonWriteResponse = TycoonStateResponse & {
  save_version: number;
};
