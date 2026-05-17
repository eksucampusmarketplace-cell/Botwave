/**
 * Channel Monitor Feature for Telegram Userbot
 * 
 * Monitors specified channels for keyword matches and sends notifications.
 */

import type { TelegramUserbotConfig } from '../../../../core/types';
import { TelegramUserbotAdapter } from '../adapter';

export async function processChannelMonitor(
  adapter: TelegramUserbotAdapter,
  config: TelegramUserbotConfig,
  messageText: string,
  sourceChatId: string,
): Promise<void> {
  const monitors = config.channelMonitors.filter(m => m.enabled);
  if (monitors.length === 0) return;

  for (const monitor of monitors) {
    if (monitor.channelId !== sourceChatId) continue;

    const textLower = messageText.toLowerCase();
    const matched = monitor.keywords.some(kw => textLower.includes(kw.toLowerCase()));
    if (!matched) continue;

    const matchedKeywords = monitor.keywords.filter(kw => textLower.includes(kw.toLowerCase()));

    try {
      const notification = `🔔 Channel Alert!\n\n` +
        `Channel: ${sourceChatId}\n` +
        `Keywords matched: ${matchedKeywords.join(', ')}\n\n` +
        `Message preview:\n${messageText.slice(0, 500)}`;

      await adapter.sendText(monitor.notifyChat, notification);
      console.log(`[CH-MON:${adapter.sessionId}] Keyword match in ${sourceChatId}, notified ${monitor.notifyChat}`);
    } catch (err) {
      console.error(`[CH-MON:${adapter.sessionId}] Notification failed:`, err);
    }
  }
}
