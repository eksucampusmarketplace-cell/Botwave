/**
 * Admin Notifier - sends critical error notifications to bot owner/log channel.
 * 
 * Used for:
 * - Bot kicked from group
 * - Daily summary generation failures
 * - Session errors requiring attention
 * - Permission issues
 */

import { Bot } from 'grammy';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Severity = 'critical' | 'warning' | 'info';

interface AdminNotification {
  title: string;
  details: string;
  severity: Severity;
  chatId?: string;
  chatTitle?: string;
}

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

// Rate limit: max 1 notification per event type per 5 minutes
const notifCooldowns = new Map<string, number>();
const NOTIF_COOLDOWN_MS = 300_000;

function shouldNotify(key: string): boolean {
  const last = notifCooldowns.get(key);
  if (last && Date.now() - last < NOTIF_COOLDOWN_MS) return false;
  notifCooldowns.set(key, Date.now());
  return true;
}

export async function notifyAdmin(
  bot: Bot,
  sessionId: string,
  notification: AdminNotification,
): Promise<void> {
  const dedupeKey = `${sessionId}:${notification.title}:${notification.chatId || ''}`;
  if (!shouldNotify(dedupeKey)) return;

  const emoji = SEVERITY_EMOJI[notification.severity];
  const msg =
    `${emoji} <b>${notification.title}</b>\n\n` +
    `${notification.details}\n\n` +
    (notification.chatId ? `<b>Chat:</b> ${notification.chatTitle || notification.chatId}\n` : '') +
    `<b>Time:</b> ${new Date().toUTCString()}`;

  const { data: config } = await supabase
    .from('telegram_bot_configs')
    .select('log_channel_id, owner_user_id')
    .eq('session_id', sessionId)
    .single();

  if (config?.log_channel_id) {
    try {
      await bot.api.sendMessage(Number(config.log_channel_id), msg, { parse_mode: 'HTML' });
      return;
    } catch {}
  }

  if (config?.owner_user_id) {
    try {
      await bot.api.sendMessage(Number(config.owner_user_id), msg, { parse_mode: 'HTML' });
    } catch {}
  }
}

// Cleanup expired cooldowns periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of notifCooldowns) {
    if (now - time > NOTIF_COOLDOWN_MS) notifCooldowns.delete(key);
  }
}, 300_000);
