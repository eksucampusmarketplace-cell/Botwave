-- 067_tycoon_v1_schema.sql
--
-- Cosa Nostra Tycoon — V1 backend foundation.
--
-- Companion to migration 066_tycoon_signups.sql (which already shipped
-- the coming-soon-lander schema: tycoon_signups + tycoon_lander_events).
-- This migration lays down the actual game schema per
-- docs/design/cosa-nostra-design.md §29.4, scoped to the §33.1 V1 box.
--
-- Mirrors the client-side mockup state in
-- public/miniapp/tycoon-mockup.html (freshState).
--
-- Design choices baked in here:
--
--  * Players are keyed by (telegram_user_id, host_bot) so the same TG user
--    can play in multiple bots (cross-bot platform, §21). One canonical
--    profile per (user, bot) pair.
--  * Mutable per-player blob (hero, research, gear, businesses, training
--    queues) lives in `state JSONB` for forward-compat. The hot scalars
--    that get queried/sorted on (coins, gems, energy, hq_level, power)
--    are columns.
--  * Families map 1:1 to a Telegram group chat (`tg_group_id UNIQUE`),
--    per §18. A group is a family.
--  * Raid logs are append-only and store the resolved BattleResult JSONB
--    so we can replay (§29.3 — seeded PRNG, deterministic).
--
-- RLS: everything is locked down to service_role. Tycoon API routes go
-- through `createAdminClient()` and enforce auth at the API layer via
-- Telegram initData (lib/tycoon/auth.ts). Public reads (e.g. leaderboards)
-- are added only on the specific table where they're safe.

-- ─── 1. cities ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tycoon_cities (
  id              SERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  region          TEXT,
  -- Population caps (§15). When active_players >= soft_cap, new players
  -- are routed to the next city. Hard cap is the matchmaking ceiling.
  soft_cap        INTEGER NOT NULL DEFAULT 500,
  hard_cap        INTEGER NOT NULL DEFAULT 2000,
  mayor_player_id UUID,              -- nullable; set after election (V2)
  mayor_term_ends_at TIMESTAMPTZ,
  policy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_open         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tycoon_cities IS
  'Logical PvP shard (§15). Single Lagos city for V1.';

-- Seed Lagos as the V1 launch city (§33.1).
INSERT INTO tycoon_cities (slug, name, region, soft_cap, hard_cap)
VALUES ('lagos', 'Lagos', 'africa-west', 500, 2000)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. families (TG group ↔ family identity, §18) ────────────────────────

CREATE TABLE IF NOT EXISTS tycoon_families (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id         INTEGER NOT NULL REFERENCES tycoon_cities(id) ON DELETE RESTRICT,
  name            VARCHAR(48) NOT NULL,
  tag             VARCHAR(4)  NOT NULL,
  tg_group_id     BIGINT UNIQUE,    -- nullable — solo families allowed pre-bridge
  founder_user_id BIGINT NOT NULL,  -- TG user id of R5
  member_count    SMALLINT NOT NULL DEFAULT 1,
  -- Treasury and research are JSONB for forward-compat with §19 features.
  bank            JSONB NOT NULL DEFAULT '{"coins":0,"gems":0}'::jsonb,
  research        JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_families_city ON tycoon_families(city_id);
CREATE INDEX IF NOT EXISTS idx_tycoon_families_tag  ON tycoon_families(tag);

-- ─── 3. players ───────────────────────────────────────────────────────────
--
-- Hot path table. Keep scalar columns aligned with the §29.4 sketch.
-- `state JSONB` is the flexible blob (hero, buildings, troops, businesses,
-- research, gear, training queues, etc.). See lib/tycoon/types.ts.

CREATE TABLE IF NOT EXISTS tycoon_players (
  -- Composite uniqueness on (telegram_user_id, host_bot); UUID PK so other
  -- tables FK without caring about which bot a player came in through.
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id   BIGINT NOT NULL,
  telegram_username  TEXT,
  display_name       TEXT NOT NULL,
  -- `host_bot` is the Botwave bot session that introduced this player
  -- (§21 cross-bot platform). NULL for "platform-canonical" / lander-
  -- created accounts. Not an FK because Botwave session ids are uuid
  -- and we don't want to cascade-delete a player when a bot is rebuilt.
  host_bot           TEXT,
  city_id            INTEGER REFERENCES tycoon_cities(id) ON DELETE SET NULL,
  family_id          UUID REFERENCES tycoon_families(id) ON DELETE SET NULL,
  family_role        SMALLINT NOT NULL DEFAULT 1
                     CHECK (family_role BETWEEN 1 AND 5),  -- R1..R5 (§18)

  -- Hot scalars (queried on every state read).
  level              INTEGER NOT NULL DEFAULT 1,
  xp                 INTEGER NOT NULL DEFAULT 0,
  hq_level           SMALLINT NOT NULL DEFAULT 1,
  coins              BIGINT NOT NULL DEFAULT 0,
  gems               INTEGER NOT NULL DEFAULT 0,
  energy             SMALLINT NOT NULL DEFAULT 100,
  energy_max         SMALLINT NOT NULL DEFAULT 100,
  energy_regen_sec   SMALLINT NOT NULL DEFAULT 90,
  rep                INTEGER NOT NULL DEFAULT 0,
  war_pts            INTEGER NOT NULL DEFAULT 0,
  -- Denormalized power (§9, computed on tick). Used for matchmaking +
  -- leaderboards. Recomputed by the tick worker; trusted only after
  -- a write.
  power              BIGINT NOT NULL DEFAULT 0,

  -- §15 newbie shield + buyable shield window.
  shield_until       TIMESTAMPTZ,

  -- Lazy-eval anchor (§29.2). `last_tick_at` is the last point we
  -- applied accrual; `state_dirty_until` is when the next scheduled
  -- timer (training finish, building upgrade finish) fires so the
  -- sweeper can find this row.
  last_tick_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  state_dirty_until  TIMESTAMPTZ,

  -- The fat JSONB blob. See lib/tycoon/types.ts for shape.
  state              JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Save versioning for optimistic locking on client writes.
  save_version       INTEGER NOT NULL DEFAULT 1,

  born_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (telegram_user_id, host_bot)
);

CREATE INDEX IF NOT EXISTS idx_tycoon_players_telegram ON tycoon_players(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tycoon_players_city     ON tycoon_players(city_id);
CREATE INDEX IF NOT EXISTS idx_tycoon_players_family   ON tycoon_players(family_id);
CREATE INDEX IF NOT EXISTS idx_tycoon_players_power    ON tycoon_players(city_id, power DESC);
-- Sweeper index: find players with timers that just fired.
CREATE INDEX IF NOT EXISTS idx_tycoon_players_dirty
  ON tycoon_players(state_dirty_until)
  WHERE state_dirty_until IS NOT NULL;

-- ─── 4. family_members (denormalized membership) ─────────────────────────
-- Family role is duplicated on players for fast joins, but the canonical
-- membership log + audit trail lives here.

CREATE TABLE IF NOT EXISTS tycoon_family_members (
  family_id    UUID NOT NULL REFERENCES tycoon_families(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  role         SMALLINT NOT NULL DEFAULT 1
               CHECK (role BETWEEN 1 AND 5),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at      TIMESTAMPTZ,
  PRIMARY KEY (family_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tycoon_family_members_player ON tycoon_family_members(player_id);

-- ─── 5. raids (battle log, §29.3) ─────────────────────────────────────────
-- Append-only. Each row is a resolved BattleResult that the client can
-- replay deterministically.

CREATE TABLE IF NOT EXISTS tycoon_raids (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_player_id    UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  defender_player_id    UUID REFERENCES tycoon_players(id) ON DELETE SET NULL,
  -- For NPC raids during the shielded onboarding window (§33.1, §32.3.2).
  defender_npc_kind     TEXT,
  city_id               INTEGER REFERENCES tycoon_cities(id) ON DELETE SET NULL,

  -- Inputs
  troops_sent           JSONB NOT NULL,                     -- { bruiser: 10, shooter: 5, ... }
  attacker_power        BIGINT NOT NULL,
  defender_power        BIGINT NOT NULL,
  seed                  BIGINT NOT NULL,                    -- PRNG seed for replay

  -- Outputs
  victory               BOOLEAN NOT NULL,
  attacker_casualties   JSONB NOT NULL DEFAULT '{}'::jsonb, -- { dead: {...}, wounded: {...} }
  defender_casualties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  loot_coins            BIGINT NOT NULL DEFAULT 0,
  loot_gems             INTEGER NOT NULL DEFAULT 0,
  rep_delta             INTEGER NOT NULL DEFAULT 0,
  result                JSONB NOT NULL DEFAULT '{}'::jsonb, -- full BattleResult for replay

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_raids_attacker ON tycoon_raids(attacker_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_raids_defender ON tycoon_raids(defender_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_raids_city     ON tycoon_raids(city_id, created_at DESC);

-- ─── 6. events (in-game analytics log) ────────────────────────────────────
-- Distinct from tycoon_lander_events (which is for the marketing lander
-- in migration 066). This is the in-game telemetry stream — quest
-- completes, building upgrades started, raids launched, etc.
-- ClickHouse offload is a V2 concern (§29.1); V1 just keeps the last
-- 30 days in Postgres.

CREATE TABLE IF NOT EXISTS tycoon_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID REFERENCES tycoon_players(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_events_player ON tycoon_events(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_events_kind   ON tycoon_events(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_events_created ON tycoon_events(created_at DESC);

-- ─── 7. RLS — everything service-role only by default ────────────────────

ALTER TABLE tycoon_cities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_family_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_raids           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_events          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_cities" ON tycoon_cities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_families" ON tycoon_families
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_players" ON tycoon_players
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_family_members" ON tycoon_family_members
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_raids" ON tycoon_raids
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_events" ON tycoon_events
  FOR ALL USING (auth.role() = 'service_role');

-- Public-readable city directory (§23 leaderboard surface). We do NOT
-- expose anything that could be used to target a player from this row.
CREATE POLICY "anon_read_tycoon_cities" ON tycoon_cities
  FOR SELECT USING (true);

-- ─── updated_at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION tycoon_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tycoon_players_updated_at ON tycoon_players;
CREATE TRIGGER trg_tycoon_players_updated_at
BEFORE UPDATE ON tycoon_players
FOR EACH ROW EXECUTE FUNCTION tycoon_set_updated_at();

DROP TRIGGER IF EXISTS trg_tycoon_families_updated_at ON tycoon_families;
CREATE TRIGGER trg_tycoon_families_updated_at
BEFORE UPDATE ON tycoon_families
FOR EACH ROW EXECUTE FUNCTION tycoon_set_updated_at();
