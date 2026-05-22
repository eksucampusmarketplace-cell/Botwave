import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { logAdminAction, getClientIp } from '@/lib/admin-security';

export const dynamic = 'force-dynamic';

// Default: only purge ghosts older than 24h so we never racewith an in-flight pair.
const DEFAULT_MIN_AGE_HOURS = 24;
const GHOST_STATES = ['needs_reauth', 'pairing_failed'] as const;

interface GhostRow {
  id: string;
  session_name: string | null;
  phone_number: string | null;
  state: string;
  created_at: string | null;
}

/**
 * GET — preview which sessions would be deleted (no destructive action).
 * Returns the rows that match the ghost criteria so the dashboard can show
 * a count before the admin confirms.
 */
export async function GET(request: NextRequest) {
  const tokenValidation = await verifyAdminToken(request.cookies.get('admin_token')?.value);
  if (!tokenValidation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const minAgeHours = parseAgeHours(request.nextUrl.searchParams.get('minAgeHours'));
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('bot_sessions')
    .select('id, session_name, phone_number, state, created_at')
    .in('state', GHOST_STATES as unknown as string[])
    .is('last_active', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error previewing ghost sessions:', error);
    return NextResponse.json({ error: 'Failed to preview ghost sessions' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    minAgeHours,
    count: data?.length || 0,
    sessions: data || [],
  });
}

/**
 * POST — actually delete ghost sessions and their Evolution API instances.
 *
 * "Ghost" = bot_sessions row that:
 *   - is in needs_reauth or pairing_failed state
 *   - has last_active = NULL (never successfully connected even once)
 *   - is older than minAgeHours (default 24h)
 *
 * The auto-recovery loop deliberately skips these rows (it only retries
 * sessions that had a prior successful connection), so without manual GC
 * they sit in the admin dashboard forever, inflating the "Needs Reauth"
 * count and hiding genuine reconnect problems.
 *
 * Body (optional): { minAgeHours?: number }
 */
export async function POST(request: NextRequest) {
  const tokenValidation = await verifyAdminToken(request.cookies.get('admin_token')?.value);
  if (!tokenValidation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let minAgeHours = DEFAULT_MIN_AGE_HOURS;
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && body.minAgeHours !== undefined) {
      minAgeHours = parseAgeHours(String(body.minAgeHours));
    }
  } catch {
    // No body / invalid JSON — fall back to default.
  }

  const supabase = await createAdminClient();
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();

  const { data: ghosts, error: fetchError } = await supabase
    .from('bot_sessions')
    .select('id, session_name, phone_number, state, created_at')
    .in('state', GHOST_STATES as unknown as string[])
    .is('last_active', null)
    .lt('created_at', cutoff);

  if (fetchError) {
    console.error('Error fetching ghost sessions:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch ghost sessions' }, { status: 500 });
  }

  const ghostRows: GhostRow[] = ghosts || [];
  if (ghostRows.length === 0) {
    return NextResponse.json({ success: true, deleted: 0, evolutionDeleted: 0, sessions: [] });
  }

  // Best-effort: also delete the matching Evolution API instances so they
  // don't keep retrying in the background. Failures here are non-fatal —
  // the bot_sessions row is the source of truth.
  const evoUrl = process.env.EVOLUTION_API_URL;
  const evoKey = process.env.EVOLUTION_API_KEY;
  let evolutionDeleted = 0;
  if (evoUrl && evoKey) {
    await Promise.all(
      ghostRows.map(async row => {
        try {
          const res = await fetch(`${evoUrl}/instance/delete/${row.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', apikey: evoKey },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok || res.status === 404) evolutionDeleted += 1;
        } catch {
          // Non-critical
        }
      }),
    );
  }

  const ghostIds = ghostRows.map(r => r.id);
  const { error: deleteError } = await supabase
    .from('bot_sessions')
    .delete()
    .in('id', ghostIds);

  if (deleteError) {
    console.error('Error deleting ghost sessions:', deleteError);
    return NextResponse.json({ error: 'Failed to delete ghost sessions' }, { status: 500 });
  }

  const clientIp = getClientIp(request.headers);
  logAdminAction(
    tokenValidation.username,
    'ghost_sessions_cleanup',
    'bot_sessions',
    `Deleted ${ghostRows.length} ghost session(s) older than ${minAgeHours}h (evolutionDeleted=${evolutionDeleted})`,
    clientIp,
  );

  return NextResponse.json({
    success: true,
    deleted: ghostRows.length,
    evolutionDeleted,
    minAgeHours,
    sessions: ghostRows,
  });
}

function parseAgeHours(raw: string | null): number {
  if (!raw) return DEFAULT_MIN_AGE_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MIN_AGE_HOURS;
  // Cap at 30 days to avoid pathological values.
  return Math.min(n, 24 * 30);
}
