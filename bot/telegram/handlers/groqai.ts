/**
 * Groq AI Integration - /ask, /summarize, /translate commands using
 * the shared multi-key AI provider (Groq primary, Gemini fallback).
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import { getGroupConfig } from '../utils/db';
import { callAI, AIRateLimitError, AIQuotaExhaustedError } from '../../../lib/ai-provider';

async function queryGroq(prompt: string, systemPrompt?: string): Promise<string | null> {
  try {
    return await callAI({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });
  } catch (err: unknown) {
    if (err instanceof AIRateLimitError || err instanceof AIQuotaExhaustedError) {
      console.warn(`[GroqAI] All AI providers rate-limited: ${(err as Error).message}`);
    } else {
      console.error(`[GroqAI] AI call failed:`, err);
    }
    return null;
  }
}

export function registerGroqAiHandlers(bot: Bot, sessionId: string): void {
  bot.command('ask', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!(config as Record<string, unknown>).ai_enabled) {
      await ctx.reply('AI features are disabled. An admin can enable them from settings.');
      return;
    }

    const question = (ctx.message?.text || '').split(/\s+/).slice(1).join(' ')
      || ctx.message?.reply_to_message?.text;

    if (!question) {
      await ctx.reply('Usage: /ask <question> or reply to a message with /ask');
      return;
    }

    const thinking = await ctx.reply('🤔 Thinking...');

    const answer = await queryGroq(question, 'You are a helpful assistant in a Telegram group chat. Keep answers concise and informative.');
    if (!answer) {
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is temporarily unavailable. All providers are rate-limited — try again in a minute.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `🤖 ${answer}`.slice(0, 4096));
  });

  bot.command('summarize', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!(config as Record<string, unknown>).ai_enabled) {
      await ctx.reply('AI features are disabled.');
      return;
    }

    const text = ctx.message?.reply_to_message?.text;
    if (!text) {
      await ctx.reply('Reply to a message with /summarize to get a summary.');
      return;
    }

    const thinking = await ctx.reply('📝 Summarizing...');
    const summary = await queryGroq(text, 'Summarize the following text concisely. Keep it under 200 words.');
    if (!summary) {
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is temporarily unavailable.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `📝 <b>Summary:</b>\n${escapeHtml(summary)}`, { parse_mode: 'HTML' });
  });

  bot.command('translate', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!(config as Record<string, unknown>).ai_enabled) {
      await ctx.reply('AI features are disabled.');
      return;
    }

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const targetLang = args[0] || 'en';
    const text = args.slice(1).join(' ') || ctx.message?.reply_to_message?.text;

    if (!text) {
      await ctx.reply('Usage: /translate [lang] <text> or reply to a message');
      return;
    }

    const thinking = await ctx.reply('🌐 Translating...');
    const translated = await queryGroq(text, `Translate the following text to ${targetLang}. Only output the translation, nothing else.`);
    if (!translated) {
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is temporarily unavailable.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `🌐 ${translated}`.slice(0, 4096));
  });
}
