/**
 * Auto-Forward Feature for Telegram Userbot
 * 
 * Automatically forwards messages matching keyword rules from source to destination chats.
 * Enforces rate limits to prevent account bans.
 */

import type { TelegramUserbotConfig } from '../../../../core/types';
import { TelegramUserbotAdapter } from '../adapter';

let lastForwardTime = 0;

export async function processAutoForward(
  adapter: TelegramUserbotAdapter,
  config: TelegramUserbotConfig,
  messageText: string,
  sourceChatId: string,
  messageId: number,
): Promise<void> {
  const rules = config.autoForwardRules.filter(r => r.enabled);
  if (rules.length === 0) return;

  for (const rule of rules) {
    if (rule.sourceId !== sourceChatId) continue;

    // Check keyword filters
    if (rule.keywords && rule.keywords.length > 0) {
      const textLower = messageText.toLowerCase();
      const matches = rule.keywords.some(kw => textLower.includes(kw.toLowerCase()));
      if (!matches) continue;
    }

    // Enforce rate limit
    const now = Date.now();
    const interval = config.rateLimitForwardIntervalMs || 3000;
    if (now - lastForwardTime < interval) {
      await new Promise(resolve => setTimeout(resolve, interval - (now - lastForwardTime)));
    }
    lastForwardTime = Date.now();

    try {
      const client = adapter.getClient();
      await client.forwardMessages(rule.destinationId, {
        fromPeer: sourceChatId,
        messages: [messageId],
      });
      console.log(`[AUTO-FWD:${adapter.sessionId}] Forwarded message ${messageId} from ${sourceChatId} to ${rule.destinationId}`);
    } catch (err) {
      console.error(`[AUTO-FWD:${adapter.sessionId}] Forward failed:`, err);
    }
  }
}
