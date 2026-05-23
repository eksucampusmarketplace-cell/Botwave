import type { PlayerRecord, PlayerStateBlob } from './types';
import { UNIT_DEFS } from './power';

export function clonePlayer(player: PlayerRecord): PlayerRecord {
  return JSON.parse(JSON.stringify(player)) as PlayerRecord;
}

export function pendingBusinessCoins(
  business: PlayerStateBlob['businesses'][number],
  nowMs: number = Date.now(),
): number {
  if (business.level <= 0 || business.rate <= 0 || business.cap <= 0) return 0;
  const lastMs = new Date(business.last_collected_at).getTime();
  if (!Number.isFinite(lastMs)) return 0;
  const elapsedHr = Math.max(0, (nowMs - lastMs) / 3_600_000);
  return Math.floor(Math.min(business.cap, elapsedHr * business.rate));
}

export function nextDirtyUntil(state: PlayerStateBlob): string | null {
  let earliest: number | null = null;
  const consider = (iso: string | null) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && (earliest == null || ms < earliest)) earliest = ms;
  };

  for (const troop of Object.values(state.troops)) consider(troop.training_ends_at);
  for (const building of Object.values(state.buildings)) consider(building.upgrading_ends_at);
  return earliest == null ? null : new Date(earliest).toISOString();
}

export function clinicHealCapacityPerTick(clinicLevel: number): number {
  if (clinicLevel <= 0) return 0;
  return 2 + clinicLevel * 3;
}

export function countAvailableTroops(player: PlayerRecord, unit: keyof typeof UNIT_DEFS): number {
  const troop = player.state.troops[unit];
  if (!troop) return 0;
  return Math.max(0, (troop.count || 0) - (troop.wounded || 0));
}
