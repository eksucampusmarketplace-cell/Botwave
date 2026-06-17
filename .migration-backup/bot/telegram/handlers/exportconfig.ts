/**
 * Export config handler: /exportconfig
 * Exports group configuration as JSON for backup/restore.
 */

import { Bot, InputFile } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig } from '../utils/db';
import { checkCooldown, setCooldown } from '../utils/cooldown';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export function registerExportConfigHandlers(bot: Bot, sessionId: string): void {
  bot.command(['exportconfig', 'export'], async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.from) return;

    const remaining = checkCooldown(ctx.from.id, 'exportconfig');
    if (remaining > 0) {
      await ctx.reply(`Please wait ${remaining}s before exporting again.`);
      return;
    }

    setCooldown(ctx.from.id, 'exportconfig');

    const chatId = ctx.chat!.id.toString();

    // Gather all config data
    const [groupConfig, notes, filters, welcomeMsg, rules] = await Promise.all([
      getGroupConfig(sessionId, chatId),
      supabase.from('telegram_notes').select('*').eq('session_id', sessionId).eq('chat_id', chatId).then(r => r.data || []),
      supabase.from('telegram_filters').select('*').eq('session_id', sessionId).eq('chat_id', chatId).then(r => r.data || []),
      supabase.from('telegram_welcome_messages').select('*').eq('session_id', sessionId).eq('chat_id', chatId).then(r => r.data || []),
      supabase.from('telegram_rules').select('*').eq('session_id', sessionId).eq('chat_id', chatId).then(r => r.data || []),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      session_id: sessionId,
      chat_id: chatId,
      chat_title: ctx.chat?.title || 'Unknown',
      group_config: groupConfig,
      notes: notes.map((n: Record<string, unknown>) => ({ name: n.name, content: n.content, media_type: n.media_type })),
      filters: filters.map((f: Record<string, unknown>) => ({ keyword: f.keyword, response: f.response, action: f.action })),
      welcome_messages: welcomeMsg,
      rules,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    await ctx.replyWithDocument(
      new InputFile(buffer, `botwave-config-${chatId}-${Date.now()}.json`),
      { caption: 'Group configuration exported successfully.' },
    );
  });
}
