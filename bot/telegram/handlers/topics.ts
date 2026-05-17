/**
 * Topics handler: manage forum topics in supergroups.
 * /actiontopic, /setactiontopic, /newtopic, /renametopic,
 * /closetopic, /reopentopic, /deletetopic
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';

export function registerTopicsHandlers(bot: Bot, sessionId: string): void {
  // /actiontopic — Show current action topic setting
  bot.command('actiontopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const config = await getTelegramConfig(sessionId);
    const topicId = (config as Record<string, unknown>).action_topic_id as string | null;
    if (topicId) {
      await ctx.reply(`📋 Action topic ID: <code>${topicId}</code>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('📋 No action topic set. Use /setactiontopic to set one.');
    }
  });

  // /setactiontopic — Set topic where bot actions are sent
  bot.command('setactiontopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      if (ctx.message?.message_thread_id) {
        await updateTelegramConfig(sessionId, { action_topic_id: ctx.message.message_thread_id.toString() } as Record<string, unknown>);
        await ctx.reply(`✅ Action topic set to this topic (${ctx.message.message_thread_id}).`);
      } else {
        await ctx.reply('Usage: /setactiontopic <topic_id>\nOr use this command inside a topic.');
      }
      return;
    }
    await updateTelegramConfig(sessionId, { action_topic_id: arg } as Record<string, unknown>);
    await ctx.reply(`✅ Action topic set to: ${arg}`);
  });

  // /newtopic <name> — Create a new forum topic
  bot.command('newtopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const name = (ctx.match?.toString() || '').trim();
    if (!name) { await ctx.reply('Usage: /newtopic <topic name>'); return; }
    try {
      const topic = await ctx.api.createForumTopic(ctx.chat!.id, name);
      await ctx.reply(`✅ Topic "<b>${name}</b>" created (ID: ${topic.message_thread_id}).`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not create topic. Is this a forum-enabled supergroup?');
    }
  });

  // /renametopic <name> — Rename current topic (use inside a topic)
  bot.command('renametopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const name = (ctx.match?.toString() || '').trim();
    if (!name) { await ctx.reply('Usage: /renametopic <new name>'); return; }
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) { await ctx.reply('Use this command inside a topic.'); return; }
    try {
      await ctx.api.editForumTopic(ctx.chat!.id, threadId, { name });
      await ctx.reply(`✅ Topic renamed to "<b>${name}</b>".`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not rename topic.');
    }
  });

  // /closetopic — Close current topic
  bot.command('closetopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) { await ctx.reply('Use this command inside a topic.'); return; }
    try {
      await ctx.api.closeForumTopic(ctx.chat!.id, threadId);
      await ctx.reply('✅ Topic closed.');
    } catch {
      await ctx.reply('❌ Could not close topic.');
    }
  });

  // /reopentopic — Reopen a closed topic
  bot.command('reopentopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) { await ctx.reply('Use this command inside a topic.'); return; }
    try {
      await ctx.api.reopenForumTopic(ctx.chat!.id, threadId);
      await ctx.reply('✅ Topic reopened.');
    } catch {
      await ctx.reply('❌ Could not reopen topic.');
    }
  });

  // /deletetopic — Delete current topic
  bot.command('deletetopic', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) { await ctx.reply('Use this command inside a topic.'); return; }
    try {
      await ctx.api.deleteForumTopic(ctx.chat!.id, threadId);
    } catch {
      await ctx.reply('❌ Could not delete topic.');
    }
  });
}
