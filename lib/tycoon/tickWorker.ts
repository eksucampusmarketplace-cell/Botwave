/**
 * Tycoon background tick sweeper.
 *
 * §29.2: state is lazy-evaluated, so the *common* path for tick application
 * is "on user action" (the API route reads the player, applies tick, writes
 * back). The sweeper exists to handle two cases that the lazy path doesn't:
 *
 *   1. **Timer completion notifications.** If a player has a training task
 *      finishing in 30 seconds and they don't open the app for hours, the
 *      Bot DM push (V1 nice-to-have, V1.1 hard requirement) needs to fire
 *      *when* the timer fires, not when they next read state. The sweeper
 *      finds rows where `state_dirty_until <= now` and applies the tick,
 *      which schedules the push as a side effect.
 *
 *   2. **Long-tail abandonment.** Players who quit get their state
 *      compounding silently. The sweeper bounds the worst-case
 *      single-tick cost by applying it at least every N minutes for
 *      rows that have *any* timer pending.
 *
 * V1 scope: just the lazy path is enforced. The sweeper is implemented
 * but only fires `applyTick`+persist on dirty rows. Push notifications
 * are wired in V1.1.
 *
 * NOT wired into `bot/telegram/factory.ts` yet — that registration
 * happens in the same PR that adds the cron schedule infrastructure for
 * the bot, to avoid making this PR also touch the bot bootstrap.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { applyTick } from './tick';
import { persistTickedPlayer } from './state';
import type { PlayerRecord } from './types';

/**
 * One sweep: load all players whose `state_dirty_until` has elapsed,
 * apply tick, write back. Returns a summary for logging.
 */
export async function runTycoonTickSweep(
  supabase: SupabaseClient,
  opts: { batchSize?: number; nowMs?: number } = {},
): Promise<{ scanned: number; advanced: number; failed: number }> {
  const batchSize = opts.batchSize ?? 200;
  const nowMs = opts.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data, error } = await supabase
    .from('tycoon_players')
    .select('*')
    .not('state_dirty_until', 'is', null)
    .lte('state_dirty_until', nowIso)
    .order('state_dirty_until', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`tycoon: tick sweep query failed: ${error.message}`);
  }

  let advanced = 0;
  let failed = 0;
  const rows = (data ?? []) as PlayerRecord[];
  for (const row of rows) {
    try {
      const ticked = applyTick(row, nowMs);
      await persistTickedPlayer(supabase, ticked.player, row.save_version);
      advanced++;
    } catch (e) {
      failed++;
      // Surface the error so the caller can log it; don't blow up the
      // whole sweep on a single bad row.
      console.warn(
        `[tycoon-tick] sweep failed for player ${row.id}:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return { scanned: rows.length, advanced, failed };
}

/**
 * Convenience for the cron entrypoint: build the admin client and run
 * one sweep. Used by both an internal HTTP endpoint and the bot-side
 * scheduler (whichever wires it up first).
 */
export async function runTycoonTickSweepWithAdminClient(): Promise<
  | { ok: true; scanned: number; advanced: number; failed: number }
  | { ok: false; reason: string }
> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  let supabase: Awaited<ReturnType<typeof createAdminClient>>;
  try {
    supabase = await createAdminClient();
  } catch (e) {
    return {
      ok: false,
      reason: `admin client unavailable: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  try {
    const summary = await runTycoonTickSweep(supabase);
    return { ok: true, ...summary };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
