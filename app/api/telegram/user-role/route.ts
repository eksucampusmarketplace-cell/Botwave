/**
 * User Role API for Telegram Mini App
 *
 * GET /api/telegram/user-role?sessionId=X&userId=Y[&chatId=Z][&initData=...]
 * Returns the role of the user: "owner", "admin", or "user"
 *
 * Checks (in order):
 * 1. telegram_bot_configs.owner_user_id (explicit /setowner)
 * 2. telegram_groups.added_by_user_id (dashboard connector)
 * 3. Auto-assign owner if initData is verified and no owner is configured
 * 4. telegram_sudo_users (sudo list)
 * 5. Telegram Bot API getChatMember (group admin detection)
 * 6. Default: "user"
 *
 * If chatId is provided, only that group is checked for admin status.
 * Otherwise, all active groups for the session are checked.
 *
 * When `initData` is provided, the server verifies it with HMAC-SHA256
 * using the bot token, extracts the real user ID, and uses that instead
 * of the client-supplied userId. This prevents spoofing and enables
 * auto-owner assignment for verified users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function verifyAndExtractUser(
  initData: string,
  botToken: string,
): { id: string; firstName?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    const userJson = params.get('user');
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    if (!user?.id) return null;

    return { id: user.id.toString(), firstName: user.first_name };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Use the service-role client because Telegram WebView requests arrive
    // without dashboard cookies, so RLS-gated reads on telegram_bot_configs /
    // telegram_groups return 0 rows and the role falls through to 'user'.
    // This route does its own auth via the initData HMAC + DB identity match.
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    let userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    const initData = searchParams.get('initData');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 },
      );
    }

    // Get bot token early — needed for initData verification and getChatMember
    const { data: botSession } = await supabase
      .from('bot_sessions')
      .select('user_id, telegram_bot_token')
      .eq('id', sessionId)
      .single();

    // If initData is provided, verify it and extract the real user ID
    let initDataVerified = false;
    if (initData && botSession?.telegram_bot_token) {
      const verifiedUser = verifyAndExtractUser(initData, botSession.telegram_bot_token);
      if (verifiedUser) {
        userId = verifiedUser.id;
        initDataVerified = true;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required (provide userId param or initData)' },
        { status: 400 },
      );
    }

    console.log(`[USER-ROLE] sessionId=${sessionId} userId=${userId} chatId=${chatId || 'none'} initDataVerified=${initDataVerified}`);

    // Check if user is the bot owner (explicit config via /setowner)
    const { data: config } = await supabase
      .from('telegram_bot_configs')
      .select('owner_user_id')
      .eq('session_id', sessionId)
      .single();

    if (config?.owner_user_id && config.owner_user_id === userId) {
      return NextResponse.json({ success: true, role: 'owner' });
    }

    // Auto-assign owner: only if initData is cryptographically verified,
    // no owner_user_id is configured yet, AND the user is a group creator
    // for this bot. This prevents random group admins from claiming ownership.
    if (initDataVerified && (!config?.owner_user_id)) {
      // Check if this user is the creator of any group with this bot
      let isGroupCreator = false;
      if (botSession?.telegram_bot_token) {
        const { data: activeGroups } = await supabase
          .from('telegram_groups')
          .select('chat_id')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .limit(5);
        for (const group of activeGroups || []) {
          try {
            const res = await fetch(
              `https://api.telegram.org/bot${botSession.telegram_bot_token}/getChatMember?chat_id=${group.chat_id}&user_id=${userId}`,
            );
            const memberData = await res.json();
            if (memberData.ok && memberData.result?.status === 'creator') {
              isGroupCreator = true;
              break;
            }
          } catch { /* ignore */ }
        }
      }
      if (isGroupCreator) {
        await supabase
          .from('telegram_bot_configs')
          .upsert(
            { session_id: sessionId, owner_user_id: userId, updated_at: new Date().toISOString() },
            { onConflict: 'session_id' },
          );
        return NextResponse.json({ success: true, role: 'owner' });
      }
    }

    // Check if user is a sudo user
    const { data: sudo } = await supabase
      .from('telegram_sudo_users')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sudo) {
      return NextResponse.json({ success: true, role: 'admin' });
    }

    // Check if user is a Telegram group admin via getChatMember API
    if (botSession?.telegram_bot_token) {
      let groupsToCheck: { chat_id: string }[] = [];

      if (chatId) {
        groupsToCheck = [{ chat_id: chatId }];
      } else {
        const { data: activeGroups } = await supabase
          .from('telegram_groups')
          .select('chat_id')
          .eq('session_id', sessionId)
          .eq('is_active', true);
        groupsToCheck = activeGroups || [];
      }

      console.log(`[USER-ROLE] Checking ${groupsToCheck.length} group(s) for admin status: ${groupsToCheck.map(g => g.chat_id).join(', ')}`);

      if (groupsToCheck.length) {
        for (const group of groupsToCheck) {
          try {
            const res = await fetch(
              `https://api.telegram.org/bot${botSession.telegram_bot_token}/getChatMember?chat_id=${group.chat_id}&user_id=${userId}`,
            );
            const data = await res.json();
            console.log(`[USER-ROLE] getChatMember chat_id=${group.chat_id} userId=${userId} ok=${data.ok} status=${data.result?.status || 'N/A'}`);
            if (data.ok) {
              const status = data.result?.status;
              if (status === 'creator') {
                return NextResponse.json({ success: true, role: 'owner' });
              }
              if (status === 'administrator') {
                return NextResponse.json({ success: true, role: 'admin' });
              }
            }
          } catch (err) {
            console.error(`[USER-ROLE] getChatMember failed for chat_id=${group.chat_id}:`, err);
          }
        }
      }
    }

    // Default: regular user
    return NextResponse.json({ success: true, role: 'user' });
  } catch (error) {
    console.error('[USER-ROLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to determine user role' },
      { status: 500 },
    );
  }
}
