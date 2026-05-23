/**
 * Project a PlayerRecord into the JSON shape we return to the client.
 *
 * Centralised so /api/tycoon/auth, /api/tycoon/state, and any future
 * write endpoint all emit identical payloads. Anything not whitelisted
 * here (host_bot, last_tick_at, state_dirty_until, ip_prefix-style data)
 * stays server-side.
 */

import type { PlayerRecord, TycoonStateResponse } from './types';

export function snapshotPlayer(player: PlayerRecord): TycoonStateResponse {
  return {
    player: {
      id: player.id,
      telegram_user_id: player.telegram_user_id,
      telegram_username: player.telegram_username,
      display_name: player.display_name,
      city_id: player.city_id,
      family_id: player.family_id,
      family_role: player.family_role,
      level: player.level,
      xp: player.xp,
      hq_level: player.hq_level,
      coins: player.coins,
      gems: player.gems,
      energy: player.energy,
      energy_max: player.energy_max,
      energy_regen_sec: player.energy_regen_sec,
      rep: player.rep,
      war_pts: player.war_pts,
      power: player.power,
      shield_until: player.shield_until,
      save_version: player.save_version,
    },
    state: player.state,
    server_now: Math.floor(Date.now() / 1000),
  };
}
