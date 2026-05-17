/**
 * Groq AI Integration — /ask, /summarize commands using Groq API.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import { getTelegramConfig } from '../utils/db';

async function queryGroq(prompt: string, systemPrompt?: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export function registerGroqAiHandlers(bot: Bot, sessionId: string): void {
  bot.command('ask', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
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
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is unavailable. Check GROQ_API_KEY configuration.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `🤖 ${answer}`.slice(0, 4096));
  });

  bot.command('summarize', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
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
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is unavailable.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `📝 <b>Summary:</b>\n${escapeHtml(summary)}`, { parse_mode: 'HTML' });
  });

  bot.command('translate', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
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
      await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, '❌ AI is unavailable.');
      return;
    }

    await ctx.api.editMessageText(ctx.chat!.id, thinking.message_id, `🌐 ${translated}`.slice(0, 4096));
  });
}
