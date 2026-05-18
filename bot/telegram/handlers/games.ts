/**
 * Games handler: trivia, word scramble, hangman, math quiz.
 * In-memory game state per chat for active sessions.
 */

import { Bot } from 'grammy';
import { getGroupConfig } from '../utils/db';

interface TriviaQuestion {
  question: string;
  answer: string;
  options: string[];
}

const TRIVIA: TriviaQuestion[] = [
  { question: 'What planet is known as the Red Planet?', answer: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { question: 'What is the largest ocean on Earth?', answer: 'Pacific', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
  { question: 'How many bones are in the human body?', answer: '206', options: ['206', '208', '204', '210'] },
  { question: 'What gas do plants absorb from the atmosphere?', answer: 'Carbon dioxide', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'] },
  { question: 'What is the chemical symbol for gold?', answer: 'Au', options: ['Go', 'Gd', 'Au', 'Ag'] },
  { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'] },
  { question: 'What is the fastest land animal?', answer: 'Cheetah', options: ['Lion', 'Cheetah', 'Leopard', 'Horse'] },
  { question: 'In what year did World War II end?', answer: '1945', options: ['1943', '1944', '1945', '1946'] },
  { question: 'What is the smallest country in the world?', answer: 'Vatican City', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'] },
  { question: 'How many sides does a hexagon have?', answer: '6', options: ['5', '6', '7', '8'] },
  { question: 'What is the hardest natural substance on Earth?', answer: 'Diamond', options: ['Gold', 'Iron', 'Diamond', 'Platinum'] },
  { question: 'Which planet has the most moons?', answer: 'Saturn', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'] },
  { question: 'What is the capital of Australia?', answer: 'Canberra', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'] },
  { question: 'What element does O represent on the periodic table?', answer: 'Oxygen', options: ['Gold', 'Oxygen', 'Osmium', 'Oganesson'] },
  { question: 'How many continents are there?', answer: '7', options: ['5', '6', '7', '8'] },
  { question: 'What is the largest mammal in the world?', answer: 'Blue whale', options: ['Elephant', 'Blue whale', 'Giraffe', 'Hippopotamus'] },
  { question: 'What language has the most native speakers?', answer: 'Mandarin Chinese', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'] },
  { question: 'What is the boiling point of water in Celsius?', answer: '100', options: ['90', '100', '110', '212'] },
  { question: 'Which organ is the largest in the human body?', answer: 'Skin', options: ['Liver', 'Skin', 'Brain', 'Heart'] },
  { question: 'What year was the first iPhone released?', answer: '2007', options: ['2005', '2006', '2007', '2008'] },
];

const WORD_LIST = [
  'ELEPHANT', 'PROGRAMMING', 'JAVASCRIPT', 'TELEGRAM', 'COMPUTER', 'KEYBOARD',
  'ALGORITHM', 'FUNCTION', 'DATABASE', 'NETWORK', 'SECURITY', 'DEVELOPER',
  'INTERFACE', 'VARIABLE', 'PROTOCOL', 'INTERNET', 'SOFTWARE', 'HARDWARE',
  'COMPILER', 'BROWSER', 'NOTEBOOK', 'UNIVERSE', 'LANGUAGE', 'DINOSAUR',
];

interface ActiveTrivia {
  question: TriviaQuestion;
  expiresAt: number;
}

interface ActiveScramble {
  original: string;
  scrambled: string;
  expiresAt: number;
}

interface ActiveMathQuiz {
  expression: string;
  answer: number;
  expiresAt: number;
}

const activeTrivia = new Map<string, ActiveTrivia>();
const activeScramble = new Map<string, ActiveScramble>();
const activeMath = new Map<string, ActiveMathQuiz>();

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word: string): string {
  let scrambled = word;
  let attempts = 0;
  while (scrambled === word && attempts < 20) {
    scrambled = shuffleArray(word.split('')).join('');
    attempts++;
  }
  return scrambled;
}

function generateMathProblem(): { expression: string; answer: number } {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 100) + 1;
      b = Math.floor(Math.random() * 100) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 100) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    default:
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }

  return { expression: `${a} ${op} ${b}`, answer };
}

export function registerGamesHandlers(bot: Bot, sessionId: string): void {
  bot.command('trivia', async (ctx) => {
    if (!ctx.chat) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.games_enabled) {
      await ctx.reply('Games are disabled. An admin can enable them from the Mini App.');
      return;
    }

    const chatKey = ctx.chat.id.toString();
    const existing = activeTrivia.get(chatKey);
    if (existing && Date.now() < existing.expiresAt) {
      await ctx.reply('A trivia question is already active! Answer it first.');
      return;
    }

    const q = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
    activeTrivia.set(chatKey, { question: q, expiresAt: Date.now() + 30000 });

    const shuffled = shuffleArray(q.options);
    const optionLines = shuffled.map((o, i) => `${['A', 'B', 'C', 'D'][i]}. ${o}`).join('\n');

    await ctx.reply(
      `🎯 <b>Trivia!</b>\n\n${q.question}\n\n${optionLines}\n\n<i>Reply with the correct answer within 30 seconds!</i>`,
      { parse_mode: 'HTML' },
    );

    setTimeout(() => {
      const game = activeTrivia.get(chatKey);
      if (game && Date.now() >= game.expiresAt) {
        activeTrivia.delete(chatKey);
        ctx.reply(`⏰ Time's up! The answer was: <b>${q.answer}</b>`, { parse_mode: 'HTML' }).catch(() => {});
      }
    }, 31000);
  });

  bot.command('scramble', async (ctx) => {
    if (!ctx.chat) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.games_enabled) {
      await ctx.reply('Games are disabled. An admin can enable them from the Mini App.');
      return;
    }

    const chatKey = ctx.chat.id.toString();
    const existing = activeScramble.get(chatKey);
    if (existing && Date.now() < existing.expiresAt) {
      await ctx.reply('A word scramble is already active! Solve it first.');
      return;
    }

    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const scrambled = scrambleWord(word);
    activeScramble.set(chatKey, { original: word, scrambled, expiresAt: Date.now() + 60000 });

    await ctx.reply(
      `🔀 <b>Word Scramble!</b>\n\nUnscramble this word:\n\n<code>${scrambled}</code>\n\nHint: ${word.length} letters\n<i>You have 60 seconds!</i>`,
      { parse_mode: 'HTML' },
    );

    setTimeout(() => {
      const game = activeScramble.get(chatKey);
      if (game && Date.now() >= game.expiresAt) {
        activeScramble.delete(chatKey);
        ctx.reply(`⏰ Time's up! The word was: <b>${word}</b>`, { parse_mode: 'HTML' }).catch(() => {});
      }
    }, 61000);
  });

  bot.command('mathquiz', async (ctx) => {
    if (!ctx.chat) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.games_enabled) {
      await ctx.reply('Games are disabled. An admin can enable them from the Mini App.');
      return;
    }

    const chatKey = ctx.chat.id.toString();
    const existing = activeMath.get(chatKey);
    if (existing && Date.now() < existing.expiresAt) {
      await ctx.reply('A math quiz is already active! Answer it first.');
      return;
    }

    const problem = generateMathProblem();
    activeMath.set(chatKey, { ...problem, expiresAt: Date.now() + 20000 });

    await ctx.reply(
      `🧮 <b>Math Quiz!</b>\n\nWhat is <code>${problem.expression}</code> ?\n\n<i>Reply with the answer within 20 seconds!</i>`,
      { parse_mode: 'HTML' },
    );

    setTimeout(() => {
      const game = activeMath.get(chatKey);
      if (game && Date.now() >= game.expiresAt) {
        activeMath.delete(chatKey);
        ctx.reply(`⏰ Time's up! The answer was: <b>${problem.answer}</b>`, { parse_mode: 'HTML' }).catch(() => {});
      }
    }, 21000);
  });

  // Answer detection for games
  bot.on('message:text', async (ctx) => {
    if (!ctx.chat || !ctx.from || !ctx.message?.text) return;
    const chatKey = ctx.chat.id.toString();
    const text = ctx.message.text.trim();

    // Trivia answer
    const trivia = activeTrivia.get(chatKey);
    if (trivia && Date.now() < trivia.expiresAt) {
      if (text.toLowerCase() === trivia.question.answer.toLowerCase()) {
        activeTrivia.delete(chatKey);
        await ctx.reply(`🎉 Correct, ${ctx.from.first_name}! The answer is <b>${trivia.question.answer}</b>!`, { parse_mode: 'HTML' });
        return;
      }
    }

    // Scramble answer
    const scramble = activeScramble.get(chatKey);
    if (scramble && Date.now() < scramble.expiresAt) {
      if (text.toUpperCase() === scramble.original) {
        activeScramble.delete(chatKey);
        await ctx.reply(`🎉 ${ctx.from.first_name} got it! The word was <b>${scramble.original}</b>!`, { parse_mode: 'HTML' });
        return;
      }
    }

    // Math answer
    const math = activeMath.get(chatKey);
    if (math && Date.now() < math.expiresAt) {
      const num = parseInt(text, 10);
      if (!isNaN(num) && num === math.answer) {
        activeMath.delete(chatKey);
        await ctx.reply(`🎉 ${ctx.from.first_name} is right! <code>${math.expression}</code> = <b>${math.answer}</b>`, { parse_mode: 'HTML' });
        return;
      }
    }
  });
}
