/**
 * User Name/Username Change Tracking - detects and logs when users change
 * their name or username, with full history.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface UserSnapshot {
  first_name: string;
  last_name?: string;
  username?: string;
}

async function getLastSnapshot(sessionId: string, userId: string): Promise<UserSnapshot | null> {
  const { data } = await supabase
    .from('telegram_name_history')
    .select('first_name, last_name, username')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function saveSnapshot(sessionId: string, userId: string, snapshot: UserSnapshot, changeType: string): Promise<void> {
  await supabase.from('telegram_name_history').insert({
    session_id: sessionId,
    user_id: userId,
    first_name: snapshot.first_name,
    last_name: snapshot.last_name || null,
    username: snapshot.username || null,
    change_type: changeType,
    created_at: new Date().toISOString(),
  });
}

async function getHistory(sessionId: string, userId: string, limit = 10): Promise<Array<UserSnapshot & { change_type: string; created_at: string }>> {
  const { data } = await supabase
    .from('telegram_name_history')
    .select('first_name, last_name, username, change_type, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export function registerNameHistoryHandlers(bot: Bot, sessionId: string): void {
  // Track name/username changes on every message
  bot.on('message', async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) {
      await next();
      return;
    }

    const userId = ctx.from.id.toString();
    const current: UserSnapshot = {
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      username: ctx.from.username,
    };

    try {
      const last = await getLastSnapshot(sessionId, userId);
      if (!last) {
        // First time seeing this user - save initial snapshot
        await saveSnapshot(sessionId, userId, current, 'initial');
      } else {
        const changes: string[] = [];
        if (last.first_name !== current.first_name || (last.last_name || '') !== (current.last_name || '')) {
          changes.push('name');
        }
        if ((last.username || '') !== (current.username || '')) {
          changes.push('username');
        }
        if (changes.length > 0) {
          await saveSnapshot(sessionId, userId, current, changes.join(','));

          // Notify in chat if log channel is not set
          const config = await import('../utils/db').then(m => m.getGroupConfig(sessionId, ctx.chat!.id.toString()));
          if (config.log_channel_id) {
            let text = `👤 <b>User update</b> - <a href="tg://user?id=${ctx.from.id}">${escapeHtml(current.first_name)}</a>\n`;
            if (changes.includes('name')) {
              const oldName = `${last.first_name}${last.last_name ? ' ' + last.last_name : ''}`;
              const newName = `${current.first_name}${current.last_name ? ' ' + current.last_name : ''}`;
              text += `📛 Name: ${escapeHtml(oldName)} → ${escapeHtml(newName)}\n`;
            }
            if (changes.includes('username')) {
              text += `🔗 Username: @${escapeHtml(last.username || 'none')} → @${escapeHtml(current.username || 'none')}\n`;
            }
            try {
              await bot.api.sendMessage(Number(config.log_channel_id), text, { parse_mode: 'HTML' });
            } catch { /* log channel may not exist */ }
          }
        }
      }
    } catch { /* non-critical tracking */ }

    await next();
  });

  bot.command('namehistory', async (ctx) => {
    let targetId: string;
    if (ctx.message?.reply_to_message?.from) {
      targetId = ctx.message.reply_to_message.from.id.toString();
    } else {
      const args = (ctx.message?.text || '').split(/\s+/).slice(1);
      targetId = args[0] || ctx.from?.id.toString() || '';
    }

    if (!targetId) {
      await ctx.reply('Usage: /namehistory [reply/@user/id]');
      return;
    }

    // Strip @ prefix
    if (targetId.startsWith('@')) {
      try {
        const chat = await ctx.api.getChat(targetId.slice(1));
        targetId = (chat as { id: number }).id.toString();
      } catch {
        await ctx.reply('Could not find that user.');
        return;
      }
    }

    const history = await getHistory(sessionId, targetId);
    if (history.length === 0) {
      await ctx.reply('No name history found for this user.');
      return;
    }

    let text = `📋 <b>Name History</b> (User ${targetId})\n\n`;
    for (const entry of history) {
      const date = new Date(entry.created_at).toLocaleDateString();
      const name = `${entry.first_name}${entry.last_name ? ' ' + entry.last_name : ''}`;
      const username = entry.username ? `@${entry.username}` : 'no username';
      const badge = entry.change_type === 'initial' ? '🆕' : '✏️';
      text += `${badge} ${escapeHtml(name)} (${escapeHtml(username)}) - ${date}\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  });
}
