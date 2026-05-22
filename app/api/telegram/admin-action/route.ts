/**
 * Telegram Admin Action API
 * 
 * POST /api/telegram/admin-action
 * { sessionId, chatId, targetUserId, action, reason?, duration? }
 * 
 * Quick mod actions from the Mini App / Dashboard.
 * Actions: ban, unban, mute, unmute, warn, clearwarns, kick
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeTelegramRequest } from '@/lib/telegram-auth';

export const dynamic = 'force-dynamic';

const VALID_ACTIONS = new Set(['ban', 'unban', 'mute', 'unmute', 'warn', 'clearwarns', 'kick']);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chatId, targetUserId, action, reason, duration, initData } = await request.json();

    if (!sessionId || !chatId || !targetUserId || !action) {
      return NextResponse.json(
        { error: 'sessionId, chatId, targetUserId, and action are required' },
        { status: 400 },
      );
    }

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(', ')}` },
        { status: 400 },
      );
    }

    const auth = await authorizeTelegramRequest(
      request,
      { sessionId, requireRole: 'admin' },
      initData,
    );
    if (!auth.ok) return auth.response;
    const { supabase, botToken: sessionBotToken, telegramUserId } = auth;

    const botToken = sessionBotToken;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    const numChatId = Number(chatId);
    const numUserId = Number(targetUserId);
    const tgApiBase = `https://api.telegram.org/bot${botToken}`;

    let result: string;

    switch (action) {
      case 'ban':
        await tgApiFetch(tgApiBase, 'banChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
        });
        result = `User ${targetUserId} banned`;
        break;

      case 'unban':
        await tgApiFetch(tgApiBase, 'unbanChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
          only_if_banned: true,
        });
        result = `User ${targetUserId} unbanned`;
        break;

      case 'mute': {
        const until = duration
          ? Math.floor(Date.now() / 1000) + (duration * 60)
          : Math.floor(Date.now() / 1000) + (60 * 60);
        await tgApiFetch(tgApiBase, 'restrictChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
          permissions: { can_send_messages: false },
          until_date: until,
        });
        result = `User ${targetUserId} muted for ${duration || 60} minutes`;
        break;
      }

      case 'unmute':
        await tgApiFetch(tgApiBase, 'restrictChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
          permissions: {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          },
        });
        result = `User ${targetUserId} unmuted`;
        break;

      case 'warn':
        // Add warning to DB
        await supabase
          .from('telegram_warnings')
          .insert({
            session_id: sessionId,
            chat_id: chatId.toString(),
            user_id: targetUserId.toString(),
            warned_by: telegramUserId || auth.ownerUserId,
            reason: reason || 'Admin action from dashboard',
          });
        result = `User ${targetUserId} warned`;
        break;

      case 'clearwarns':
        await supabase
          .from('telegram_warnings')
          .delete()
          .eq('session_id', sessionId)
          .eq('chat_id', chatId.toString())
          .eq('user_id', targetUserId.toString());
        result = `Warnings cleared for user ${targetUserId}`;
        break;

      case 'kick':
        await tgApiFetch(tgApiBase, 'banChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
        });
        // Immediately unban so they can rejoin
        await tgApiFetch(tgApiBase, 'unbanChatMember', {
          chat_id: numChatId,
          user_id: numUserId,
          only_if_banned: true,
        });
        result = `User ${targetUserId} kicked`;
        break;

      default:
        result = 'Unknown action';
    }

    // Log moderation action. Column names match the actual schema of
    // telegram_moderation_log (target_user_id / moderator_user_id, with
    // free-form metadata in `details`). Earlier code referenced a
    // nonexistent `telegram_modlog` table with `target_id` / `admin_id`
    // columns, so every dashboard-initiated mod action was silently
    // failing to log.
    await supabase
      .from('telegram_moderation_log')
      .insert({
        session_id: sessionId,
        chat_id: chatId.toString(),
        action,
        target_user_id: targetUserId.toString(),
        moderator_user_id: telegramUserId || auth.ownerUserId,
        reason: reason || `${action} via dashboard`,
        details: {
          admin_name: auth.source === 'initData' ? 'Mini App' : 'Dashboard',
          source: auth.source,
        },
      })
      .then(() => {});

    return NextResponse.json({ success: true, message: result });
  } catch (error) {
    console.error('[ADMIN-ACTION] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function tgApiFetch(base: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.description || `Telegram API error: ${res.status}`);
  }

  return res.json();
}
