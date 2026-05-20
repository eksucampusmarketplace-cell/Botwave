/**
 * Email Bounce Webhook - receives bounce notifications from Postal.
 * POST /api/email/bounce
 *
 * Postal webhook payload:
 *   { event: "MessageBounced", payload: { message: { to, bounce: { code, message } } } }
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Postal webhook format
    const event = body.event || body.type || '';
    const payload = body.payload || body.data || body;
    const recipient = payload?.message?.to || payload?.recipient || payload?.email || '';

    if (!recipient) {
      return NextResponse.json({ error: 'No recipient in payload' }, { status: 400 });
    }

    const bounceCode = payload?.message?.bounce?.code || payload?.bounce_code || '';
    const bounceMsg = payload?.message?.bounce?.message || payload?.reason || '';

    // Determine bounce type: 5xx = hard bounce, 4xx = soft bounce
    const isHardBounce = bounceCode.toString().startsWith('5') ||
      event.toLowerCase().includes('hard') ||
      bounceMsg.toLowerCase().includes('does not exist') ||
      bounceMsg.toLowerCase().includes('unknown user');

    const supabase = getServiceClient();
    await supabase.from('email_bounces').insert({
      recipient: recipient.toLowerCase(),
      bounce_type: isHardBounce ? 'hard' : 'soft',
      reason: `${bounceCode} ${bounceMsg}`.trim() || 'Unknown',
      source: 'postal',
    });

    console.log(`[BOUNCE-WEBHOOK] ${isHardBounce ? 'Hard' : 'Soft'} bounce for ${recipient}: ${bounceCode} ${bounceMsg}`);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[BOUNCE-WEBHOOK] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
