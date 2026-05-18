/**
 * Mini App Auth API
 *
 * POST /api/miniapp/auth
 * Verifies Telegram initData with HMAC-SHA256 and returns the user's role.
 * Body: { initData, sessionId, chatId }
 * Returns: { role: 'admin' | 'member', userId, firstName }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function verifyTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
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

    // Check auth_date is not too old (allow 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    const result: Record<string, string> = {};
    for (const [k, v] of entries) {
      result[k] = v;
    }
    result.hash = hash;
    return result;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData, sessionId, chatId } = body;

    if (!initData || !sessionId || !chatId) {
      return NextResponse.json(
        { error: 'initData, sessionId, and chatId are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get bot token for this session
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('bot_token')
      .eq('id', sessionId)
      .single();

    if (!session?.bot_token) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify initData
    const verified = verifyTelegramInitData(initData, session.bot_token);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    // Extract user info
    let telegramUser: { id: number; first_name?: string; username?: string } | null = null;
    try {
      telegramUser = JSON.parse(verified.user || '{}');
    } catch {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    if (!telegramUser?.id) {
      return NextResponse.json({ error: 'No user ID in initData' }, { status: 400 });
    }

    // Check if user is admin in the chat via Telegram Bot API
    let role: 'admin' | 'member' = 'member';
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${session.bot_token}/getChatMember?chat_id=${chatId}&user_id=${telegramUser.id}`,
      );
      const data = await res.json();
      if (data.ok) {
        const status = data.result?.status;
        if (status === 'administrator' || status === 'creator') {
          role = 'admin';
        }
      }
    } catch {
      // If API call fails, default to member
    }

    return NextResponse.json({
      success: true,
      role,
      userId: telegramUser.id,
      firstName: telegramUser.first_name || '',
      username: telegramUser.username || '',
    });
  } catch (error) {
    console.error('[MINIAPP-AUTH] Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
