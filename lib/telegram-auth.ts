/**
 * Telegram Mini App + Dashboard request authorization.
 *
 * Telegram WebView requests arrive without the dashboard's Supabase auth
 * cookies (the WebView is an isolated browser context), so every read/write
 * to an RLS-protected table runs as the `anon` role and returns 0 rows /
 * 401-equivalent. That's why `Failed to save feature config` happens when
 * an owner opens the admin mini app and tries to flip a toggle, even though
 * the same operation works from the dashboard tab.
 *
 * `authorizeTelegramRequest` is the single source of truth for the Telegram
 * API surface. It supports BOTH auth paths:
 *
 *   1. Telegram WebView — verifies `initData` via HMAC-SHA256 over the bot
 *      token (24h freshness window), extracts the real Telegram user id, and
 *      resolves their role against `telegram_bot_configs.owner_user_id`,
 *      `telegram_sudo_users`, and `getChatMember` for active groups.
 *
 *   2. Dashboard / same-origin browser — falls back to the cookie-bound
 *      Supabase client (`auth.getUser()`) and matches against the session's
 *      `bot_sessions.user_id` owner.
 *
 * The returned `supabase` is the service-role admin client because the
 * caller has been verified by this helper, so the route can safely bypass
 * RLS for the rest of its work. No new privilege is granted to callers;
 * routes are responsible for scoping every query to `session_id`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export type TelegramRole = 'owner' | 'admin' | 'user';

export type TelegramAuthOk = {
  ok: true;
  /** Internal Supabase auth user id of the session owner (UUID). */
  ownerUserId: string;
  /** Telegram user id of the verified Telegram caller, or null when authed via cookie. */
  telegramUserId: string | null;
  /** Role of the caller for this session. */
  role: TelegramRole;
  /** Service-role Supabase client. RLS bypassed — caller is already verified. */
  supabase: SupabaseClient;
  /** Where the auth came from. */
  source: 'initData' | 'cookie';
  /** Bot token for the session, if any (cached so callers don't re-query). */
  botToken: string | null;
};

export type TelegramAuthFail = {
  ok: false;
  response: NextResponse;
};

const ROLE_RANK: Record<TelegramRole, number> = { owner: 2, admin: 1, user: 0 };

function roleAllows(actual: TelegramRole, required: TelegramRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/**
 * Verify a Telegram WebApp `initData` string with HMAC-SHA256 over the bot
 * token, and extract the verified Telegram user id.
 *
 * Returns null if the signature is invalid, the auth_date is older than 24h,
 * or the payload is malformed.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): { id: string; firstName?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = Array.from(params.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    if (computed !== hash) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 86400) return null;

    const userJson = params.get('user');
    if (!userJson) return null;
    const u = JSON.parse(userJson);
    if (!u?.id) return null;
    return { id: u.id.toString(), firstName: u.first_name };
  } catch {
    return null;
  }
}

async function resolveTelegramRole(
  supabase: SupabaseClient,
  sessionId: string,
  telegramUserId: string,
  botToken: string | null,
): Promise<TelegramRole> {
  // 1. Explicit owner via telegram_bot_configs.owner_user_id.
  const { data: config } = await supabase
    .from('telegram_bot_configs')
    .select('owner_user_id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (config?.owner_user_id && config.owner_user_id === telegramUserId) {
    return 'owner';
  }

  // 2. Sudo list.
  const { data: sudo } = await supabase
    .from('telegram_sudo_users')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', telegramUserId)
    .maybeSingle();
  if (sudo) return 'admin';

  // 3. Telegram-side group admin / creator status.
  if (botToken) {
    const { data: groups } = await supabase
      .from('telegram_groups')
      .select('chat_id')
      .eq('session_id', sessionId)
      .eq('is_active', true);
    for (const g of groups || []) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${g.chat_id}&user_id=${telegramUserId}`,
        );
        const j = await res.json();
        if (j.ok) {
          if (j.result?.status === 'creator') return 'owner';
          if (j.result?.status === 'administrator') return 'admin';
        }
      } catch {
        // ignore individual group failures
      }
    }
  }

  return 'user';
}

export type AuthorizeOpts = {
  sessionId: string | null | undefined;
  /** Minimum role required for the endpoint. Defaults to 'admin'. */
  requireRole?: TelegramRole;
};

/**
 * Try to read `initData` from common transport locations without consuming
 * the request body (which the route handler may still need to parse).
 */
function extractInitData(request: NextRequest, bodyInitData?: string | null): string | null {
  if (bodyInitData) return bodyInitData;
  try {
    const fromQuery = new URL(request.url).searchParams.get('initData');
    if (fromQuery) return fromQuery;
  } catch {
    // ignore url parse issues
  }
  const fromHeader = request.headers.get('x-telegram-init-data');
  if (fromHeader) return fromHeader;
  return null;
}

/**
 * Main authorization helper. Use at the top of any Telegram API route.
 *
 * Example:
 * ```ts
 * const auth = await authorizeTelegramRequest(request, { sessionId, requireRole: 'admin' });
 * if (!auth.ok) return auth.response;
 * const { supabase } = auth;
 * // ...do RLS-bypassed work scoped to sessionId
 * ```
 *
 * Pass `bodyInitData` when the request body already contains an `initData`
 * field — POST/PUT routes typically parse their body before calling this
 * helper.
 */
export async function authorizeTelegramRequest(
  request: NextRequest,
  { sessionId, requireRole = 'admin' }: AuthorizeOpts,
  bodyInitData?: string | null,
): Promise<TelegramAuthOk | TelegramAuthFail> {
  if (!sessionId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 },
      ),
    };
  }

  const admin = await createAdminClient();

  const { data: sessionRow } = await admin
    .from('bot_sessions')
    .select('user_id, telegram_bot_token')
    .eq('id', sessionId)
    .maybeSingle();
  if (!sessionRow) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      ),
    };
  }
  const botToken = sessionRow.telegram_bot_token ?? null;

  // 1. Try Telegram initData first.
  const initData = extractInitData(request, bodyInitData);
  if (initData && botToken) {
    const verified = verifyTelegramInitData(initData, botToken);
    if (verified) {
      const role = await resolveTelegramRole(
        admin,
        sessionId,
        verified.id,
        botToken,
      );
      if (!roleAllows(role, requireRole)) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Forbidden', role },
            { status: 403 },
          ),
        };
      }
      return {
        ok: true,
        ownerUserId: sessionRow.user_id,
        telegramUserId: verified.id,
        role,
        supabase: admin,
        source: 'initData',
        botToken,
      };
    }
  }

  // 2. Fall back to dashboard cookie auth.
  const cookieClient = await createClient();
  const { data: { user } } = await cookieClient.auth.getUser();
  if (user && user.id === sessionRow.user_id) {
    return {
      ok: true,
      ownerUserId: sessionRow.user_id,
      telegramUserId: null,
      role: 'owner',
      supabase: admin,
      source: 'cookie',
      botToken,
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    ),
  };
}
