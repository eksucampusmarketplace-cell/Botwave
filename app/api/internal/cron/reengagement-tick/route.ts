/**
 * Internal cron endpoint — re-engagement email sweep for zero-session users.
 *
 * Designed to be hit hourly from the bot's health-monitor loop (or any
 * external scheduler — Render Cron, GitHub Actions cron, etc.). The
 * endpoint itself decides whether enough time has elapsed since the last
 * sweep to do real work, so calling it more often than necessary is safe.
 *
 * Why this exists when /api/admin/email-broadcast already has auto-send:
 *   - That route's setInterval lives in the Next.js web process and only
 *     restarts when an admin opens the page after a deploy.
 *   - This endpoint runs independently and reads its config straight from
 *     system_config — survives every restart, no admin visit required.
 *
 * Auth: a query param `?secret=` or `x-internal-cron-secret` header that
 * matches process.env.INTERNAL_CRON_SECRET. If the env var is unset, the
 * endpoint refuses to run (fail-closed).
 *
 * Query params:
 *   secret         — required, see above
 *   zeroOnly       — '1' to send ONLY to users who have literally zero
 *                    bot_sessions rows. Default: true (the funnel cohort
 *                    we actually want to convert). Set to '0' to fall
 *                    back to the legacy "any inactive user" cohort.
 *   inactiveHours  — override system_config.email_auto_send.inactiveHours
 *   maxBatch       — cap recipients per sweep (default 200, prevents one
 *                    bad config from emailing thousands at once)
 *   force          — '1' to bypass the intervalHours due-check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReengagementEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface AutoSendConfig {
  enabled?: boolean;
  intervalHours?: number;
  inactiveHours?: number;
}

function unauthorized(reason: string) {
  return NextResponse.json({ error: 'Unauthorized', reason }, { status: 401 });
}

async function getConfig(): Promise<AutoSendConfig> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'email_auto_send')
      .maybeSingle();
    return (data?.value as AutoSendConfig) || {};
  } catch {
    return {};
  }
}

async function getLastSweepAt(): Promise<number | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('email_broadcast_log')
      .select('created_at')
      .eq('campaign_type', 'reengagement')
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.created_at ? new Date(data.created_at).getTime() : null;
  } catch {
    return null;
  }
}

async function fetchAllAuthUsers(supabase: ReturnType<typeof getSupabase>): Promise<{ id: string; email: string }[]> {
  const users: { id: string; email: string }[] = [];
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (!batch || batch.length === 0) break;
    for (const u of batch) {
      if (u.email && !u.email.endsWith('@botwave.local')) {
        users.push({ id: u.id, email: u.email });
      }
    }
    if (batch.length < 1000) break;
    page++;
  }
  return users;
}

export async function GET(request: NextRequest) {
  return runSweep(request);
}

export async function POST(request: NextRequest) {
  return runSweep(request);
}

async function runSweep(request: NextRequest) {
  const expected = process.env.INTERNAL_CRON_SECRET;
  if (!expected) return unauthorized('INTERNAL_CRON_SECRET not configured');
  const got = request.nextUrl.searchParams.get('secret') || request.headers.get('x-internal-cron-secret');
  if (got !== expected) return unauthorized('bad secret');

  const zeroOnly = (request.nextUrl.searchParams.get('zeroOnly') ?? '1') !== '0';
  const force = request.nextUrl.searchParams.get('force') === '1';
  const maxBatch = Math.min(500, Math.max(1, parseInt(request.nextUrl.searchParams.get('maxBatch') || '200', 10)));

  const config = await getConfig();
  if (!config.enabled && !force) {
    return NextResponse.json({ success: true, skipped: true, reason: 'auto-send disabled in system_config' });
  }

  const intervalHours = Math.max(1, Math.min(24 * 30, Number(config.intervalHours) || 24));
  const inactiveHoursParam = request.nextUrl.searchParams.get('inactiveHours');
  const inactiveHours = Math.max(
    1,
    Math.min(24 * 30, Number(inactiveHoursParam) || Number(config.inactiveHours) || 24),
  );

  if (!force) {
    const lastSweepAt = await getLastSweepAt();
    if (lastSweepAt && Date.now() - lastSweepAt < intervalHours * 60 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'interval not yet elapsed',
        nextEligibleAt: new Date(lastSweepAt + intervalHours * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  const supabase = getSupabase();

  // ── Build candidate set ─────────────────────────────────────────────────
  const authUsers = await fetchAllAuthUsers(supabase);
  if (authUsers.length === 0) {
    return NextResponse.json({ success: true, sent: 0, eligible: 0, reason: 'no auth users' });
  }
  const userIds = authUsers.map(u => u.id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, last_login_at, created_at')
    .in('id', userIds);
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Count sessions per user. Active state is what counts for "is the user
  // actually using BotWave"; everything else (needs_reauth, pairing_failed,
  // qr_pending, inactive) counts as "has not converted".
  const { data: sessions } = await supabase
    .from('bot_sessions')
    .select('user_id, state, updated_at');
  const sessionsByUser = new Map<string, { total: number; hasActive: boolean; lastActivity: string }>();
  for (const s of sessions || []) {
    const cur = sessionsByUser.get(s.user_id) || { total: 0, hasActive: false, lastActivity: '' };
    cur.total += 1;
    if (s.state === 'active') {
      cur.hasActive = true;
      if (s.updated_at && s.updated_at > cur.lastActivity) cur.lastActivity = s.updated_at;
    }
    sessionsByUser.set(s.user_id, cur);
  }

  // Dedup against the persistent log — defaults to a 7d cooldown for
  // cron-triggered sends so we never spam the same user every day even if
  // intervalHours is set to 1.
  const cooldownDays = 7;
  const cooldownCutoff = new Date(Date.now() - cooldownDays * 86400_000).toISOString();
  const { data: recentSends } = await supabase
    .from('email_broadcast_log')
    .select('user_id')
    .eq('campaign_type', 'reengagement')
    .eq('status', 'sent')
    .gte('sent_at', cooldownCutoff);
  const recentlySent = new Set((recentSends || []).map(r => r.user_id));

  const inactiveCutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();
  const candidates: { id: string; email: string; username: string; hasLinkedDevice: boolean }[] = [];

  for (const u of authUsers) {
    if (recentlySent.has(u.id)) continue;
    const profile = profileMap.get(u.id);
    const sess = sessionsByUser.get(u.id);
    const totalSessions = sess?.total || 0;
    const hasActive = sess?.hasActive || false;
    const lastActivity = sess?.lastActivity || profile?.last_login_at || '';

    // Zero-session mode: target users who literally never created a session
    if (zeroOnly && totalSessions !== 0) continue;

    // Always require the account to be at least `inactiveHours` old —
    // never email a brand-new signup mid-onboarding.
    const createdAt = profile?.created_at;
    if (!createdAt || createdAt > inactiveCutoff) continue;

    // And the user must actually be inactive (no recent login / activity).
    if (lastActivity && lastActivity > inactiveCutoff) continue;

    candidates.push({
      id: u.id,
      email: u.email,
      username: profile?.username || u.email.split('@')[0],
      hasLinkedDevice: hasActive,
    });

    if (candidates.length >= maxBatch) break;
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      eligible: 0,
      mode: zeroOnly ? 'zero-sessions-only' : 'all-inactive',
      inactiveHours,
      intervalHours,
      reason: 'no eligible users',
    });
  }

  // ── Send (sequential w/ jitter so we don't blast SMTP) ─────────────────
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const u of candidates) {
    // Last-mile unsubscribe check
    try {
      const { data: unsub } = await supabase
        .from('email_unsubscribes')
        .select('email')
        .eq('email', u.email.toLowerCase())
        .maybeSingle();
      if (unsub) {
        skipped += 1;
        continue;
      }
    } catch {
      /* table missing → fall through, send */
    }

    try {
      await sendReengagementEmail(u.email, u.username, u.hasLinkedDevice);
      sent += 1;
      await supabase.from('email_broadcast_log').insert({
        user_id: u.id,
        email: u.email,
        campaign_type: 'reengagement',
        status: 'sent',
      });
    } catch (err) {
      failed += 1;
      console.error(`[CRON/REENGAGEMENT] Send failed for ${u.email}:`, err);
      await supabase.from('email_broadcast_log').insert({
        user_id: u.id,
        email: u.email,
        campaign_type: 'reengagement',
        status: 'failed',
      });
    }

    // Polite SMTP rate-limit: 2-4s between sends.
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
  }

  return NextResponse.json({
    success: true,
    mode: zeroOnly ? 'zero-sessions-only' : 'all-inactive',
    inactiveHours,
    intervalHours,
    eligible: candidates.length,
    sent,
    failed,
    skipped,
  });
}
