/**
 * GET /api/bot/sessions/[id]/health
 *
 * Returns per-session health telemetry for the dashboard SessionHealthBadge:
 *   - Proxy assignment (proxy_id + last_proxy_assigned + proxy_type)
 *   - Disconnect count in the last 24h (from bot_health_events)
 *   - Most recent disconnect timestamp + details
 *   - Last known state transition reason
 *
 * This is read-only and scoped to the calling user — RLS on bot_health_events
 * already restricts SELECT to sessions the user owns, but we double-check here
 * so a leaked session_id can't be queried by an unrelated logged-in user.
 *
 * Used by /components/ui/SessionHealthBadge.tsx on every SessionCard. Works
 * uniformly across whatsapp / telegram_bot / telegram_userbot.
 */
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    // Ownership check + proxy data in one read
    const { data: session, error: sessionErr } = await supabase
      .from('bot_sessions')
      .select('id, user_id, platform, state, proxy_type, proxy_id, proxy_host, last_proxy_assigned, last_pairing_error')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionErr) {
      console.error(`[health/${sessionId}] session read error:`, sessionErr.message);
      return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Recent disconnect events (24h window). bot_health_events has RLS that
    // already enforces ownership, but we keep the user-id check above as
    // defence-in-depth so an unrelated user cannot enumerate session ids.
    const sinceIso = new Date(Date.now() - ONE_DAY_MS).toISOString();

    const { data: disconnectEvents, error: eventsErr } = await supabase
      .from('bot_health_events')
      .select('event_type, details, created_at')
      .eq('session_id', sessionId)
      .in('event_type', ['disconnected', 'error', 'reconnecting'])
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20);

    if (eventsErr) {
      console.warn(`[health/${sessionId}] health events read error:`, eventsErr.message);
    }

    const events = disconnectEvents ?? [];
    const disconnectCount = events.filter(e => e.event_type === 'disconnected').length;
    const errorCount = events.filter(e => e.event_type === 'error').length;
    const lastDisconnect = events.find(e => e.event_type === 'disconnected') ?? null;

    // Effective proxy host shown in UI: custom proxies use proxy_host,
    // shared-pool proxies use proxy_id (mirrored from getNextProxyAsync).
    const effectiveProxy =
      session.proxy_type === 'custom' ? session.proxy_host : session.proxy_id;

    return NextResponse.json({
      sessionId: session.id,
      platform: session.platform,
      state: session.state,
      proxy: {
        type: session.proxy_type ?? 'shared',
        host: effectiveProxy ?? null,
        lastAssigned: session.last_proxy_assigned ?? null,
      },
      health: {
        disconnectCount24h: disconnectCount,
        errorCount24h: errorCount,
        lastDisconnect: lastDisconnect
          ? { at: lastDisconnect.created_at, details: lastDisconnect.details ?? null }
          : null,
        lastPairingError: session.last_pairing_error ?? null,
      },
      recentEvents: events.slice(0, 10),
    });
  } catch (err) {
    console.error('[API] GET sessions/[id]/health error:', err);
    return NextResponse.json({ error: 'Failed to load session health' }, { status: 500 });
  }
}
