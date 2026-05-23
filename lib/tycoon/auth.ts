/**
 * Tycoon initData verification.
 *
 * Unlike `lib/telegram-auth.ts` (which is scoped to a Botwave bot session
 * and resolves Telegram roles via `bot_sessions.telegram_bot_token`), the
 * tycoon game can be played outside any specific Botwave session — a
 * "platform-canonical" bot owned by us also runs the game (§21 cross-bot
 * platform). So this helper supports two modes:
 *
 *   1. Per-session: caller passes a `session_id`; we look up the
 *      bot token in `bot_sessions.telegram_bot_token`. Used when the
 *      mini app is launched from a Botwave-managed bot.
 *
 *   2. Platform-canonical: no `session_id`; we use the bot token from
 *      `TYCOON_BOT_TOKEN` env. Used when the mini app is launched from
 *      our own platform bot.
 *
 * On success returns the verified Telegram user. On failure returns
 * `{ ok: false, reason }` so the caller can shape a 4xx response.
 */

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type TycoonVerifiedUser = {
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  is_premium: boolean;
};

export type TycoonAuthOk = {
  ok: true;
  user: TycoonVerifiedUser;
  /** Resolved bot token used for verification (useful for downstream Bot API calls). */
  bot_token: string;
  /** Source of the bot token: session id or `'canonical'`. */
  source: { kind: 'session'; session_id: string } | { kind: 'canonical' };
};

export type TycoonAuthFail = {
  ok: false;
  status: number;
  reason: string;
};

export type TycoonAuthResult = TycoonAuthOk | TycoonAuthFail;

const INITDATA_MAX_AGE_SEC = 86_400; // 24h, matches the lib/telegram-auth.ts contract.

/**
 * Resolve which bot token to verify against. Returns the token plus a
 * tag describing where it came from, or a failure result.
 */
export async function resolveTycoonBotToken(
  supabase: SupabaseClient,
  sessionId: string | undefined | null,
): Promise<
  | { ok: true; token: string; source: TycoonAuthOk['source'] }
  | TycoonAuthFail
> {
  if (sessionId) {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('telegram_bot_token')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      return { ok: false, status: 500, reason: 'session lookup failed' };
    }
    if (!data?.telegram_bot_token) {
      return { ok: false, status: 404, reason: 'session has no bot token' };
    }
    return {
      ok: true,
      token: data.telegram_bot_token,
      source: { kind: 'session', session_id: sessionId },
    };
  }

  const canonical = process.env.TYCOON_BOT_TOKEN;
  if (!canonical) {
    return {
      ok: false,
      status: 500,
      reason: 'TYCOON_BOT_TOKEN not configured and no session_id provided',
    };
  }
  return { ok: true, token: canonical, source: { kind: 'canonical' } };
}

/**
 * Verify `initData` against a bot token using Telegram's documented
 * HMAC-SHA256 procedure. Returns the parsed user on success, or null on
 * any error (bad signature, stale auth_date, malformed user JSON).
 *
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number = INITDATA_MAX_AGE_SEC,
): TycoonVerifiedUser | null {
  if (!initData || !botToken) return null;
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

    // Constant-time compare to avoid timing attacks.
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(computed, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate) return null;
    if (Math.floor(Date.now() / 1000) - authDate > maxAgeSec) return null;

    const userJson = params.get('user');
    if (!userJson) return null;
    const u = JSON.parse(userJson) as {
      id?: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    if (!u?.id || typeof u.id !== 'number') return null;

    return {
      telegram_user_id: u.id,
      username: u.username || null,
      first_name: u.first_name || null,
      last_name: u.last_name || null,
      language_code: u.language_code || null,
      is_premium: Boolean(u.is_premium),
    };
  } catch {
    return null;
  }
}

/**
 * One-shot helper used by route handlers: resolve token, verify initData,
 * return either an authorized user or a fail-shaped result.
 */
export async function authorizeTycoonRequest(
  supabase: SupabaseClient,
  initData: string,
  sessionId?: string | null,
): Promise<TycoonAuthResult> {
  if (!initData) {
    return { ok: false, status: 400, reason: 'missing initData' };
  }

  const tokenResult = await resolveTycoonBotToken(supabase, sessionId);
  if (!tokenResult.ok) return tokenResult;

  const user = verifyInitData(initData, tokenResult.token);
  if (!user) {
    return { ok: false, status: 401, reason: 'invalid initData' };
  }

  return {
    ok: true,
    user,
    bot_token: tokenResult.token,
    source: tokenResult.source,
  };
}
