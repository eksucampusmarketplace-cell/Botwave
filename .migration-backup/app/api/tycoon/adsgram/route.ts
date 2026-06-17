/**
 * GET /api/tycoon/adsgram
 *
 * Adsgram S2S "reward" callback (§25). Called by Adsgram's servers when
 * a user finishes watching a rewarded video so we can grant the energy
 * pack / chest pull they earned.
 *
 * Adsgram's recommended flow is server-to-server with HMAC-signed query
 * params: blockId + userid + timestamp + signature. We validate the
 * signature, look up the user, idempotently credit the reward keyed on
 * the `reqid`, and log the event.
 *
 * V1 scope:
 *  - HMAC-SHA256 signature verification using `ADSGRAM_SECRET`.
 *  - Idempotency on `reqid` so Adsgram's retries don't double-grant.
 *  - Single reward kind: "energy_5" (gives +5 energy, no overflow).
 *  - Logs to `tycoon_events`. Player is found by (telegram_user_id, host_bot)
 *    if `host_bot` is provided; otherwise the canonical (host_bot=null)
 *    profile is used.
 *
 * Out of V1: chest pulls, gem rewards, ad-cap rate limiting (those live
 * in PR-D2 alongside the offer-template plumbing).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { findPlayer, loadAndTickPlayer, persistTickedPlayer } from '@/lib/tycoon/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_REWARDS = new Set(['energy_5']);
const REWARD_TTL_MS = 6 * 60 * 60 * 1000; // 6h replay window

export async function GET(req: NextRequest) {
  const secret = process.env.ADSGRAM_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'adsgram_secret_not_configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const blockId = url.searchParams.get('blockId') || '';
  const userid = url.searchParams.get('userid') || '';
  const reqid = url.searchParams.get('reqid') || '';
  const ts = url.searchParams.get('ts') || '';
  const reward = url.searchParams.get('reward') || 'energy_5';
  const hostBot = url.searchParams.get('host_bot') || null;
  const signature = url.searchParams.get('signature') || '';

  if (!blockId || !userid || !reqid || !ts) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  // Verify timestamp is within tolerance — protects against indefinite
  // signature replay.
  const tsMs = Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > REWARD_TTL_MS) {
    return NextResponse.json({ error: 'stale_request' }, { status: 401 });
  }

  // Reconstruct signed payload exactly as the sender did.
  const canonical = [blockId, userid, reqid, ts, reward, hostBot ?? ''].join('|');
  const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

  if (
    !signature ||
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  if (!ALLOWED_REWARDS.has(reward)) {
    return NextResponse.json({ error: 'unknown_reward' }, { status: 400 });
  }

  const telegramUserId = Number(userid);
  if (!Number.isFinite(telegramUserId)) {
    return NextResponse.json({ error: 'bad_user' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Idempotency on reqid: if we've already logged this exact callback,
  // return ok without re-granting. We use tycoon_events as the dedupe
  // store — a unique reqid per Adsgram impression is part of their spec.
  const { data: existing } = await supabase
    .from('tycoon_events')
    .select('id')
    .eq('kind', 'adsgram_reward')
    .filter('payload->>reqid', 'eq', reqid)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Look up player and grant the reward.
  const existingPlayer = await findPlayer(supabase, telegramUserId, hostBot);
  if (!existingPlayer) {
    return NextResponse.json({ error: 'player_not_found' }, { status: 404 });
  }

  const player = await loadAndTickPlayer(supabase, telegramUserId, hostBot);
  if (!player) {
    return NextResponse.json({ error: 'player_not_found' }, { status: 404 });
  }

  if (reward === 'energy_5') {
    player.energy = Math.min(player.energy_max, player.energy + 5);
  }

  try {
    await persistTickedPlayer(supabase, player, player.save_version);
  } catch (e) {
    return NextResponse.json(
      { error: 'persist_failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  await supabase.from('tycoon_events').insert({
    player_id: player.id,
    kind: 'adsgram_reward',
    payload: { blockId, reqid, reward, ts: tsMs },
  });

  return NextResponse.json({ ok: true, reward });
}
