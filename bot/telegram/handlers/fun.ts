/**
 * Fun commands: joke, quote, dice, coin, 8ball, afk, back, choose, roll.
 */

import { Bot } from 'grammy';
import { mentionUser } from '../utils/format';
import { setAfk, getAfk, removeAfk } from '../utils/db';

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a fake noodle? An impasta!",
  "Why did the bicycle fall over? Because it was two-tired!",
  "What do you call a bear with no teeth? A gummy bear!",
  "I'm on a seafood diet. I see food and I eat it.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "I told a chemistry joke but got no reaction.",
  "Why do cows have hooves instead of feet? Because they lactose.",
  "What do you call a dog that does magic? A Labracadabrador!",
  "I'm terrified of elevators, so I'm going to start taking steps to avoid them.",
  "What do you call a sleeping dinosaur? A dino-snore!",
  "I couldn't figure out how to put my seatbelt on. Then it clicked.",
  "Why do bees have sticky hair? Because they use honeycombs.",
  "What did one wall say to the other? I'll meet you at the corner!",
  "How does a penguin build its house? Igloos it together!",
];

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Zig Ziglar" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
];

const EIGHTBALL_RESPONSES = [
  "🔮 It is certain.",
  "🔮 Without a doubt.",
  "🔮 You may rely on it.",
  "🔮 Yes, definitely.",
  "🔮 It is decidedly so.",
  "🔮 As I see it, yes.",
  "🔮 Most likely.",
  "🔮 Yes.",
  "🔮 Outlook good.",
  "🔮 Signs point to yes.",
  "🔮 Reply hazy, try again.",
  "🔮 Better not tell you now.",
  "🔮 Ask again later.",
  "🔮 Cannot predict now.",
  "🔮 Concentrate and ask again.",
  "🔮 Don't count on it.",
  "🔮 My reply is no.",
  "🔮 My sources say no.",
  "🔮 Outlook not so good.",
  "🔮 Very doubtful.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function registerFunHandlers(bot: Bot, sessionId: string): void {
  bot.command('joke', async (ctx) => {
    await ctx.reply(`😂 ${randomItem(JOKES)}`);
  });

  bot.command('quote', async (ctx) => {
    const q = randomItem(QUOTES);
    await ctx.reply(
      `💬 <i>"${q.text}"</i>\n\n— <b>${q.author}</b>`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('dice', async (ctx) => {
    const result = Math.floor(Math.random() * 6) + 1;
    await ctx.reply(`🎲 You rolled: <b>${result}</b>`, { parse_mode: 'HTML' });
  });

  bot.command('coin', async (ctx) => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await ctx.reply(`🪙 ${result}!`);
  });

  bot.command('8ball', async (ctx) => {
    const question = (ctx.match?.toString() || '').trim();
    if (!question) {
      await ctx.reply('Usage: /8ball <question>');
      return;
    }
    await ctx.reply(randomItem(EIGHTBALL_RESPONSES));
  });

  bot.command('choose', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply('Usage: /choose option1 | option2 | option3');
      return;
    }
    const options = text.split('|').map(o => o.trim()).filter(Boolean);
    if (options.length < 2) {
      await ctx.reply('Provide at least 2 options separated by |');
      return;
    }
    await ctx.reply(`🤔 I choose: <b>${randomItem(options)}</b>`, { parse_mode: 'HTML' });
  });

  bot.command('roll', async (ctx) => {
    const max = parseInt(ctx.match?.toString() || '100', 10) || 100;
    const result = Math.floor(Math.random() * max) + 1;
    await ctx.reply(`🎯 You rolled: <b>${result}</b> (1-${max})`, { parse_mode: 'HTML' });
  });

  bot.command('afk', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    const reason = (ctx.match?.toString() || '').trim() || 'No reason';
    await setAfk(sessionId, ctx.chat.id.toString(), ctx.from.id.toString(), reason);
    await ctx.reply(`😴 ${ctx.from.first_name} is now AFK: ${reason}`);
  });

  bot.command('back', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    const afk = await getAfk(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
    if (afk) {
      await removeAfk(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
      const duration = Math.floor((Date.now() - new Date(afk.since).getTime()) / 1000);
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      await ctx.reply(`👋 Welcome back, ${ctx.from.first_name}! You were AFK for ${mins}m ${secs}s.`);
    } else {
      await ctx.reply(`You weren't AFK!`);
    }
  });

  // AFK mention detection — reply-based and @username-based
  bot.on('message:text', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    // Check if replying to an AFK user
    if (ctx.message?.reply_to_message?.from) {
      const repliedUser = ctx.message.reply_to_message.from;
      const afk = await getAfk(sessionId, ctx.chat.id.toString(), repliedUser.id.toString());
      if (afk) {
        const duration = Math.floor((Date.now() - new Date(afk.since).getTime()) / 1000);
        const mins = Math.floor(duration / 60);
        await ctx.reply(
          `😴 ${repliedUser.first_name} is AFK (${mins}m ago): ${afk.reason}`,
        );
      }
    }

    // Check @username mentions in text
    const mentions = ctx.message?.entities?.filter(e => e.type === 'mention') || [];
    for (const entity of mentions) {
      const mentionedUsername = ctx.message.text?.substring(entity.offset + 1, entity.offset + entity.length);
      if (mentionedUsername) {
        // We can't directly resolve username to user_id without extra API calls,
        // but text_mention entities include the user object
      }
    }

    // Check text_mention entities (these include user objects)
    const textMentions = ctx.message?.entities?.filter(e => e.type === 'text_mention') || [];
    for (const entity of textMentions) {
      if (entity.user) {
        const afk = await getAfk(sessionId, ctx.chat.id.toString(), entity.user.id.toString());
        if (afk) {
          const duration = Math.floor((Date.now() - new Date(afk.since).getTime()) / 1000);
          const mins = Math.floor(duration / 60);
          await ctx.reply(
            `😴 ${entity.user.first_name} is AFK (${mins}m ago): ${afk.reason}`,
          );
        }
      }
    }

    // Remove own AFK if they send a message
    const ownAfk = await getAfk(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
    if (ownAfk) {
      await removeAfk(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
      await ctx.reply(`👋 Welcome back, ${ctx.from.first_name}!`);
    }
  });
}
