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
 *      resolves their role against session ownership/sudo bindings and
 *      `getChatMember` for chat-scoped requests.
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

// Note: this file is server-only dead code retained from the Next.js migration.
// It is not imported by any Vite/React component.
import { createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiCacheGet, apiCacheSet } from '@/lib/redisApiCache';
import crypto from 'crypto';

export type TelegramRole = 'owner' | 'admin' | 'user' | 'none';

/**
 * Cached role lookup result. Keyed by {sessionId, telegramUserId, chatId}.
 * Short TTL because admin status can change at any moment in Telegram.
 */
const ROLE_CACHE_TTL_SECONDS = 60;

function roleCacheKey(sessionId: string, telegramUserId: string, chatId: string | null | undefined): string {
  return `tg-role:${sessionId}:${telegramUserId}:${chatId || 'any'}`;
}

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

const ROLE_RANK: Record<TelegramRole, number> = { owner: 2, admin: 1, user: 0, none: -1 };

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

/**
 * Resolve a Telegram caller's role for the bot session.
 *
 * Behavior:
 * - If `chatId` is provided, role resolution is strictly chat-scoped via
 *   Telegram `getChatMember` for THAT chat only.
 * - If `chatId` is omitted, only explicit session-level bindings are used
 *   (`owner_user_id` and `telegram_sudo_users`). We do not scan every group
 *   to compute a highest role across the session.
 *
 * Results are cached in Redis for {@link ROLE_CACHE_TTL_SECONDS} to keep the
 * Telegram `getChatMember` call out of every API request. Cache key includes
 * `chatId` so different chats are cached independently.
 */
async function resolveTelegramRole(
  supabase: SupabaseClient,
  sessionId: string,
  telegramUserId: string,
  botToken: string | null,
  chatId?: string | null,
): Promise<TelegramRole> {
  // Cache lookup.
  const cacheKey = roleCacheKey(sessionId, telegramUserId, chatId);
  const cached = await apiCacheGet<TelegramRole>(cacheKey);
  if (cached) return cached;

  const role = await resolveTelegramRoleUncached(
    supabase,
    sessionId,
    telegramUserId,
    botToken,
    chatId,
  );

  await apiCacheSet(cacheKey, role, ROLE_CACHE_TTL_SECONDS);
  return role;
}

async function resolveTelegramRoleUncached(
  supabase: SupabaseClient,
  sessionId: string,
  telegramUserId: string,
  botToken: string | null,
  chatId?: string | null,
): Promise<TelegramRole> {
  if (chatId) {
    if (!botToken) return 'none';

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramUserId)}`,
      );
      const j = await res.json();
      if (!j.ok) return 'none';

      const status = String(j.result?.status || '').toLowerCase();
      if (status === 'creator' || status === 'administrator') return 'admin';
      if (status === 'member' || status === 'restricted') return 'user';
      return 'none';
    } catch {
      return 'none';
    }
  }

  const { data: config } = await supabase
    .from('telegram_bot_configs')
    .select('owner_user_id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (config?.owner_user_id && config.owner_user_id === telegramUserId) {
    return 'owner';
  }

  const { data: sudo } = await supabase
    .from('telegram_sudo_users')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', telegramUserId)
    .maybeSingle();
  if (sudo) return 'admin';

  return 'user';
}

export type AuthorizeOpts = {
  sessionId: string | null | undefined;
  /**
   * Telegram chat id this request mutates / reads. When supplied, the caller
   * is authorized AGAINST THAT CHAT only — they cannot claim admin via
   * membership in some other group on the same bot session.
   */
  chatId?: string | null;
  /** Require chatId to be present. Useful for strictly group-scoped endpoints. */
  requireChatId?: boolean;
  /** Minimum role required for the endpoint. Defaults to 'admin'. */
  requireRole?: TelegramRole;
  /**
   * Which auth sources are accepted:
   * - any: initData first, then cookie fallback (default)
   * - cookie: dashboard cookie auth only
   * - initData: Telegram initData only
   */
  source?: 'any' | 'cookie' | 'initData';
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
  {
    sessionId,
    chatId,
    requireChatId = false,
    requireRole = 'admin',
    source = 'any',
  }: AuthorizeOpts,
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

  const normalizedChatId = chatId ? String(chatId) : null;
  if (requireChatId && !normalizedChatId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'chatId is required' },
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

  if (source !== 'cookie') {
    const initData = extractInitData(request, bodyInitData);
    if (initData && botToken) {
      const verified = verifyTelegramInitData(initData, botToken);
      if (verified) {
        const role = await resolveTelegramRole(
          admin,
          sessionId,
          verified.id,
          botToken,
          normalizedChatId,
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
  }

  if (source !== 'initData') {
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
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    ),
  };
}
