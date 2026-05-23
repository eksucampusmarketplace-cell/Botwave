/**
 * POST /api/tycoon/event
 *
 * Lightweight beacon for lander analytics (§33.4 G0 metrics — tap-through
 * rate, signup rate, theme A/B). Accepts only the limited event vocabulary
 * we care about; everything else is dropped silently so this can't be
 * abused for arbitrary metric injection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_KINDS = new Set(['view', 'signup', 'dismiss']);
const ALLOWED_THEMES = new Set(['cosa-nostra', 'neutral', 'hustle-city']);

type EventBody = {
  kind?: string;
  theme_variant?: string;
  source?: string;
  client_id?: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  let body: EventBody;
  try {
    body = (await req.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const kind = body.kind && ALLOWED_KINDS.has(body.kind) ? body.kind : null;
  if (!kind) return NextResponse.json({ error: 'bad_kind' }, { status: 400 });

  const theme = body.theme_variant && ALLOWED_THEMES.has(body.theme_variant)
    ? body.theme_variant
    : null;

  const supabase = await createAdminClient();
  try {
    await supabase.from('tycoon_lander_events').insert({
      kind,
      theme_variant: theme,
      source: (body.source || '').trim().slice(0, 64) || null,
      client_id: (body.client_id || '').trim().slice(0, 64) || null,
      meta: (body.meta && typeof body.meta === 'object' ? body.meta : {}) as Record<string, unknown>,
    });
  } catch {
    // Best-effort; never break the page on a missed event.
  }
  return NextResponse.json({ ok: true });
}
