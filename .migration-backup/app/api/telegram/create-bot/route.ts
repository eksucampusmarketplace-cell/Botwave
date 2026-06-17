import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createBotSchema = z.object({
  botName: z.string().min(1).max(64),
  botUsername: z.string()
    .min(5)
    .max(32)
    .regex(/bot$/i, 'Username must end with "bot"'),
  ownerTelegramId: z.string().min(1).regex(/^\d+$/, 'Must be a numeric Telegram user ID'),
});

const MAX_BOTS_PER_USER_PER_DAY = 20;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createBotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { botName, botUsername, ownerTelegramId } = validation.data;

    const mainToken = process.env.MAIN_TELEGRAM_BOT_TOKEN;
    if (!mainToken) {
      return NextResponse.json(
        { error: 'Bot Management Mode not configured. Set MAIN_TELEGRAM_BOT_TOKEN.' },
        { status: 503 }
      );
    }

    // Rate limit: max 3 bots per user per day
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await supabase
      .from('bot_creations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('requested_at', dayAgo);

    if ((count || 0) >= MAX_BOTS_PER_USER_PER_DAY) {
      return NextResponse.json(
        { error: `Rate limit: maximum ${MAX_BOTS_PER_USER_PER_DAY} bots per day` },
        { status: 429 }
      );
    }

    // Record the creation request
    const { data: creation, error: insertError } = await supabase
      .from('bot_creations')
      .insert({
        user_id: user.id,
        owner_telegram_id: ownerTelegramId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CREATE-BOT] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record bot creation request' }, { status: 500 });
    }

    // Call Telegram Bot API to create the bot via Bot Management Mode
    // Note: This requires Bot Management Mode enabled on @Botwave_telegrambot
    let newBotToken: string;
    let newBotUsername: string;

    try {
      const createRes = await fetch(
        `https://api.telegram.org/bot${mainToken}/createNewBot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: botName,
            username: botUsername,
          }),
        }
      );

      const createData = await createRes.json();

      if (!createData.ok) {
        await supabase
          .from('bot_creations')
          .update({ status: 'failed', error: createData.description || 'Unknown error' })
          .eq('id', creation.id);

        return NextResponse.json(
          { error: `Telegram API error: ${createData.description || 'Failed to create bot'}` },
          { status: 400 }
        );
      }

      newBotToken = createData.result.token;
      newBotUsername = createData.result.username || botUsername;
    } catch (apiError) {
      const errMsg = apiError instanceof Error ? apiError.message : 'Network error';
      await supabase
        .from('bot_creations')
        .update({ status: 'failed', error: errMsg })
        .eq('id', creation.id);

      // Alert the bot owner
      notifyOwnerOfError('Bot creation failed', errMsg);

      return NextResponse.json(
        { error: 'Failed to communicate with Telegram API' },
        { status: 502 }
      );
    }

    // Create a bot_sessions record for the new bot
    const { data: session, error: sessionError } = await supabase
      .from('bot_sessions')
      .insert({
        user_id: user.id,
        platform: 'telegram_bot',
        state: 'active',
        bot_token: newBotToken,
        bot_username: newBotUsername,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[CREATE-BOT] Session creation error:', sessionError);
    }

    // Update the creation record
    await supabase
      .from('bot_creations')
      .update({
        status: 'success',
        new_bot_token: newBotToken,
        new_bot_username: newBotUsername,
        session_id: session?.id || null,
      })
      .eq('id', creation.id);

    // Send DM from new bot to owner
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botwave.online';
      const sessionUrl = session ? `${appUrl}/dashboard/telegram/${session.id}` : appUrl;

      await fetch(`https://api.telegram.org/bot${newBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ownerTelegramId,
          text: `Your bot @${newBotUsername} is ready!\nConfigure it here: ${sessionUrl}`,
          parse_mode: 'HTML',
        }),
      });
    } catch (dmError) {
      console.warn('[CREATE-BOT] Failed to send DM to owner:', dmError);
    }

    return NextResponse.json({
      success: true,
      data: {
        botUsername: newBotUsername,
        sessionId: session?.id,
        message: `Bot @${newBotUsername} created successfully!`,
      },
    });
  } catch (error) {
    console.error('[CREATE-BOT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function notifyOwnerOfError(title: string, details: string): void {
  const ownerId = process.env.BOT_OWNER_TELEGRAM_ID;
  const mainToken = process.env.MAIN_TELEGRAM_BOT_TOKEN;
  if (!ownerId || !mainToken) return;

  fetch(`https://api.telegram.org/bot${mainToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ownerId,
      text: `[BotWave Alert] ${title}\n${details}`,
    }),
  }).catch(() => {});
}
