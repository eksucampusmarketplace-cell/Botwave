/**
 * Fun extras: /roast, /compliment, /dare, /truth, /wouldyourather, /lyrics
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';

const ROASTS = [
  "You're the reason God created the middle finger.",
  "If you were any more inbred, you'd be a sandwich.",
  "You bring everyone so much joy... when you leave.",
  "I'd agree with you but then we'd both be wrong.",
  "You're proof that even evolution makes mistakes.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I'd explain it to you but I left my crayons at home.",
  "You're not stupid; you just have bad luck thinking.",
  "If laughter is the best medicine, your face must be curing the world.",
  "You're the human equivalent of a participation award.",
  "Somewhere out there, a tree is producing oxygen for you. I think you owe it an apology.",
  "You're about as useful as a screen door on a submarine.",
  "I'd roast you but my mom said I'm not allowed to burn trash.",
  "You're like a Monday — nobody likes you.",
  "If brains were dynamite, you wouldn't have enough to blow your nose.",
  "You're not the dumbest person in the world, but you'd better hope they don't die.",
  "I've seen smarter things than you at the bottom of my shoe.",
  "You're the reason shampoo has instructions.",
  "You bring everyone joy — some when you arrive, most when you leave.",
  "Your secrets are safe with me. I wasn't even listening.",
];

const COMPLIMENTS = [
  "You're more fun than a ball pit filled with candy.",
  "You're like sunshine on a rainy day.",
  "You have the best laugh. It's contagious!",
  "You're someone's reason to smile.",
  "You're even more beautiful on the inside than you are on the outside.",
  "You have the courage of your convictions.",
  "Being around you is like being on a happy vacation.",
  "You're more helpful than you realize.",
  "You make the world a better place just by being in it.",
  "You're a gift to those around you.",
  "You light up any room you walk into.",
  "You deserve a hug right now.",
  "You should be proud of yourself.",
  "You're making a difference in people's lives.",
  "Your energy is infectious in the best way.",
  "You're braver than you believe, stronger than you seem, and smarter than you think.",
  "The world needs more people like you.",
  "You're one of a kind — in the best possible way.",
  "Everything you do comes from a place of kindness.",
  "You have an amazing sense of humor!",
];

const DARES = [
  "Send a voice message singing your favorite song for 10 seconds.",
  "Change your profile picture to something funny for 1 hour.",
  "Send the last photo in your gallery (if appropriate).",
  "Type your next 3 messages with only your pinky fingers.",
  "Send a compliment to the person above your last message.",
  "Use only emojis for your next 5 messages.",
  "Share the most embarrassing song on your playlist.",
  "Send a message to this group every hour for the next 3 hours.",
  "Let someone else write your bio for 24 hours.",
  "Send a voice note whispering 'I love this group'.",
  "Post a selfie with the silliest face you can make.",
  "Write a short poem about the person who dared you.",
  "Use formal language for the rest of the day in this chat.",
  "React to every message in this chat for the next 10 minutes.",
  "Share a fun fact about yourself nobody here knows.",
];

const TRUTHS = [
  "What's the most embarrassing thing you've done in public?",
  "What's the biggest lie you've ever told?",
  "What's the weirdest thing you've ever eaten?",
  "What's your most controversial opinion?",
  "What's the last thing you searched on Google?",
  "What's the most childish thing you still do?",
  "Have you ever stalked someone on social media?",
  "What's the worst advice you've ever given?",
  "What's your guilty pleasure that nobody knows about?",
  "What's the most ridiculous fact you know?",
  "What's the most embarrassing thing in your phone right now?",
  "What's one thing you'd change about yourself?",
  "What's the last white lie you told?",
  "Who in this group do you think is the funniest?",
  "What's the most useless talent you have?",
];

const WOULD_YOU_RATHER = [
  "Would you rather have unlimited money or unlimited knowledge?",
  "Would you rather be able to fly or be invisible?",
  "Would you rather live without music or without movies?",
  "Would you rather never use social media again or never watch a movie again?",
  "Would you rather always be 10 minutes late or always be 20 minutes early?",
  "Would you rather have a rewind button or a pause button on your life?",
  "Would you rather live in the past or the future?",
  "Would you rather be the funniest person or the smartest person in the room?",
  "Would you rather give up coffee or give up your phone for a month?",
  "Would you rather speak every language fluently or play every instrument perfectly?",
  "Would you rather live without the internet or without AC/heating?",
  "Would you rather have a photographic memory or be able to forget anything you wanted?",
  "Would you rather explore space or explore the deep ocean?",
  "Would you rather always have to say everything on your mind or never speak again?",
  "Would you rather be famous but alone or unknown but have great friends?",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function registerFunExtrasHandlers(bot: Bot, _sessionId: string): void {
  bot.command('roast', async (ctx) => {
    if (!ctx.from) return;
    let target = ctx.from.first_name;
    if (ctx.message?.reply_to_message?.from) {
      target = ctx.message.reply_to_message.from.first_name;
    }
    const roast = randomFrom(ROASTS);
    await ctx.reply(`🔥 <b>${escapeHtml(target)}</b>, ${escapeHtml(roast)}`, { parse_mode: 'HTML' });
  });

  bot.command('compliment', async (ctx) => {
    if (!ctx.from) return;
    let target = ctx.from.first_name;
    if (ctx.message?.reply_to_message?.from) {
      target = ctx.message.reply_to_message.from.first_name;
    }
    const compliment = randomFrom(COMPLIMENTS);
    await ctx.reply(`💖 <b>${escapeHtml(target)}</b>, ${escapeHtml(compliment)}`, { parse_mode: 'HTML' });
  });

  bot.command('dare', async (ctx) => {
    const dare = randomFrom(DARES);
    await ctx.reply(`🎲 <b>Dare:</b> ${escapeHtml(dare)}`, { parse_mode: 'HTML' });
  });

  bot.command('truth', async (ctx) => {
    const truth = randomFrom(TRUTHS);
    await ctx.reply(`🤔 <b>Truth:</b> ${escapeHtml(truth)}`, { parse_mode: 'HTML' });
  });

  bot.command(['wyr', 'wouldyourather'], async (ctx) => {
    const wyr = randomFrom(WOULD_YOU_RATHER);
    await ctx.reply(`⚖️ <b>Would You Rather?</b>\n\n${escapeHtml(wyr)}`, { parse_mode: 'HTML' });
  });

  bot.command('lyrics', async (ctx) => {
    const query = (ctx.match?.toString() || '').trim();
    if (!query) {
      await ctx.reply('Usage: /lyrics <song name>\nExample: /lyrics Bohemian Rhapsody');
      return;
    }

    try {
      const searchUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(query.split('-')[0]?.trim() || query)}/${encodeURIComponent(query.split('-')[1]?.trim() || query)}`;
      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error('not found');
      const data = await res.json() as { lyrics?: string };
      if (!data.lyrics) throw new Error('no lyrics');

      const lyrics = data.lyrics.slice(0, 3500);
      await ctx.reply(
        `🎵 <b>Lyrics: ${escapeHtml(query)}</b>\n\n${escapeHtml(lyrics)}${data.lyrics.length > 3500 ? '\n\n<i>...truncated</i>' : ''}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply(
        `🎵 Could not find lyrics for "${escapeHtml(query)}".\n\nTry: /lyrics artist - song title\nExample: /lyrics Queen - Bohemian Rhapsody`,
        { parse_mode: 'HTML' },
      );
    }
  });

  bot.command('rate', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /rate <thing> or reply to a message'); return; }
    const score = Math.floor(Math.random() * 11);
    const stars = '⭐'.repeat(Math.ceil(score / 2)) + '☆'.repeat(5 - Math.ceil(score / 2));
    await ctx.reply(`📊 I rate <b>${escapeHtml(text.slice(0, 100))}</b>:\n\n${stars} <b>${score}/10</b>`, { parse_mode: 'HTML' });
  });

  bot.command('ship', async (ctx) => {
    if (!ctx.from) return;
    const target = ctx.message?.reply_to_message?.from;
    if (!target || target.id === ctx.from.id) {
      await ctx.reply('Reply to someone to ship with them! 💕');
      return;
    }
    const percent = Math.floor(Math.random() * 101);
    let emoji: string;
    if (percent >= 80) emoji = '💕🔥';
    else if (percent >= 50) emoji = '💖';
    else if (percent >= 30) emoji = '💛';
    else emoji = '💔';

    await ctx.reply(
      `${emoji} <b>Love Calculator</b>\n\n${escapeHtml(ctx.from.first_name)} x ${escapeHtml(target.first_name)}\n\n${'❤️'.repeat(Math.ceil(percent / 10))}${'🖤'.repeat(10 - Math.ceil(percent / 10))}\n\n<b>${percent}%</b> compatibility!`,
      { parse_mode: 'HTML' },
    );
  });
}
