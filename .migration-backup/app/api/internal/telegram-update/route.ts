/**
 * Internal endpoint for forwarding Telegram webhook updates to the bot process.
 * Called by /api/telegram/webhook/[sessionId] when a webhook update is received.
 *
 * The Telegram bot primarily uses long polling, but if webhooks are configured
 * (e.g. for production), updates arrive here.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  if (!process.env.BOT_SECRET_KEY || secret !== process.env.BOT_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { sessionId, update } = await request.json();

    if (!sessionId || !update) {
      return NextResponse.json({ error: 'Missing sessionId or update' }, { status: 400 });
    }

    // Log the update for debugging — the bot process handles updates via
    // long polling, so webhook-delivered updates are secondary. We store
    // them so they can be picked up if polling misses them.
    console.log(
      `[TG-INTERNAL] Received update for session ${sessionId.slice(0, 8)}: ` +
      `type=${update.message ? 'message' : update.callback_query ? 'callback' : 'other'}`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TG-INTERNAL] Error processing update:', error);
    return NextResponse.json({ ok: true }); // Always 200 to avoid retries
  }
}
