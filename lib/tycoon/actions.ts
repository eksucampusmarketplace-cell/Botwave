import type { PlayerRecord, PlayerStateBlob } from './types';
import { UNIT_DEFS } from './power';

export function clonePlayer(player: PlayerRecord): PlayerRecord {
  return structuredClone(player);
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

export function nextDirtyUntil(state: PlayerStateBlob, nowMs: number = Date.now()): string | null {
  let earliest: number | null = null;
  const consider = (iso: string | null) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && (earliest == null || ms < earliest)) earliest = ms;
  };

  for (const troop of Object.values(state.troops)) consider(troop.training_ends_at);
  for (const building of Object.values(state.buildings)) consider(building.upgrading_ends_at);

  const clinicLevel = state.buildings.clinic?.level ?? 0;
  const healPerHour = clinicHealCapacityPerTick(clinicLevel);
  if (healPerHour > 0) {
    const wounded = Object.values(state.troops).reduce(
      (total, troop) => total + Math.max(0, troop.wounded || 0),
      0,
    );
    if (wounded > 0) {
      consider(new Date(nowMs + Math.ceil((3600 / healPerHour) * 1000)).toISOString());
    }
  }

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
