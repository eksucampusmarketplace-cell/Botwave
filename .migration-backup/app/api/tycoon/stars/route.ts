/**
 * POST /api/tycoon/stars
 *
 * Telegram Stars purchase webhook (§24). This route is registered as the
 * Stars purchase callback for the tycoon bot's pre-checkout / successful-
 * payment flow.
 *
 * V1 scope:
 *  - **Logs every incoming Stars event** to `tycoon_events` so we have a
 *    ground-truth audit trail before we start crediting gems.
 *  - Validates `X-Tycoon-Stars-Signature: hmac-sha256(body, STARS_SECRET)`.
 *    Telegram itself doesn't sign Stars updates the same way as Bot API
 *    webhooks, so this header is set by the upstream bot proxy that
 *    forwards `pre_checkout_query` / `successful_payment` events to us.
 *  - **Does NOT yet credit gems** to the player. Crediting requires the
 *    full SKU table + ledger + idempotency-on-`telegram_payment_charge_id`,
 *    which lands in PR-D2 alongside the SKU definitions.
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

  // pre_checkout_query: answer true (V1 always-accept). We do the answer
  // upstream in the bot; here we just log.
  // successful_payment: log + (PR-D2: credit + write ledger).
  await supabase.from('tycoon_events').insert({
    player_id: null, // filled in PR-D2 once we look up by telegram_user_id
    kind: `stars_${body.event}`,
    payload: {
      telegram_user_id: body.telegram_user_id,
      invoice_payload: body.invoice_payload ?? null,
      star_amount: body.star_amount ?? null,
      telegram_payment_charge_id: body.telegram_payment_charge_id ?? null,
      provider_payment_charge_id: body.provider_payment_charge_id ?? null,
    },
  });

  return NextResponse.json({ ok: true, recorded: body.event });
}
