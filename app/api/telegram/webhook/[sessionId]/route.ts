/**
 * Telegram Bot Webhook Endpoint
 * 
 * Receives updates from Telegram for a specific bot session.
 * POST /api/telegram/webhook/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  try {
    // Verify the session exists and is a telegram_bot session
    if (!supabaseUrl || !supabaseKey) {
      console.error('[TG-WEBHOOK] Supabase not configured');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id, platform, state, telegram_bot_token')
      .eq('id', sessionId)
      .eq('platform', 'telegram_bot')
      .single();

    if (!session) {
      console.error(`[TG-WEBHOOK] Session not found: ${sessionId}`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'active') {
      return NextResponse.json({ ok: true, skipped: 'session_inactive' });
    }

    const update = await request.json();

    // Import and process through the Telegram bot router
    // The actual bot instance is managed by the bot process, not the Next.js API
    // Forward the update to the bot process via internal API
    const botUrl = process.env.SELF_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const internalSecret = process.env.BOT_SECRET_KEY;

    if (internalSecret) {
      try {
        await fetch(`${botUrl}/api/internal/telegram-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalSecret,
          },
          body: JSON.stringify({
            sessionId,
            update,
          }),
        });
      } catch (err) {
        console.error(`[TG-WEBHOOK] Failed to forward update to bot process:`, err);
      }
    }

    // Update last_active timestamp
    await supabase
      .from('bot_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[TG-WEBHOOK] Error processing update for ${sessionId}:`, error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint active',
  });
}
