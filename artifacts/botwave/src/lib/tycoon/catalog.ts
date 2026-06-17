import type { BuildingKey, UnitKey } from './types';

export type NpcTarget = {
  kind: string;
  name: string;
  family: string;
  icon: string;
  power: number;
  vault: number;
  walls_level: number;
  enemy_troops: Partial<Record<UnitKey, number>>;
  min_level: number;
};

export const NPC_TARGETS: NpcTarget[] = [
  {
    kind: 'npc_petty_1',
    name: 'Skinny Joe',
    family: 'Streetwise',
    icon: '🥊',
    power: 2400,
    vault: 1200,
    walls_level: 0,
    enemy_troops: { bruiser: 8 },
    min_level: 1,
  },
  {
    kind: 'npc_petty_2',
    name: 'Vito "Two-Time"',
    family: 'Southside',
    icon: '🔫',
    power: 6800,
    vault: 3600,
    walls_level: 1,
    enemy_troops: { bruiser: 16, shooter: 4 },
    min_level: 2,
  },
  {
    kind: 'npc_petty_3',
    name: 'Big Mike',
    family: 'Dockyard',
    icon: '🏗',
    power: 16000,
    vault: 8000,
    walls_level: 2,
    enemy_troops: { bruiser: 24, shooter: 10, biker: 4 },
    min_level: 4,
  },
];

export const BUILDING_UPGRADE_DEFS: Record<
  BuildingKey,
  { baseCost: number; costGrowth: number; baseSec: number; secGrowth: number; maxLevel: number }
> = {
  hq: { baseCost: 1200, costGrowth: 1.7, baseSec: 180, secGrowth: 1.45, maxLevel: 30 },
  vault: { baseCost: 900, costGrowth: 1.55, baseSec: 120, secGrowth: 1.35, maxLevel: 30 },
  yard: { baseCost: 850, costGrowth: 1.5, baseSec: 120, secGrowth: 1.35, maxLevel: 30 },
  clinic: { baseCost: 1000, costGrowth: 1.55, baseSec: 150, secGrowth: 1.35, maxLevel: 30 },
  garage: { baseCost: 1500, costGrowth: 1.6, baseSec: 210, secGrowth: 1.38, maxLevel: 30 },
  armory: { baseCost: 1800, costGrowth: 1.65, baseSec: 240, secGrowth: 1.4, maxLevel: 30 },
  walls: { baseCost: 1000, costGrowth: 1.55, baseSec: 150, secGrowth: 1.35, maxLevel: 30 },
  speakeasy: { baseCost: 6000, costGrowth: 1.75, baseSec: 480, secGrowth: 1.45, maxLevel: 30 },
};

export function buildingUpgradeCost(key: BuildingKey, currentLevel: number): number {
  const def = BUILDING_UPGRADE_DEFS[key];
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, Math.max(0, currentLevel - 1)));
}

export function buildingUpgradeSeconds(key: BuildingKey, currentLevel: number): number {
  const def = BUILDING_UPGRADE_DEFS[key];
  return Math.floor(def.baseSec * Math.pow(def.secGrowth, Math.max(0, currentLevel - 1)));
}
