import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Verify session ownership and get bot token
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id, bot_token')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.bot_token) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
    const webhookUrl = `${appUrl}/api/telegram/webhook/${sessionId}`;

    // Set webhook via Telegram Bot API
    const res = await fetch(
      `https://api.telegram.org/bot${session.bot_token}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: `Telegram API error: ${data.description || 'Unknown'}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl,
        message: 'Webhook set successfully',
      },
    });
  } catch (error) {
    console.error('[WEBHOOK-SETUP] Error:', error);
    return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 });
  }
}
