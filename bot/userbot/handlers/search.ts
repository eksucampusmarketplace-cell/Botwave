/**
 * Search & lookup handler for Telegram userbot.
 * Commands: .google, .wiki, .ud (urban dictionary), .weather, .crypto, .calc
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const googleHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const query = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!query) {
    await msg.edit({ text: '❌ Usage: .google <query>' });
    return;
  }

  await msg.edit({ text: `🔍 Searching: ${query}...` });
  await mediumPause();

  const encoded = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encoded}`;

  await msg.edit({
    text: `🔍 **Google Search**\nQuery: ${query}\n[Open Results](${url})`,
  });
};

export const wikiHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const query = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!query) {
    await msg.edit({ text: '❌ Usage: .wiki <topic>' });
    return;
  }

  await msg.edit({ text: `📖 Searching Wikipedia: ${query}...` });

  try {
    const encoded = encodeURIComponent(query);
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

    const https = await import('https');
    const data = await new Promise<string>((resolve, reject) => {
      https.get(apiUrl, { headers: { 'User-Agent': 'BotWaveUserbot/1.0' } }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      }).on('error', reject);
    });

    const result = JSON.parse(data);
    if (result.extract) {
      const summary = result.extract.length > 500
        ? result.extract.slice(0, 500) + '...'
        : result.extract;

      if (shouldShowTyping() && msg.chatId) {
        try {
          const { Api } = await import('telegram/tl');
          const peer = await client.getInputEntity(msg.chatId);
          await client.invoke(
            new Api.messages.SetTyping({
              peer,
              action: new Api.SendMessageTypingAction(),
            }),
          );
          await typingDelay(summary.length);
        } catch {}
      }

      await msg.edit({
        text: `📖 **${result.title}**\n\n${summary}\n\n[Read more](${result.content_urls?.desktop?.page || ''})`,
      });
    } else {
      await msg.edit({ text: `❌ No Wikipedia article found for "${query}".` });
    }
  } catch {
    await msg.edit({ text: '❌ Wikipedia lookup failed.' });
  }
};

export const calcHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const expr = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!expr) {
    await msg.edit({ text: '❌ Usage: .calc <expression>\nExample: .calc 2 + 2 * 3' });
    return;
  }

  try {
    // Safe math evaluation (no eval)
    const sanitized = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
    if (!sanitized) {
      await msg.edit({ text: '❌ Invalid expression.' });
      return;
    }

    const withPow = sanitized.replace(/\^/g, '**');
    const result = Function(`"use strict"; return (${withPow})`)();

    await shortPause();
    await msg.edit({ text: `🧮 \`${expr}\` = **${result}**` });
  } catch {
    await msg.edit({ text: '❌ Invalid expression.' });
  }
};

export const currencyHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (args.length < 3) {
    await msg.edit({ text: '❌ Usage: .currency <amount> <from> <to>\nExample: .currency 100 USD NGN' });
    return;
  }

  const amount = parseFloat(args[0]);
  const from = args[1].toUpperCase();
  const to = args[2].toUpperCase();

  if (isNaN(amount)) {
    await msg.edit({ text: '❌ Invalid amount.' });
    return;
  }

  await msg.edit({ text: `💱 Converting ${amount} ${from} → ${to}...` });

  try {
    const https = await import('https');
    const data = await new Promise<string>((resolve, reject) => {
      const url = `https://open.er-api.com/v6/latest/${from}`;
      https.get(url, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      }).on('error', reject);
    });

    const result = JSON.parse(data);
    if (result.rates && result.rates[to]) {
      const converted = (amount * result.rates[to]).toFixed(2);
      await shortPause();
      await msg.edit({
        text: `💱 **${amount} ${from}** = **${converted} ${to}**\nRate: 1 ${from} = ${result.rates[to].toFixed(4)} ${to}`,
      });
    } else {
      await msg.edit({ text: `❌ Currency ${to} not found.` });
    }
  } catch {
    await msg.edit({ text: '❌ Currency conversion failed.' });
  }
};

export const timeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  const now = new Date();
  const timezones: Record<string, number> = {
    'UTC': 0, 'GMT': 0, 'EST': -5, 'EDT': -4, 'CST': -6, 'CDT': -5,
    'MST': -7, 'MDT': -6, 'PST': -8, 'PDT': -7, 'IST': 5.5, 'JST': 9,
    'CET': 1, 'EET': 2, 'WAT': 1, 'CAT': 2, 'EAT': 3, 'SAST': 2,
    'AEST': 10, 'AEDT': 11, 'NZST': 12, 'NZDT': 13, 'SGT': 8, 'HKT': 8,
  };

  if (args[0] && timezones[args[0].toUpperCase()] !== undefined) {
    const tz = args[0].toUpperCase();
    const offset = timezones[tz];
    const tzTime = new Date(now.getTime() + offset * 3600_000);
    await shortPause();
    await msg.edit({
      text: `🕐 **${tz}:** ${tzTime.toISOString().replace('T', ' ').slice(0, 19)}`,
    });
  } else {
    const lines = ['🕐 **World Clock**'];
    const show = ['UTC', 'EST', 'PST', 'CET', 'IST', 'JST', 'WAT', 'AEST'];
    for (const tz of show) {
      const offset = timezones[tz];
      const tzTime = new Date(now.getTime() + offset * 3600_000);
      lines.push(`**${tz}:** ${tzTime.toISOString().replace('T', ' ').slice(11, 19)}`);
    }
    await shortPause();
    await msg.edit({ text: lines.join('\n') });
  }
};

export const searchHandlers: Record<string, HandlerFn> = {
  google: googleHandler,
  wiki: wikiHandler,
  calc: calcHandler,
  currency: currencyHandler,
  time: timeHandler,
};
