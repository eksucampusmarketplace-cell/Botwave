import { authorizeTelegramRequest } from '@/lib/telegram-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const broadcastSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(4096),
  pin: z.boolean().optional().default(false),
  silent: z.boolean().optional().default(false),
  initData: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = broadcastSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, text, pin, silent, initData } = validation.data;

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, botToken } = auth;

    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    // Get all groups where the bot is active
    const { data: configs } = await supabase
      .from('telegram_group_configs')
      .select('chat_id')
      .eq('session_id', sessionId);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: 'No active groups found' }, { status: 404 });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const config of configs) {
      try {
        const msgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.chat_id,
              text,
              parse_mode: 'HTML',
              disable_notification: silent,
            }),
          }
        );

        const msgData = await msgRes.json();

        if (msgData.ok) {
          sent++;
          if (pin) {
            await fetch(
              `https://api.telegram.org/bot${botToken}/pinChatMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: config.chat_id,
                  message_id: msgData.result.message_id,
                  disable_notification: silent,
                }),
              }
            ).catch(() => {});
          }
        } else {
          failed++;
          errors.push(`${config.chat_id}: ${msgData.description || 'Unknown'}`);
        }
      } catch (err) {
        failed++;
        errors.push(`${config.chat_id}: Network error`);
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      data: {
        sent,
        failed,
        total: configs.length,
        errors: errors.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('[BROADCAST] Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 });
  }
}
