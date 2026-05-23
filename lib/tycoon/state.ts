/**
 * Cosa Nostra Tycoon — load/save player state.
 *
 * All reads go through `loadAndTickPlayer`: fetch the row from Postgres,
 * apply the lazy tick (`lib/tycoon/tick.ts`), persist the post-tick state
 * back, and return the up-to-date PlayerRecord. The double-write per read
 * is unavoidable because lazy tick is by definition write-on-read.
 *
 * Writes go through `persistTickedPlayer` which enforces an optimistic
 * lock on `save_version`: clients send the version they last saw, the
 * write only succeeds if it still matches, otherwise the caller is told
 * to re-fetch.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRecord } from './types';
import { applyTick, type TickResult } from './tick';
import { freshPlayerColumns, NEWBIE_SHIELD_SECONDS } from './freshState';

const TYCOON_PLAYERS_TABLE = 'tycoon_players';

/** Get a single player row by (telegram_user_id, host_bot) or null. */
export async function findPlayer(
  supabase: SupabaseClient,
  telegramUserId: number,
  hostBot: string | null,
): Promise<PlayerRecord | null> {
  let query = supabase
    .from(TYCOON_PLAYERS_TABLE)
    .select('*')
    .eq('telegram_user_id', telegramUserId);
  query = hostBot ? query.eq('host_bot', hostBot) : query.is('host_bot', null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`tycoon: findPlayer failed: ${error.message}`);
  return (data as PlayerRecord) ?? null;
}

export type CreatePlayerInput = {
  telegram_user_id: number;
  telegram_username: string | null;
  display_name: string;
  host_bot: string | null;
  city_id?: number | null;
};

/** Insert a new player row with all fresh defaults. */
export async function createPlayer(
  supabase: SupabaseClient,
  input: CreatePlayerInput,
): Promise<PlayerRecord> {
  const defaults = freshPlayerColumns();

  // Resolve the Lagos city for V1 unless caller specifies otherwise.
  let cityId = input.city_id ?? null;
  if (cityId == null) {
    const { data: lagos } = await supabase
      .from('tycoon_cities')
      .select('id')
      .eq('slug', 'lagos')
      .maybeSingle();
    cityId = (lagos as { id: number } | null)?.id ?? null;
  }

  const row = {
    telegram_user_id: input.telegram_user_id,
    telegram_username: input.telegram_username,
    display_name: input.display_name,
    host_bot: input.host_bot,
    city_id: cityId,
    ...defaults,
  };

  const { data, error } = await supabase
    .from(TYCOON_PLAYERS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw new Error(`tycoon: createPlayer failed: ${error.message}`);
  }
  return data as PlayerRecord;
}

/**
 * Load a player and apply the lazy tick. Returns null if no row exists.
 *
 * Note: persists the post-tick state back to the DB on every read. Callers
 * that need to do additional writes inside the same logical action should
 * skip this and use `loadAndTickPlayerInMemory` instead, then call
 * `persistTickedPlayer` once at the end.
 */
export async function loadAndTickPlayer(
  supabase: SupabaseClient,
  telegramUserId: number,
  hostBot: string | null,
): Promise<PlayerRecord | null> {
  const before = await findPlayer(supabase, telegramUserId, hostBot);
  if (!before) return null;

  const ticked = applyTick(before);
  // Only write if anything actually changed.
  if (tickProducedChanges(ticked)) {
    await persistTickedPlayer(supabase, ticked.player, before.save_version);
  }
  return ticked.player;
}

/** In-memory variant for routes that will write back themselves. */
export async function loadAndTickPlayerInMemory(
  supabase: SupabaseClient,
  telegramUserId: number,
  hostBot: string | null,
): Promise<{ before: PlayerRecord; ticked: TickResult } | null> {
  const before = await findPlayer(supabase, telegramUserId, hostBot);
  if (!before) return null;
  return { before, ticked: applyTick(before) };
}

function tickProducedChanges(ticked: TickResult): boolean {
  const e = ticked.effects;
  return (
    e.energy_regenerated > 0 ||
    Object.keys(e.troops_healed).length > 0 ||
    Object.keys(e.troops_completed).length > 0 ||
    e.buildings_completed.length > 0
  );
}

/**
 * Persist a ticked player back to the DB with optimistic lock.
 *
 * Returns the new save_version on success. Throws "save_version_conflict"
 * if the row's save_version moved since `expectedSaveVersion` was read.
 */
export async function persistTickedPlayer(
  supabase: SupabaseClient,
  player: PlayerRecord,
  expectedSaveVersion: number,
): Promise<number> {
  const nextVersion = expectedSaveVersion + 1;

  const update = {
    energy: player.energy,
    coins: player.coins,
    gems: player.gems,
    level: player.level,
    xp: player.xp,
    hq_level: player.hq_level,
    rep: player.rep,
    war_pts: player.war_pts,
    power: player.power,
    shield_until: player.shield_until,
    last_tick_at: player.last_tick_at,
    state_dirty_until: player.state_dirty_until,
    state: player.state,
    save_version: nextVersion,
  };

  const { data, error } = await supabase
    .from(TYCOON_PLAYERS_TABLE)
    .update(update)
    .eq('id', player.id)
    .eq('save_version', expectedSaveVersion)
    .select('save_version')
    .maybeSingle();

  if (error) {
    throw new Error(`tycoon: persistTickedPlayer failed: ${error.message}`);
  }
  if (!data) {
    throw new Error('save_version_conflict');
  }
  return (data as { save_version: number }).save_version;
}

/**
 * Convenience: compute when the player's shield expires relative to now.
 * Returns seconds remaining, or 0 if none / expired.
 */
export function shieldSecondsRemaining(player: PlayerRecord): number {
  if (!player.shield_until) return 0;
  const remaining = Math.max(
    0,
    Math.floor((new Date(player.shield_until).getTime() - Date.now()) / 1000),
  );
  return remaining;
}

export const NEWBIE_SHIELD_SECONDS_EXPORT = NEWBIE_SHIELD_SECONDS;
