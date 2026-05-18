/**
 * Resolve target user from reply, @username, or numeric ID.
 */

import { Context } from 'grammy';
import type { User } from '@grammyjs/types';

export interface ResolvedTarget {
  user: User | null;
  userId: number | null;
  username?: string;
  reason: string;
}

export function resolveTarget(ctx: Context): ResolvedTarget {
  // 1. Reply to message — use replied-to user
  if (ctx.message?.reply_to_message?.from) {
    const args = (ctx.match?.toString() || '').trim();
    return {
      user: ctx.message.reply_to_message.from,
      userId: ctx.message.reply_to_message.from.id,
      reason: args,
    };
  }

  // 2. First arg is @username or numeric ID
  const text = (ctx.match?.toString() || '').trim();
  if (!text) {
    return { user: null, userId: null, reason: '' };
  }

  const parts = text.split(/\s+/);
  const firstArg = parts[0];
  const reason = parts.slice(1).join(' ');

  // Numeric user ID
  const numId = parseInt(firstArg, 10);
  if (!isNaN(numId) && numId > 0) {
    return { user: null, userId: numId, reason };
  }

  // @username — return username for async resolution by caller
  if (firstArg.startsWith('@')) {
    return { user: null, userId: null, username: firstArg.slice(1), reason };
  }

  // Plain text that looks like a username (alphanumeric + underscore, 3+ chars)
  if (/^[a-zA-Z]\w{2,}$/.test(firstArg)) {
    return { user: null, userId: null, username: firstArg, reason };
  }

  return { user: null, userId: null, reason: text };
}

/**
 * Parse duration string like "1h", "30m", "2d", "1w" into seconds.
 */
export function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  return parseInt(num) * multipliers[unit];
}
