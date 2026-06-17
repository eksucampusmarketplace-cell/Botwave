/**
 * Daily Summary Service
 * 
 * Generates and sends AI-powered daily summaries to groups.
 * Uses Groq (primary) with Gemini fallback via callAI.
 * 
 * Runs as a per-bot-instance interval that checks hourly whether
 * any groups configured for this session are due a summary.
 */

import { Bot } from 'grammy';
import { createClient } from '@supabase/supabase-js';
import { callAI } from '../../../lib/ai-provider';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface GroupSummaryConfig {
  chat_id: number;
  chat_title?: string;
  daily_summary_channel_id?: string;
  last_summary_sent_at?: string;
  language?: string;
}

/**
 * Check and send daily summaries for groups belonging to this session.
 * Should be called roughly every 60 minutes.
 */
export async function checkDailySummaries(bot: Bot, sessionId: string): Promise<void> {
  const currentHour = new Date().getUTCHours();

  // First check bot-level config
  const { data: botConfig } = await supabase
    .from('telegram_bot_configs')
    .select('daily_summary_enabled, daily_summary_hour, daily_summary_channel_id, last_summary_sent_at')
    .eq('session_id', sessionId)
    .single();

  // Then check group-level configs
  const { data: groups } = await supabase
    .from('telegram_group_configs')
    .select('chat_id, chat_title, daily_summary_channel_id, last_summary_sent_at, language')
    .eq('session_id', sessionId)
    .eq('daily_summary_enabled', true)
    .eq('daily_summary_hour', currentHour);

  const allTargets: GroupSummaryConfig[] = [];

  if (groups) {
    allTargets.push(...groups);
  }

  // If bot-level daily summary is enabled, it applies to all groups for this session
  // that don't have their own group-level config
  if (botConfig?.daily_summary_enabled && botConfig.daily_summary_hour === currentHour) {
    const groupChatIds = new Set(allTargets.map(g => g.chat_id));
    // Get all groups for this session that don't have specific summary config
    const { data: allGroups } = await supabase
      .from('telegram_group_configs')
      .select('chat_id, chat_title, language')
      .eq('session_id', sessionId)
      .eq('daily_summary_enabled', false);

    if (allGroups) {
      for (const group of allGroups) {
        if (!groupChatIds.has(group.chat_id)) {
          allTargets.push({
            ...group,
            daily_summary_channel_id: botConfig.daily_summary_channel_id,
            last_summary_sent_at: botConfig.last_summary_sent_at,
          });
        }
      }
    }
  }

  if (allTargets.length === 0) return;

  for (const group of allTargets) {
    try {
      // Skip if already sent this hour today
      if (group.last_summary_sent_at) {
        const lastSent = new Date(group.last_summary_sent_at);
        const now = new Date();
        if (
          lastSent.getUTCHours() === currentHour &&
          lastSent.getUTCDate() === now.getUTCDate() &&
          lastSent.getUTCMonth() === now.getUTCMonth()
        ) {
          continue;
        }
      }

      await generateAndSendSummary(bot, sessionId, group);
    } catch (err) {
      console.error(`[DAILY-SUMMARY] Failed for chat ${group.chat_id}:`, err);
    }
  }
}

async function generateAndSendSummary(
  bot: Bot,
  sessionId: string,
  group: GroupSummaryConfig,
): Promise<void> {
  const messages = await getGroupMessages(sessionId, group.chat_id.toString());

  if (messages.length === 0) {
    // Optionally send a quiet "no messages" message
    return;
  }

  console.log(`[DAILY-SUMMARY] Generating summary for chat ${group.chat_id} (${messages.length} messages)`);

  const messagesText = messages.slice(0, 300).join('\n');
  const dateStr = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are a group chat summariser. Given a list of messages from the last 24 hours, produce a concise, friendly, and informative daily recap.

Use this exact format (with emojis):

📆 <b>Daily Digest – ${dateStr}</b>
👥 <b>Top participants:</b> (list up to 5, with message count)
💬 <b>Key discussions:</b> (2-4 bullet points summarising main topics)
🔗 <b>Important links:</b> (if any)
📊 <b>Stats:</b> total messages, most active hour
🎯 <b>Action items:</b> (if any were mentioned)

Rules:
- Keep total output under 1500 characters.
- Use HTML formatting (bold with <b>, italic with <i>).
- Do not include any offensive or private information.
- If there are very few messages, keep the summary brief.
- Always respond in English unless the group primarily uses another language.`;

  const userPrompt = `Messages from the group "${group.chat_title || 'Unknown'}" (sender: message):\n\n${messagesText}`;

  let summary: string;
  try {
    summary = await callAI({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 800,
      temperature: 0.4,
    });
  } catch (aiErr) {
    console.error(`[DAILY-SUMMARY] AI call failed for chat ${group.chat_id}:`, aiErr);
    // Retry once
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      summary = await callAI({
        prompt: userPrompt,
        systemPrompt,
        maxTokens: 800,
        temperature: 0.4,
      });
    } catch {
      console.error(`[DAILY-SUMMARY] AI retry also failed for chat ${group.chat_id}, skipping`);
      return;
    }
  }

  const targetChatId = group.daily_summary_channel_id
    ? Number(group.daily_summary_channel_id)
    : group.chat_id;

  try {
    await bot.api.sendMessage(targetChatId, summary, { parse_mode: 'HTML' });
  } catch (sendErr) {
    // Retry without HTML
    try {
      const plainSummary = summary.replace(/<[^>]+>/g, '');
      await bot.api.sendMessage(targetChatId, plainSummary);
    } catch {
      console.error(`[DAILY-SUMMARY] Failed to send summary to ${targetChatId}:`, sendErr);
      return;
    }
  }

  // Update last_summary_sent_at
  await supabase
    .from('telegram_group_configs')
    .update({ last_summary_sent_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('chat_id', group.chat_id);

  console.log(`[DAILY-SUMMARY] Summary sent for chat ${group.chat_id}`);
}

async function getGroupMessages(sessionId: string, chatId: string): Promise<string[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('messages')
    .select('content, sender_name, created_at')
    .eq('session_id', sessionId)
    .eq('group_jid', chatId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500);

  if (!data || data.length === 0) return [];

  return data.map((msg: { sender_name?: string; content?: string }) =>
    `${msg.sender_name || 'User'}: ${msg.content || '[non-text]'}`,
  );
}
