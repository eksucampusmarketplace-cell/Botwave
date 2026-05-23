export type GemSku = {
  id: string;
  stars: number;
  gems: number;
  label: string;
};

export const GEM_SKUS: Record<string, GemSku> = {
  gem_pack_99: { id: 'gem_pack_99', stars: 99, gems: 120, label: 'Street Stack' },
  gem_pack_249: { id: 'gem_pack_249', stars: 249, gems: 340, label: 'Crew Cut' },
  gem_pack_499: { id: 'gem_pack_499', stars: 499, gems: 760, label: 'Boss Bag' },
  gem_pack_999: { id: 'gem_pack_999', stars: 999, gems: 1700, label: 'Family Vault' },
};

export function gemsForSpeedup(remainingSeconds: number): number {
  if (remainingSeconds <= 0) return 0;
  return Math.max(1, Math.ceil(remainingSeconds / 300));
}
