/**
 * POST /api/tycoon/stars
 *
 * Telegram Stars purchase webhook (§24). This route is registered as the
 * Stars purchase callback for the tycoon bot's pre-checkout / successful-
 * payment flow.
 *
 * Validates `X-Tycoon-Stars-Signature: hmac-sha256(body, STARS_SECRET)`.
 * On successful_payment it validates the SKU, credits gems once, and writes
 * an immutable ledger entry keyed by telegram_payment_charge_id.
 *
 * Body shape (forwarded from the bot):
 *   {
 *     event: "pre_checkout_query" | "successful_payment",
 *     telegram_user_id: number,
 *     invoice_payload: string,        // our SKU id, e.g. "gem_pack_99"
 *     star_amount: number,            // stars charged
 *     telegram_payment_charge_id?: string,  // present on successful_payment
 *     provider_payment_charge_id?: string,
 *     raw: object                     // full TG update object for replay
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { GEM_SKUS } from '@/lib/tycoon/monetization';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_EVENTS = new Set(['pre_checkout_query', 'successful_payment']);

type Body = {
  event?: string;
  telegram_user_id?: number;
  invoice_payload?: string;
  star_amount?: number;
  telegram_payment_charge_id?: string;
  provider_payment_charge_id?: string;
  raw?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const secret = process.env.TYCOON_STARS_SECRET;
  if (!secret) {
    // Default-deny if not configured. Better than a free hatch into the
    // event log (could be used to spoof "successful payments" otherwise).
    return NextResponse.json({ error: 'stars_secret_not_configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const provided = req.headers.get('x-tycoon-stars-signature') || '';
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (
    !provided ||
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  let body: Body;
  try {
    body = JSON.parse(rawBody) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.event || !ALLOWED_EVENTS.has(body.event)) {
    return NextResponse.json({ error: 'bad_event' }, { status: 400 });
  }
  if (!Number.isFinite(body.telegram_user_id)) {
    return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const sku = GEM_SKUS[body.invoice_payload || ''];
  if (!sku) {
    return NextResponse.json({ error: 'unknown_sku' }, { status: 400 });
  }
  if (body.star_amount !== sku.stars) {
    return NextResponse.json({ error: 'bad_star_amount' }, { status: 400 });
  }

  const { data: playerRow, error: playerError } = await supabase
    .from('tycoon_players')
    .select('id, gems')
    .eq('telegram_user_id', body.telegram_user_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (playerError) {
    return NextResponse.json({ error: 'player_lookup_failed', detail: playerError.message }, { status: 500 });
  }
  if (!playerRow) {
    return NextResponse.json({ error: 'player_not_found' }, { status: 404 });
  }
  const player = playerRow as { id: string; gems: number };

  await supabase.from('tycoon_events').insert({
    player_id: player.id,
    kind: `stars_${body.event}`,
    payload: {
      telegram_user_id: body.telegram_user_id,
      invoice_payload: body.invoice_payload ?? null,
      star_amount: body.star_amount ?? null,
      telegram_payment_charge_id: body.telegram_payment_charge_id ?? null,
      provider_payment_charge_id: body.provider_payment_charge_id ?? null,
    },
  });

  if (body.event === 'pre_checkout_query') {
    return NextResponse.json({ ok: true, recorded: body.event, sku: sku.id });
  }

  const chargeId = (body.telegram_payment_charge_id || '').trim();
  if (!chargeId) {
    return NextResponse.json({ error: 'missing_charge_id' }, { status: 400 });
  }
  const idempotencyKey = `stars:${chargeId}`;
  const { error: ledgerError } = await supabase.from('tycoon_ledger').insert({
    player_id: player.id,
    kind: 'credit',
    amount: sku.gems,
    currency: 'gems',
    reason: 'telegram_stars_purchase',
    idempotency_key: idempotencyKey,
    metadata: {
      sku: sku.id,
      label: sku.label,
      stars: sku.stars,
      telegram_payment_charge_id: chargeId,
      provider_payment_charge_id: body.provider_payment_charge_id ?? null,
    },
  });
  if (ledgerError) {
    if (ledgerError.code === '23505') {
      return NextResponse.json({ ok: true, recorded: body.event, credited: false, duplicate: true });
    }
    return NextResponse.json({ error: 'ledger_insert_failed', detail: ledgerError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('tycoon_players')
    .update({ gems: Number(player.gems) + sku.gems })
    .eq('id', player.id);
  if (updateError) {
    return NextResponse.json({ error: 'gem_credit_failed', detail: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recorded: body.event, credited: true, gems: sku.gems });
}
