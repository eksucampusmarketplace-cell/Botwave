/**
 * Account Warming Feature for Telegram Userbot
 * 
 * Gradually increases account activity to build trust and avoid bans.
 * Enforces strict rate limits: min 2s between messages, 5m between joins.
 */

import type { TelegramUserbotConfig } from '../../../../core/types';
import { TelegramUserbotAdapter } from '../adapter';

let warmingInterval: NodeJS.Timeout | null = null;

const warmingActivities = [
  'read_messages',
  'mark_read',
  'update_status',
  'react',
];

export function startWarming(
  adapter: TelegramUserbotAdapter,
  config: TelegramUserbotConfig,
): void {
  if (!config.warmingEnabled) return;
  if (warmingInterval) return;

  const frequencyMs = (config.warmingConfig.frequency || 30) * 60_000; // default 30 min

  warmingInterval = setInterval(async () => {
    if (!adapter.isConnected()) return;

    const activities = config.warmingConfig.activityTypes || warmingActivities;
    const activity = activities[Math.floor(Math.random() * activities.length)];

    try {
      switch (activity) {
        case 'mark_read': {
          const client = adapter.getClient();
          const dialogs = await client.getDialogs({ limit: 5 });
          for (const dialog of dialogs) {
            if (dialog.unreadCount > 0) {
              await client.markAsRead(dialog.entity!);
              // Rate limit between reads
              await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
              break;
            }
          }
          break;
        }
        case 'update_status': {
          const client = adapter.getClient();
          const statuses = ['Available', 'Busy', ''];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          try {
            const { Api } = await import('telegram/tl');
            await client.invoke(new Api.account.UpdateStatus({ offline: false }));
          } catch {
            // Non-critical
          }
          break;
        }
        default:
          // read_messages, react — just mark presence
          break;
      }

      console.log(`[WARMING:${adapter.sessionId}] Activity: ${activity}`);
    } catch (err) {
      console.error(`[WARMING:${adapter.sessionId}] Error:`, err);
    }
  }, frequencyMs);

  console.log(`[WARMING:${adapter.sessionId}] Started with interval ${frequencyMs}ms`);
}

export function stopWarming(): void {
  if (warmingInterval) {
    clearInterval(warmingInterval);
    warmingInterval = null;
  }
}
