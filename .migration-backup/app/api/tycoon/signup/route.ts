/**
 * POST /api/tycoon/signup
 *
 * Coming-soon lander signup capture (§33.2 Day 3-7). Inserts a row into
 * `tycoon_signups` after light validation. Idempotent on (telegram_username
 * OR email) — duplicates are upserted, not 4xx'd, so the user gets a
 * success state either way ("you're already on the list").
 *
 * Body:
 *   - telegram_username?: string  ("@foo", "foo", "https://t.me/foo")
 *   - email?: string
 *   - theme_variant?: string      (defaults to "cosa-nostra")
 *   - source?: string             ("botwave-dm" | "partner-bot:<name>" | ...)
 *   - meta?: object               (utm_*, referrer, etc.)
 *
 * At least one of telegram_username / email is required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Telegram usernames: 5-32 chars, alnum + underscore, no leading/trailing _.
// We accept the bare handle, an @-prefixed handle, or a t.me URL and
// normalize to the bare lowercase handle.
const TG_USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

function normalizeTelegramUsername(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip URL prefixes.
  s = s.replace(/^https?:\/\/(t\.me|telegram\.me|telegram\.dog)\//i, '');
  s = s.replace(/^@+/, '');
  s = s.replace(/\/.*$/, '');
  s = s.toLowerCase();
  return TG_USERNAME_RE.test(s) ? s : null;
}

// Permissive enough for real-world addresses; the only structural rule is
// "one @ with non-empty local and host parts, host contains a dot".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return s && EMAIL_RE.test(s) ? s : null;
}

const ALLOWED_THEME_VARIANTS = new Set(['cosa-nostra', 'neutral', 'hustle-city']);

function clientIpPrefix(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = (fwd.split(',')[0] || '').trim() || req.headers.get('x-real-ip') || '';
  if (!ip) return null;
  // IPv4 → /24 ; IPv6 → /48
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  const parts = ip.split(':').filter(Boolean);
  if (parts.length < 3) return null;
  return `${parts.slice(0, 3).join(':')}::/48`;
}

type SignupBody = {
  telegram_username?: string;
  email?: string;
  theme_variant?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = normalizeTelegramUsername(body.telegram_username);
  const email = normalizeEmail(body.email);

  if (!username && !email) {
    return NextResponse.json(
      { error: 'telegram_username_or_email_required' },
      { status: 400 },
    );
  }

  const theme = body.theme_variant && ALLOWED_THEME_VARIANTS.has(body.theme_variant)
    ? body.theme_variant
    : 'cosa-nostra';

  const source = (body.source || '').trim().slice(0, 64) || null;
  const meta = (body.meta && typeof body.meta === 'object' ? body.meta : {}) as Record<string, unknown>;

  const supabase = await createAdminClient();

  // Try insert first; if a unique-conflict, find-and-return the existing row.
  const row = {
    telegram_username: username,
    email,
    theme_variant: theme,
    source,
    meta,
    ip_prefix: clientIpPrefix(req),
    user_agent: req.headers.get('user-agent')?.slice(0, 256) || null,
  };

  const insert = await supabase
    .from('tycoon_signups')
    .insert(row)
    .select('id, created_at')
    .single();

  if (!insert.error && insert.data) {
    await logLanderEvent(supabase, {
      kind: 'signup',
      theme_variant: theme,
      source,
      meta,
    });
    return NextResponse.json(
      { ok: true, deduped: false, id: (insert.data as { id: string }).id },
      { status: 201 },
    );
  }

  // Treat unique-violation as a successful re-signup.
  const isDup = insert.error?.code === '23505';
  if (!isDup) {
    return NextResponse.json(
      { error: 'signup_failed', detail: insert.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  // Locate the existing row by whichever identifier matched.
  let existingId: string | null = null;
  if (username) {
    const { data } = await supabase
      .from('tycoon_signups')
      .select('id')
      .ilike('telegram_username', username)
      .maybeSingle();
    existingId = (data as { id: string } | null)?.id ?? null;
  }
  if (!existingId && email) {
    const { data } = await supabase
      .from('tycoon_signups')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    existingId = (data as { id: string } | null)?.id ?? null;
  }

  return NextResponse.json(
    { ok: true, deduped: true, id: existingId },
    { status: 200 },
  );
}

async function logLanderEvent(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  evt: {
    kind: 'view' | 'signup' | 'dismiss';
    theme_variant: string | null;
    source: string | null;
    meta: Record<string, unknown>;
    client_id?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from('tycoon_lander_events').insert({
      kind: evt.kind,
      theme_variant: evt.theme_variant,
      source: evt.source,
      client_id: evt.client_id ?? null,
      meta: evt.meta,
    });
  } catch {
    // Analytics is best-effort; never fail the signup because of it.
  }
}
