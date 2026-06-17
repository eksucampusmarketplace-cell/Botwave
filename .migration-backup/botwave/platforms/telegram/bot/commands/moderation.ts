/**
 * Telegram Bot Moderation Commands
 * 
 * Group management commands: ban, unban, mute, unmute, kick, warn, purge, pin, rules, etc.
 * These commands check admin permissions before executing.
 */

import type { PlatformMessage, PlatformAdapter, TelegramBotConfig } from '../../../../core/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function isAdmin(adapter: PlatformAdapter, chatId: string, userId: string): Promise<boolean> {
  const member = await adapter.getChatMember(chatId, userId);
  if (!member) return false;
  return member.status === 'administrator' || member.status === 'creator';
}

async function logModAction(
  sessionId: string,
  chatId: string,
  action: string,
  targetUserId: string | undefined,
  moderatorUserId: string,
  reason?: string,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('telegram_moderation_log').insert({
      session_id: sessionId,
      chat_id: chatId,
      action,
      target_user_id: targetUserId,
      moderator_user_id: moderatorUserId,
      reason,
    });
  } catch (err) {
    console.error(`[MOD-LOG] Failed to log action:`, err);
  }
}

function getTargetUserId(msg: PlatformMessage): string | undefined {
  const raw = msg.rawMessage as any;
  if (raw?.reply_to_message?.from?.id) {
    return String(raw.reply_to_message.from.id);
  }
  if (msg.commandArgs && msg.commandArgs.length > 0) {
    const arg = msg.commandArgs[0];
    if (/^\d+$/.test(arg)) return arg;
    if (arg.startsWith('@')) return arg;
  }
  return undefined;
}

function getTargetDisplayName(msg: PlatformMessage): string {
  const raw = msg.rawMessage as any;
  if (raw?.reply_to_message?.from) {
    const from = raw.reply_to_message.from;
    return from.first_name + (from.last_name ? ` ${from.last_name}` : '');
  }
  return msg.commandArgs?.[0] || 'Unknown';
}

export async function handleBanCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Reply to a message or provide a user ID to ban.');
    return;
  }
  const reason = msg.commandArgs?.slice(1).join(' ') || undefined;
  const success = await adapter.banUser(msg.chatId, targetId);
  if (success) {
    const name = getTargetDisplayName(msg);
    await adapter.sendText(msg.chatId, `Banned ${name}.${reason ? `\nReason: ${reason}` : ''}`);
    await logModAction(msg.sessionId, msg.chatId, 'ban', targetId, msg.sender.id, reason);
  } else {
    await adapter.sendText(msg.chatId, 'Failed to ban user. Make sure the bot has admin permissions.');
  }
}

export async function handleUnbanCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Provide a user ID to unban.');
    return;
  }
  const success = await adapter.unbanUser(msg.chatId, targetId);
  if (success) {
    await adapter.sendText(msg.chatId, `User unbanned.`);
    await logModAction(msg.sessionId, msg.chatId, 'unban', targetId, msg.sender.id);
  } else {
    await adapter.sendText(msg.chatId, 'Failed to unban user.');
  }
}

export async function handleMuteCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Reply to a message or provide a user ID to mute.');
    return;
  }

  let duration: number | undefined;
  const durationArg = msg.commandArgs?.find(a => /^\d+[smhd]$/.test(a));
  if (durationArg) {
    const num = parseInt(durationArg);
    const unit = durationArg.slice(-1);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    duration = Math.floor(Date.now() / 1000) + num * (multipliers[unit] || 60);
  }

  const reason = msg.commandArgs?.filter(a => !/^\d+[smhd]$/.test(a)).slice(1).join(' ') || undefined;
  const success = await adapter.muteUser(msg.chatId, targetId, duration);
  if (success) {
    const name = getTargetDisplayName(msg);
    const durationText = durationArg ? ` for ${durationArg}` : '';
    await adapter.sendText(msg.chatId, `Muted ${name}${durationText}.${reason ? `\nReason: ${reason}` : ''}`);
    await logModAction(msg.sessionId, msg.chatId, 'mute', targetId, msg.sender.id, reason);
  } else {
    await adapter.sendText(msg.chatId, 'Failed to mute user.');
  }
}

export async function handleUnmuteCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Reply to a message or provide a user ID to unmute.');
    return;
  }
  const success = await adapter.unmuteUser(msg.chatId, targetId);
  if (success) {
    const name = getTargetDisplayName(msg);
    await adapter.sendText(msg.chatId, `Unmuted ${name}.`);
    await logModAction(msg.sessionId, msg.chatId, 'unmute', targetId, msg.sender.id);
  } else {
    await adapter.sendText(msg.chatId, 'Failed to unmute user.');
  }
}

export async function handleKickCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Reply to a message or provide a user ID to kick.');
    return;
  }
  const reason = msg.commandArgs?.slice(1).join(' ') || undefined;
  const success = await adapter.kickUser(msg.chatId, targetId);
  if (success) {
    const name = getTargetDisplayName(msg);
    await adapter.sendText(msg.chatId, `Kicked ${name}.${reason ? `\nReason: ${reason}` : ''}`);
    await logModAction(msg.sessionId, msg.chatId, 'kick', targetId, msg.sender.id, reason);
  } else {
    await adapter.sendText(msg.chatId, 'Failed to kick user.');
  }
}

export async function handleWarnCommand(msg: PlatformMessage, adapter: PlatformAdapter, config: TelegramBotConfig): Promise<void> {
  if (!msg.isGroup) {
    await adapter.sendText(msg.chatId, 'This command only works in groups.');
    return;
  }
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to use this command.');
    return;
  }
  if (!supabase) {
    await adapter.sendText(msg.chatId, 'Database not configured.');
    return;
  }
  const targetId = getTargetUserId(msg);
  if (!targetId) {
    await adapter.sendText(msg.chatId, 'Reply to a message or provide a user ID to warn.');
    return;
  }

  const reason = msg.commandArgs?.slice(1).join(' ') || undefined;

  await supabase.from('telegram_warnings').insert({
    session_id: msg.sessionId,
    chat_id: msg.chatId,
    user_id: targetId,
    warned_by: msg.sender.id,
    reason,
  });

  const { count } = await supabase
    .from('telegram_warnings')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId)
    .eq('user_id', targetId);

  const warnCount = count || 1;
  const warnLimit = config.warnLimit || 3;
  const name = getTargetDisplayName(msg);

  await adapter.sendText(
    msg.chatId,
    `Warned ${name} (${warnCount}/${warnLimit}).${reason ? `\nReason: ${reason}` : ''}`,
  );
  await logModAction(msg.sessionId, msg.chatId, 'warn', targetId, msg.sender.id, reason);

  if (warnCount >= warnLimit) {
    const action = config.warnAction || 'mute';
    if (action === 'ban') {
      await adapter.banUser(msg.chatId, targetId);
      await adapter.sendText(msg.chatId, `${name} has been banned after ${warnLimit} warnings.`);
      await logModAction(msg.sessionId, msg.chatId, 'warn_ban', targetId, 'system');
    } else if (action === 'kick') {
      await adapter.kickUser(msg.chatId, targetId);
      await adapter.sendText(msg.chatId, `${name} has been kicked after ${warnLimit} warnings.`);
      await logModAction(msg.sessionId, msg.chatId, 'warn_kick', targetId, 'system');
    } else {
      await adapter.muteUser(msg.chatId, targetId);
      await adapter.sendText(msg.chatId, `${name} has been muted after ${warnLimit} warnings.`);
      await logModAction(msg.sessionId, msg.chatId, 'warn_mute', targetId, 'system');
    }

    // Reset warnings after action
    await supabase
      .from('telegram_warnings')
      .delete()
      .eq('session_id', msg.sessionId)
      .eq('chat_id', msg.chatId)
      .eq('user_id', targetId);
  }
}

export async function handleWarnsCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup || !supabase) return;
  const targetId = getTargetUserId(msg) || msg.sender.id;

  const { count } = await supabase
    .from('telegram_warnings')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId)
    .eq('user_id', targetId);

  await adapter.sendText(msg.chatId, `This user has ${count || 0} warning(s).`);
}

export async function handlePinCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) return;
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to pin messages.');
    return;
  }
  if (!msg.replyToMessageId) {
    await adapter.sendText(msg.chatId, 'Reply to a message to pin it.');
    return;
  }
  const success = await adapter.pinMessage(msg.chatId, msg.replyToMessageId);
  if (success) {
    await adapter.sendText(msg.chatId, 'Message pinned.');
  }
}

export async function handleUnpinCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) return;
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to unpin messages.');
    return;
  }
  if (!msg.replyToMessageId) {
    await adapter.sendText(msg.chatId, 'Reply to a message to unpin it.');
    return;
  }
  const success = await adapter.unpinMessage(msg.chatId, msg.replyToMessageId);
  if (success) {
    await adapter.sendText(msg.chatId, 'Message unpinned.');
  }
}

export async function handleRulesCommand(msg: PlatformMessage, adapter: PlatformAdapter, config: TelegramBotConfig): Promise<void> {
  if (!msg.isGroup) return;
  if (config.rulesText) {
    await adapter.sendText(msg.chatId, `📜 Group Rules:\n\n${config.rulesText}`);
  } else {
    await adapter.sendText(msg.chatId, 'No rules have been set. An admin can set rules from the Botwave dashboard.');
  }
}

export async function handleSetRulesCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) return;
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to set rules.');
    return;
  }
  if (!supabase) return;

  const rulesText = msg.commandArgs?.join(' ');
  if (!rulesText) {
    await adapter.sendText(msg.chatId, 'Usage: /setrules <rules text>');
    return;
  }

  await supabase
    .from('telegram_bot_configs')
    .update({ rules_text: rulesText, updated_at: new Date().toISOString() })
    .eq('session_id', msg.sessionId);

  await adapter.sendText(msg.chatId, 'Rules updated.');
}

export async function handleAdminsCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) return;
  const admins = await adapter.getChatAdmins(msg.chatId);
  if (admins.length === 0) {
    await adapter.sendText(msg.chatId, 'Could not fetch admin list.');
    return;
  }
  const list = admins.map(a => `• ${a.displayName}${a.username ? ` (@${a.username})` : ''}`).join('\n');
  await adapter.sendText(msg.chatId, `👮 Group Admins:\n\n${list}`);
}

export async function handlePurgeCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup) return;
  if (!(await isAdmin(adapter, msg.chatId, msg.sender.id))) {
    await adapter.sendText(msg.chatId, 'You need to be an admin to purge messages.');
    return;
  }

  if (!msg.replyToMessageId) {
    await adapter.sendText(msg.chatId, 'Reply to a message to delete all messages from that point.');
    return;
  }

  const startMsgId = Number(msg.replyToMessageId);
  const endMsgId = Number(msg.id);
  let deleted = 0;

  for (let i = startMsgId; i <= endMsgId; i++) {
    const success = await adapter.deleteMessage(msg.chatId, String(i));
    if (success) deleted++;
  }

  const notice = await adapter.sendText(msg.chatId, `Purged ${deleted} message(s).`);
  await logModAction(msg.sessionId, msg.chatId, 'purge', undefined, msg.sender.id, `Deleted ${deleted} messages`);
}
