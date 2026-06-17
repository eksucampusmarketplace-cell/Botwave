/**
 * Tiny deterministic PRNG for replayable combat (§29.3).
 *
 * mulberry32 — 32-bit state, ~2^32 period, fast, no globals. Same input
 * seed always produces the same sequence so a `tycoon_raids` row can be
 * replayed from `(seed, troops_sent, defender snapshot)` and yield the
 * exact same BattleResult the server stored.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random 32-bit non-zero seed sourced from the system. */
export function randomSeed(): number {
  return Math.max(1, Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
