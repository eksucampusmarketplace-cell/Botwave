/**
 * Fun & games handler for Telegram userbot.
 * Commands: .dice, .dart, .slot, .basketball, .football, .bowling,
 *           .coinflip, .rng, .8ball, .rate, .pp, .decide, .roll
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

const EIGHT_BALL_RESPONSES = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.',
  'Yes – definitely.', 'You may rely on it.', 'As I see it, yes.',
  'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', 'Concentrate and ask again.',
  "Don't count on it.", 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.',
];

export const diceHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '🎲' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const dartHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '🎯' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const slotHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '🎰' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const basketballHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '🏀' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const footballHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '⚽' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const bowlingHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();
  try {
    const peer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.messages.SendMedia({
        peer,
        media: new Api.InputMediaDice({ emoticon: '🎳' }),
        message: '',
        randomId: BigInt(Math.floor(Math.random() * 1e15)),
      }),
    );
    await msg.delete({ revoke: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const coinflipHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  await shortPause();
  const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
  await msg.edit({ text: `Coin flip: **${result}**` });
};

export const rngHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let min = 1;
  let max = 100;

  if (args.length >= 2) {
    min = parseInt(args[0], 10) || 1;
    max = parseInt(args[1], 10) || 100;
  } else if (args.length === 1) {
    max = parseInt(args[0], 10) || 100;
  }

  if (min > max) [min, max] = [max, min];

  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  await shortPause();
  await msg.edit({ text: `🎲 Random (${min}-${max}): **${result}**` });
};

export const eightBallHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const question = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!question) {
    await msg.edit({ text: '❌ Ask a question: .8ball <question>' });
    return;
  }

  await mediumPause();
  const answer = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];
  await msg.edit({ text: `🎱 **${answer}**` });
};

export const rateHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const thing = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!thing) {
    await msg.edit({ text: '❌ Usage: .rate <thing>' });
    return;
  }

  const rating = Math.floor(Math.random() * 101);
  await shortPause();
  await msg.edit({ text: `I rate **${thing}**: ${rating}/100 ${'⭐'.repeat(Math.ceil(rating / 20))}` });
};

export const ppHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const size = Math.floor(Math.random() * 12) + 1;
  const pp = '8' + '='.repeat(size) + 'D';
  await shortPause();
  await msg.edit({ text: pp });
};

export const decideHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const choices = (msg.text || '').split(/\s+/).slice(1).join(' ').split(/[,|]/);

  if (choices.length < 2) {
    await msg.edit({ text: '❌ Usage: .decide option1, option2, option3' });
    return;
  }

  const choice = choices[Math.floor(Math.random() * choices.length)].trim();
  await mediumPause();
  await msg.edit({ text: `🤔 I choose: **${choice}**` });
};

export const rollHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  let dice = 1;
  let sides = 6;

  if (args[0]) {
    const match = args[0].match(/^(\d+)?d(\d+)$/i);
    if (match) {
      dice = parseInt(match[1] || '1', 10);
      sides = parseInt(match[2], 10);
    } else {
      sides = parseInt(args[0], 10) || 6;
    }
  }

  dice = Math.min(dice, 20);
  sides = Math.min(sides, 1000);

  const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0);

  await shortPause();
  if (dice === 1) {
    await msg.edit({ text: `🎲 Rolled d${sides}: **${total}**` });
  } else {
    await msg.edit({ text: `🎲 Rolled ${dice}d${sides}: [${rolls.join(', ')}] = **${total}**` });
  }
};

export const funHandlers: Record<string, HandlerFn> = {
  dice: diceHandler,
  dart: dartHandler,
  slot: slotHandler,
  basketball: basketballHandler,
  football: footballHandler,
  bowling: bowlingHandler,
  coinflip: coinflipHandler,
  rng: rngHandler,
  '8ball': eightBallHandler,
  rate: rateHandler,
  pp: ppHandler,
  decide: decideHandler,
  roll: rollHandler,
};
