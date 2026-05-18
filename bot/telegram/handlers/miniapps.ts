/**
 * Mini Apps handler: Telegram WebApp games and interactive features.
 * Ported from Nexus bot reference implementation.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';

interface MiniApp {
  id: string;
  name: string;
  emoji: string;
  description: string;
  path: string;
}

const MINI_APPS: MiniApp[] = [
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    emoji: '❌⭕',
    description: 'Classic Tic Tac Toe game',
    path: '/miniapp/tictactoe.html',
  },
  {
    id: 'trivia',
    name: 'Trivia Quiz',
    emoji: '🧠',
    description: 'Test your knowledge',
    path: '/miniapp/trivia.html',
  },
  {
    id: 'memory',
    name: 'Memory Game',
    emoji: '🃏',
    description: 'Match the cards',
    path: '/miniapp/memory.html',
  },
  {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    description: 'Classic Snake game',
    path: '/miniapp/snake.html',
  },
  {
    id: 'math',
    name: 'Math Challenge',
    emoji: '🔢',
    description: 'Solve math problems',
    path: '/miniapp/math.html',
  },
  {
    id: 'wordscramble',
    name: 'Word Scramble',
    emoji: '🔤',
    description: 'Unscramble the word',
    path: '/miniapp/wordscramble.html',
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    emoji: '✊✋✌️',
    description: 'Play against the bot',
    path: '/miniapp/rps.html',
  },
  {
    id: '2048',
    name: '2048',
    emoji: '🔢',
    description: 'Combine tiles to reach 2048',
    path: '/miniapp/2048.html',
  },
];

function getAppUrl(baseUrl: string, app: MiniApp): string {
  return `${baseUrl}${app.path}`;
}

export function registerMiniAppsHandlers(bot: Bot, sessionId: string): void {
  bot.command(['games', 'mgame', 'multiplayer'], async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const baseUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';

    if (!baseUrl) {
      await ctx.reply('❌ Mini apps base URL not configured. Use /setgamesurl to set it.');
      return;
    }

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < MINI_APPS.length; i += 2) {
      const app1 = MINI_APPS[i];
      const app2 = MINI_APPS[i + 1];

      keyboard.webApp(`${app1.emoji} ${app1.name}`, getAppUrl(baseUrl, app1));
      if (app2) {
        keyboard.webApp(`${app2.emoji} ${app2.name}`, getAppUrl(baseUrl, app2));
      }
      keyboard.row();
    }

    await ctx.reply(
      `🎮 <b>Mini Apps & Games</b>\n\nChoose a game to play:`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  });

  bot.command('game', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const baseUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';

    if (!baseUrl) {
      await ctx.reply('❌ Mini apps base URL not configured.');
      return;
    }

    const gameId = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!gameId) {
      const list = MINI_APPS.map(a => `• <code>${a.id}</code> - ${a.emoji} ${a.name}`).join('\n');
      await ctx.reply(
        `Usage: /game <id>\n\nAvailable games:\n${list}`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const app = MINI_APPS.find(a => a.id === gameId);
    if (!app) {
      await ctx.reply(`❌ Game "${gameId}" not found. Use /games to see available games.`);
      return;
    }

    const keyboard = new InlineKeyboard()
      .webApp(`${app.emoji} Play ${app.name}`, getAppUrl(baseUrl, app));

    await ctx.reply(
      `${app.emoji} <b>${app.name}</b>\n${app.description}`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  });

  bot.command('setgamesurl', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const url = (ctx.match?.toString() || '').trim();
    if (!url) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      const current = config.miniapp_base_url || 'Not set';
      await ctx.reply(
        `🎮 <b>Mini Apps URL</b>\n\nCurrent: <code>${current}</code>\n\nUsage: /setgamesurl <base_url>`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    await updateTelegramConfig(sessionId, { miniapp_base_url: url });
    await ctx.reply(`✅ Mini apps base URL set to: <code>${url}</code>`, { parse_mode: 'HTML' });
  });
}
