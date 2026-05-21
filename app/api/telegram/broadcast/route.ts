/**
 * Telegram Broadcast API
 *
 * POST /api/telegram/broadcast
 * Sends a message to all active groups for a bot session.
 * Body: { sessionId, message, mediaUrl? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sessionId, message, mediaUrl } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'sessionId and message are required' },
        { status: 400 },
      );
    }

    // Verify session belongs to user (owner only)
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('id, telegram_bot_token')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.telegram_bot_token) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    // Get all active groups
    const { data: groups } = await supabase
      .from('telegram_groups')
      .select('chat_id, chat_title')
      .eq('session_id', sessionId)
      .eq('is_active', true);

    if (!groups || groups.length === 0) {
      return NextResponse.json({ error: 'No active groups found' }, { status: 400 });
    }

    const results: { chatId: string; title: string; success: boolean; error?: string }[] = [];

    for (const group of groups) {
      try {
        const apiBase = `https://api.telegram.org/bot${session.telegram_bot_token}`;

        if (mediaUrl) {
          // Send photo with caption
          const res = await fetch(`${apiBase}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: group.chat_id,
              photo: mediaUrl,
              caption: message,
              parse_mode: 'HTML',
            }),
          });
          const data = await res.json();
          results.push({
            chatId: group.chat_id,
            title: group.chat_title || group.chat_id,
            success: data.ok,
            error: data.ok ? undefined : data.description,
          });
        } else {
          // Send text message
          const res = await fetch(`${apiBase}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: group.chat_id,
              text: message,
              parse_mode: 'HTML',
            }),
          });
          const data = await res.json();
          results.push({
            chatId: group.chat_id,
            title: group.chat_title || group.chat_id,
            success: data.ok,
            error: data.ok ? undefined : data.description,
          });
        }

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        results.push({
          chatId: group.chat_id,
          title: group.chat_title || group.chat_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        total: groups.length,
        sent,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error('[TG-BROADCAST] Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 });
  }
}
