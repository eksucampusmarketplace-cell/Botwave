/**
 * User Role API for Telegram Mini App
 *
 * GET /api/telegram/user-role?sessionId=X[&chatId=Y][&initData=...][&userId=...]
 *
 * Returns a chat-scoped role for the current Telegram caller:
 *  - owner (only when owner_user_id matches and chat scope allows admin)
 *  - admin
 *  - user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyTelegramInitData } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

type MiniAppRole = 'owner' | 'admin' | 'user';

async function resolveRoleInChat(
  botToken: string,
  chatId: string,
  telegramUserId: string,
): Promise<MiniAppRole> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramUserId)}`,
    );
    const data = await res.json();
    if (!data?.ok) return 'user';

    const status = String(data.result?.status || '').toLowerCase();
    if (status === 'creator' || status === 'administrator') return 'admin';
    if (status === 'member' || status === 'restricted') return 'user';
    return 'user';
  } catch {
    return 'user';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const chatId = searchParams.get('chatId');
    const initData =
      searchParams.get('initData') ||
      request.headers.get('x-telegram-init-data');
    const providedUserId = searchParams.get('userId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: sessionRow } = await supabase
      .from('bot_sessions')
      .select('telegram_bot_token')
      .eq('id', sessionId)
      .maybeSingle();

    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const botToken = sessionRow.telegram_bot_token;
    if (!initData || !botToken) {
      return NextResponse.json({ success: true, role: 'user' });
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    if (providedUserId && providedUserId !== verified.id) {
      return NextResponse.json({ error: 'userId mismatch' }, { status: 403 });
    }

    const telegramUserId = verified.id;

    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select('owner_user_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    const isOwner =
      !!config?.owner_user_id &&
      String(config.owner_user_id) === telegramUserId;

    if (chatId) {
      const roleInChat = await resolveRoleInChat(botToken, chatId, telegramUserId);
      if (isOwner && roleInChat === 'admin') {
        return NextResponse.json({ success: true, role: 'owner' });
      }
      return NextResponse.json({ success: true, role: roleInChat });
    }

    if (isOwner) {
      return NextResponse.json({ success: true, role: 'owner' });
    }

    const { data: sudo } = await supabase
      .from('telegram_sudo_users')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', telegramUserId)
      .maybeSingle();

    if (sudo) {
      return NextResponse.json({ success: true, role: 'admin' });
    }

    return NextResponse.json({ success: true, role: 'user' });
  } catch (error) {
    console.error('[USER-ROLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to determine user role' },
      { status: 500 },
    );
  }
}
