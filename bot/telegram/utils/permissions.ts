/**
 * Permission utilities for Telegram bot handlers.
 * Supports admin, owner, and sudo user checks.
 */

import { Context } from 'grammy';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory sudo cache per session
const sudoCache = new Map<string, { users: string[]; expiresAt: number }>();
const SUDO_CACHE_TTL = 60_000;

export async function getSudoUsers(sessionId: string): Promise<string[]> {
  const cached = sudoCache.get(sessionId);
  if (cached && Date.now() < cached.expiresAt) return cached.users;

  const { data } = await supabase
    .from('telegram_sudo_users')
    .select('user_id')
    .eq('session_id', sessionId);

  const users = (data || []).map((r: { user_id: string }) => r.user_id);
  sudoCache.set(sessionId, { users, expiresAt: Date.now() + SUDO_CACHE_TTL });
  return users;
}

export function invalidateSudoCache(sessionId: string): void {
  sudoCache.delete(sessionId);
}

export async function addSudoUser(sessionId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_sudo_users')
    .upsert({ session_id: sessionId, user_id: userId }, { onConflict: 'session_id,user_id' });
  invalidateSudoCache(sessionId);
  return !error;
}

export async function removeSudoUser(sessionId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_sudo_users')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  invalidateSudoCache(sessionId);
  return !error;
}

export async function isSudoUser(sessionId: string, userId: number): Promise<boolean> {
  const sudos = await getSudoUsers(sessionId);
  return sudos.includes(userId.toString());
}

/**
 * Check if a user is the bot owner (explicit owner set in config).
 */
export async function isOwner(sessionId: string, userId: number): Promise<boolean> {
  const { data: config } = await supabase
    .from('telegram_bot_configs')
    .select('owner_user_id')
    .eq('session_id', sessionId)
    .single();

  if (config?.owner_user_id && config.owner_user_id === userId.toString()) return true;
  return false;
}

export async function isAdmin(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.chat) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch {
    return false;
  }
}

export async function isCreator(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.chat) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === 'creator';
  } catch {
    return false;
  }
}

export async function isBotAdmin(ctx: Context): Promise<boolean> {
  if (!ctx.chat) return false;
  try {
    const bot = await ctx.getChatMember(ctx.me.id);
    return bot.status === 'administrator' || bot.status === 'creator';
  } catch {
    return false;
  }
}

/**
 * Check if user is admin, owner, or sudo — any elevated role.
 */
export async function isElevated(ctx: Context, sessionId: string): Promise<boolean> {
  if (!ctx.from) return false;
  const admin = await isAdmin(ctx);
  if (admin) return true;
  const sudo = await isSudoUser(sessionId, ctx.from.id);
  if (sudo) return true;
  const owner = await isOwner(sessionId, ctx.from.id);
  return owner;
}

/**
 * Full permission check for moderation commands:
 * 1. Bot must be admin
 * 2. Invoker must be admin/sudo/owner
 * 3. Target must NOT be admin/creator
 */
export async function checkPermissions(
  ctx: Context,
  targetId: number,
  sessionId?: string,
): Promise<boolean> {
  if (!ctx.from || !ctx.chat) {
    await ctx.reply('❌ Cannot determine chat or user context.');
    return false;
  }

  try {
    const bot = await ctx.getChatMember(ctx.me.id);
    if (!['administrator', 'creator'].includes(bot.status)) {
      await ctx.reply('❌ I need admin permissions to do this.');
      return false;
    }
  } catch {
    await ctx.reply('❌ Could not verify my permissions.');
    return false;
  }

  let hasPermission = false;
  try {
    const invoker = await ctx.getChatMember(ctx.from.id);
    if (['administrator', 'creator'].includes(invoker.status)) {
      hasPermission = true;
    }
  } catch { /* continue to check sudo/owner */ }

  if (!hasPermission && sessionId) {
    hasPermission = await isSudoUser(sessionId, ctx.from.id) || await isOwner(sessionId, ctx.from.id);
  }

  if (!hasPermission) {
    await ctx.reply('❌ Only admins can use this command.');
    return false;
  }

  try {
    const target = await ctx.getChatMember(targetId);
    if (['administrator', 'creator'].includes(target.status)) {
      await ctx.reply('❌ I cannot restrict another admin.');
      return false;
    }
  } catch {
    await ctx.reply('❌ Could not find the target user.');
    return false;
  }

  return true;
}

export async function requireAdmin(ctx: Context, sessionId?: string): Promise<boolean> {
  if (!ctx.from || !ctx.chat) return false;

  if (sessionId) {
    const elevated = await isElevated(ctx, sessionId);
    if (!elevated) {
      await ctx.reply('❌ Only admins can use this command.');
      return false;
    }
    return true;
  }

  const admin = await isAdmin(ctx);
  if (!admin) {
    await ctx.reply('❌ Only admins can use this command.');
    return false;
  }
  return true;
}

export async function requireBotAdmin(ctx: Context): Promise<boolean> {
  const admin = await isBotAdmin(ctx);
  if (!admin) {
    await ctx.reply('❌ I need admin permissions to do this.');
    return false;
  }
  return true;
}

/**
 * Require owner or sudo — for sensitive commands like /addsudo, /delsudo, /setowner.
 */
export async function requireOwnerOrSudo(ctx: Context, sessionId: string): Promise<boolean> {
  if (!ctx.from) return false;
  const creator = await isCreator(ctx);
  if (creator) return true;
  const sudo = await isSudoUser(sessionId, ctx.from.id);
  if (sudo) return true;
  const owner = await isOwner(sessionId, ctx.from.id);
  if (owner) return true;
  await ctx.reply('❌ Only the owner or sudo users can use this command.');
  return false;
}
