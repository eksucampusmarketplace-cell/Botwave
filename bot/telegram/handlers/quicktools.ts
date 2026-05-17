/**
 * Quick utility commands: password, uuid, calc, bmi, countdown, timezone.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import * as crypto from 'crypto';

function generatePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => charset[b % charset.length]).join('');
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function safeCalc(expr: string): number | null {
  const cleaned = expr.replace(/[^0-9+\-*/().% ]/g, '');
  if (!cleaned || cleaned.length > 100) return null;
  try {
    const fn = new Function(`return (${cleaned})`);
    const result = fn();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 1e10) / 1e10;
  } catch {
    return null;
  }
}

function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  const bmi = weight / (height * height);
  let category: string;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}

const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0, GMT: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6,
  PST: -8, PDT: -7, IST: 5.5, CET: 1, CEST: 2, JST: 9, KST: 9,
  AEST: 10, AEDT: 11, NZST: 12, NZDT: 13, WAT: 1, CAT: 2, EAT: 3,
  SGT: 8, HKT: 8, CST_CHINA: 8, BRT: -3, ART: -3,
};

export function registerQuickToolsHandlers(bot: Bot, _sessionId: string): void {
  bot.command('password', async (ctx) => {
    const arg = (ctx.match?.toString() || '').trim();
    const length = Math.min(Math.max(parseInt(arg, 10) || 16, 4), 64);
    const pwd = generatePassword(length);
    await ctx.reply(
      `🔐 <b>Generated Password</b> (${length} chars)\n\n<code>${escapeHtml(pwd)}</code>\n\n<i>This message will auto-delete in 30s for security.</i>`,
      { parse_mode: 'HTML' },
    );
    setTimeout(async () => {
      try { await ctx.deleteMessage(); } catch {}
    }, 30000);
  });

  bot.command('uuid', async (ctx) => {
    const id = generateUUID();
    await ctx.reply(`🆔 <code>${id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('calc', async (ctx) => {
    const expr = (ctx.match?.toString() || '').trim();
    if (!expr) { await ctx.reply('Usage: /calc <expression>\nExample: /calc 2 + 3 * 4'); return; }
    const result = safeCalc(expr);
    if (result === null) {
      await ctx.reply('❌ Invalid expression. Use numbers and basic operators (+, -, *, /, %).');
      return;
    }
    await ctx.reply(`🧮 <code>${escapeHtml(expr)}</code> = <b>${result}</b>`, { parse_mode: 'HTML' });
  });

  bot.command('bmi', async (ctx) => {
    const args = (ctx.match?.toString() || '').trim().split(/\s+/);
    if (args.length < 2) {
      await ctx.reply('Usage: /bmi <weight_kg> <height_m>\nExample: /bmi 70 1.75');
      return;
    }
    const weight = parseFloat(args[0]);
    const height = parseFloat(args[1]);
    if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0 || height > 3) {
      await ctx.reply('❌ Invalid values. Weight in kg, height in meters.');
      return;
    }
    const { bmi, category } = calculateBMI(weight, height);
    await ctx.reply(
      `⚖️ <b>BMI Calculator</b>\n\nWeight: ${weight} kg\nHeight: ${height} m\n\n<b>BMI: ${bmi}</b>\nCategory: ${category}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('timezone', async (ctx) => {
    const arg = (ctx.match?.toString() || '').trim().toUpperCase();
    if (!arg) {
      const zones = Object.keys(TIMEZONE_OFFSETS).slice(0, 20).join(', ');
      await ctx.reply(`🕐 Usage: /timezone <zone>\n\nAvailable: ${zones}\n\nOr use: /timezone EST PST (to convert)`);
      return;
    }

    const parts = arg.split(/\s+/);
    if (parts.length === 1) {
      const offset = TIMEZONE_OFFSETS[parts[0]];
      if (offset === undefined) {
        await ctx.reply(`❌ Unknown timezone: ${parts[0]}`);
        return;
      }
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const targetTime = new Date(utcMs + offset * 3600000);
      await ctx.reply(
        `🕐 <b>${parts[0]}</b> (UTC${offset >= 0 ? '+' : ''}${offset})\n\n${targetTime.toLocaleString('en-US', { hour12: true })}`,
        { parse_mode: 'HTML' },
      );
    } else if (parts.length >= 2) {
      const offset1 = TIMEZONE_OFFSETS[parts[0]];
      const offset2 = TIMEZONE_OFFSETS[parts[1]];
      if (offset1 === undefined || offset2 === undefined) {
        await ctx.reply(`❌ Unknown timezone(s).`);
        return;
      }
      const diff = offset2 - offset1;
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const t1 = new Date(utcMs + offset1 * 3600000);
      const t2 = new Date(utcMs + offset2 * 3600000);
      await ctx.reply(
        `🕐 <b>Timezone Comparison</b>\n\n${parts[0]}: ${t1.toLocaleString('en-US', { hour12: true })}\n${parts[1]}: ${t2.toLocaleString('en-US', { hour12: true })}\n\nDifference: ${diff >= 0 ? '+' : ''}${diff} hours`,
        { parse_mode: 'HTML' },
      );
    }
  });

  bot.command('pick', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /pick item1, item2, item3, ...'); return; }
    const items = text.split(',').map(i => i.trim()).filter(Boolean);
    if (items.length < 2) { await ctx.reply('Provide at least 2 items separated by commas.'); return; }
    const picked = items[Math.floor(Math.random() * items.length)];
    await ctx.reply(`🎯 I pick: <b>${escapeHtml(picked)}</b>`, { parse_mode: 'HTML' });
  });

  bot.command('hash', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /hash <text> or reply to a message'); return; }
    const md5 = crypto.createHash('md5').update(text).digest('hex');
    const sha1 = crypto.createHash('sha1').update(text).digest('hex');
    const sha256 = crypto.createHash('sha256').update(text).digest('hex');
    await ctx.reply(
      `🔒 <b>Hashes</b>\n\nMD5: <code>${md5}</code>\nSHA1: <code>${sha1}</code>\nSHA256: <code>${sha256}</code>`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('base64', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /base64 <text> to encode, or /base64 <encoded> to decode'); return; }
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(text) && text.length > 3;
    if (isBase64) {
      try {
        const decoded = Buffer.from(text, 'base64').toString('utf-8');
        if (/[\x00-\x08\x0E-\x1F]/.test(decoded)) throw new Error('binary');
        await ctx.reply(`📦 <b>Decoded:</b>\n<code>${escapeHtml(decoded)}</code>`, { parse_mode: 'HTML' });
      } catch {
        const encoded = Buffer.from(text).toString('base64');
        await ctx.reply(`📦 <b>Encoded:</b>\n<code>${encoded}</code>`, { parse_mode: 'HTML' });
      }
    } else {
      const encoded = Buffer.from(text).toString('base64');
      await ctx.reply(`📦 <b>Encoded:</b>\n<code>${encoded}</code>`, { parse_mode: 'HTML' });
    }
  });

  bot.command('color', async (ctx) => {
    const arg = (ctx.match?.toString() || '').trim();
    let hex: string;
    if (arg && /^#?[0-9A-Fa-f]{6}$/.test(arg)) {
      hex = arg.startsWith('#') ? arg : '#' + arg;
    } else {
      hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    await ctx.reply(
      `🎨 <b>Color</b>\n\nHEX: <code>${hex}</code>\nRGB: <code>${r}, ${g}, ${b}</code>`,
      { parse_mode: 'HTML' },
    );
  });
}
