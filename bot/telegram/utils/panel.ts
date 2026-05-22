/**
 * Helpers for building Mini App panel links.
 *
 * The Telegram WebApp can be opened in two ways from a bot:
 *
 *  - As a `web_app` keyboard button in a private chat — the URL carries
 *    `sessionId` and (optionally) `chatId` as normal query params.
 *  - As a `url` button in a group, pointing to a `t.me/<bot>/<short>?startapp=...`
 *    direct link. Telegram then opens the Mini App in the user's PM context
 *    and exposes the `startapp` value as `tg.initDataUnsafe.start_param`.
 *
 * For group admin panels we MUST pass the originating `chatId` through
 * `start_param` so the WebApp knows which group the user is managing.
 * Without it, the role-detection endpoint has no chatId and falls back to
 * iterating every registered group — which returns `user` whenever the
 * caller isn't admin in the first match, and the panel only shows the
 * tabs that are visible to plain users (Mod Log + XP).
 *
 * `start_param` allows `[A-Za-z0-9_-]` up to 64 chars. We use the format
 *   session_<uuid>_c_<encodedChatId>
 * where `encodedChatId` replaces the leading `-` of negative chat IDs
 * with `n` so the value stays within the allowed charset.
 */

const PANEL_PATH = '/miniapp/admin/index.html';
const PANEL_SHORT_NAME = 'panel';

function encodeChatId(chatId: number | string): string {
  return chatId.toString().replace(/^-/, 'n');
}

export function buildPanelUrl(
  miniappBaseUrl: string,
  sessionId: string,
  chatId?: number | string,
): string {
  const base = `${miniappBaseUrl}${PANEL_PATH}?sessionId=${sessionId}`;
  if (chatId === undefined || chatId === null || chatId === '') return base;
  return `${base}&chatId=${encodeURIComponent(chatId.toString())}`;
}

export function buildPanelStartParam(
  sessionId: string,
  chatId?: number | string,
): string {
  if (chatId === undefined || chatId === null || chatId === '') {
    return `session_${sessionId}`;
  }
  return `session_${sessionId}_c_${encodeChatId(chatId)}`;
}

export function buildPanelDeepLink(
  botUsername: string,
  sessionId: string,
  chatId?: number | string,
): string {
  const startParam = buildPanelStartParam(sessionId, chatId);
  return `https://t.me/${botUsername}/${PANEL_SHORT_NAME}?startapp=${startParam}`;
}

/**
 * Decide which keyboard button to attach for opening the panel.
 *
 *   - private chats   → web_app button with full panel URL
 *   - group/supergroup → url button to the direct-link Mini App
 *
 * Telegram disallows `web_app` button types in groups; sending one
 * silently fails. The direct link opens the Mini App in the user's
 * PM context while still carrying the originating chat via start_param.
 */
export function panelButtonForChatType(
  chatType: string,
  miniappBaseUrl: string,
  botUsername: string,
  sessionId: string,
  chatId?: number | string,
): { kind: 'web_app'; url: string } | { kind: 'url'; url: string } {
  if (chatType === 'private') {
    return { kind: 'web_app', url: buildPanelUrl(miniappBaseUrl, sessionId, chatId) };
  }
  return { kind: 'url', url: buildPanelDeepLink(botUsername, sessionId, chatId) };
}
