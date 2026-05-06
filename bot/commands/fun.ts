import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, pickResponse, axios } from './helpers';
import {
  jokePool,
  quotePool,
} from '../utils/responsePools';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';

async function sendJoke(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const joke = pickResponse(jokePool, vars, false);
  await sendReply(context.chatJid, joke, sock, context.rawMessage.key, context.queue);
}

async function sendQuote(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const quote = pickResponse(quotePool, vars, false);
  await sendReply(context.chatJid, quote, sock, context.rawMessage.key, context.queue);
}

async function handleMeme(context: MessageContext, sock: any): Promise<void> {
  try {
    const response = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
    const meme = response.data;
    if (!meme?.url || meme.nsfw) {
      await sendReply(context.chatJid, 'Could not fetch meme. Try again.', sock, context.rawMessage.key, context.queue);
      return;
    }
    const imageResponse = await axios.get(meme.url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(imageResponse.data);
    await sock.sendMessage(context.chatJid, {
      image: buffer,
      caption: `*${meme.title || 'Random Meme'}*\n\nr/${meme.subreddit || 'memes'} | ⬆️ ${meme.ups || 0}`,
    }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[MEME] Error:', error);
    await sendReply(context.chatJid, 'Meme machine broke. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function handle8Ball(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*MAGIC 8-BALL*\n\n!8ball [your question]\n\nAsk me anything and I\'ll predict the answer.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const responses = [
    '🎱 It is certain.',
    '🎱 It is decidedly so.',
    '🎱 Without a doubt.',
    '🎱 Yes, definitely.',
    '🎱 You may rely on it.',
    '🎱 As I see it, yes.',
    '🎱 Most likely.',
    '🎱 Outlook good.',
    '🎱 Yes.',
    '🎱 Signs point to yes.',
    '🎱 Reply hazy, try again.',
    '🎱 Ask again later.',
    '🎱 Better not tell you now.',
    '🎱 Cannot predict now.',
    '🎱 Concentrate and ask again.',
    '🎱 Don\'t count on it.',
    '🎱 My reply is no.',
    '🎱 My sources say no.',
    '🎱 Outlook not so good.',
    '🎱 Very doubtful.',
  ];
  const answer = responses[Math.floor(Math.random() * responses.length)];
  await sendReply(context.chatJid, `*Q:* ${args.join(' ')}\n\n${answer}`, sock, context.rawMessage.key, context.queue);
}

// ─── Truth or Dare ──────────────────────────────────────────────────────────

const truthQuestions = [
  "What's the most embarrassing thing you've done in public?",
  "What's a secret you've never told anyone?",
  "What's the worst lie you've ever told?",
  "Have you ever stalked someone on social media?",
  "What's the most childish thing you still do?",
  "What's the biggest misconception about you?",
  "What's the most trouble you've gotten into?",
  "If you could be invisible for a day, what would you do?",
  "What's the weirdest thing you've searched online?",
  "What's a skill you wish you had?",
  "What's the last thing you lied about?",
  "Who in this group would you swap lives with?",
  "What's the most embarrassing thing on your phone?",
  "What's your guilty pleasure?",
  "If you had to delete one app, which would it be?",
  "What's the longest you've gone without showering?",
  "What's the dumbest thing you've done for love?",
  "What's your biggest fear?",
  "Have you ever blamed someone else for something you did?",
  "What's the worst gift you've ever received?",
];

const dareList = [
  "Send a voice note singing your favorite song",
  "Change your profile picture to something funny for 1 hour",
  "Text your crush and screenshot it",
  "Post a status saying 'I love pineapple on pizza'",
  "Send a selfie with no filter right now",
  "Let someone in the group text from your phone for 2 minutes",
  "Record yourself doing 10 push-ups",
  "Send the last photo in your gallery",
  "Change your name in this group to 'I Lost a Dare'",
  "Send a voice note in a fake accent",
  "Type with your eyes closed: 'I am the smartest person here'",
  "Send your screen time report",
  "Make your status 'Looking for love' for 30 minutes",
  "Send a paragraph complimenting the person above you",
  "Use only emojis for the next 5 messages",
  "Call someone random and say 'I just wanted to hear your voice'",
  "Send the 5th photo in your gallery with no context",
  "Record yourself saying a tongue twister 3 times fast",
  "Let the group choose your status for 1 hour",
  "Send a message to the last person you texted saying 'We need to talk'",
];

async function handleTruth(context: MessageContext, sock: any): Promise<void> {
  const truth = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
  await sendReply(context.chatJid, `*TRUTH*\n\n${truth}`, sock, context.rawMessage.key, context.queue);
}

async function handleDare(context: MessageContext, sock: any): Promise<void> {
  const dare = dareList[Math.floor(Math.random() * dareList.length)];
  await sendReply(context.chatJid, `*DARE*\n\n${dare}`, sock, context.rawMessage.key, context.queue);
}

// ─── Ship / Love Compatibility ──────────────────────────────────────────────

async function handleShip(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 2) {
    await sendReply(context.chatJid, '*LOVE SHIP*\n\n!ship [name1] [name2]\n\nExample: !ship John Mary', sock, context.rawMessage.key, context.queue);
    return;
  }
  const name1 = args[0].replace('@', '');
  const name2 = args.slice(1).join(' ').replace('@', '');

  // Generate deterministic-ish percentage from names
  const combined = (name1 + name2).toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  const percentage = Math.abs(hash % 101);

  let hearts = '';
  let verdict = '';
  if (percentage >= 90) { hearts = '❤️🔥❤️🔥❤️'; verdict = 'SOULMATES! Made for each other!'; }
  else if (percentage >= 70) { hearts = '❤️❤️❤️❤️'; verdict = 'Strong connection! Great match!'; }
  else if (percentage >= 50) { hearts = '❤️❤️❤️'; verdict = 'There\'s potential here...'; }
  else if (percentage >= 30) { hearts = '💛💛'; verdict = 'Maybe just friends...'; }
  else if (percentage >= 10) { hearts = '💔'; verdict = 'It\'s not looking good...'; }
  else { hearts = '💀'; verdict = 'Absolutely not. Run.'; }

  const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

  await sendReply(
    context.chatJid,
    `*LOVE CALCULATOR*\n\n${name1} × ${name2}\n\n${hearts}\n[${bar}] ${percentage}%\n\n${verdict}`,
    sock, context.rawMessage.key, context.queue,
  );
}

async function handleCompliment(context: MessageContext, args: string[], sock: any): Promise<void> {
  const compliments = [
    "You're the type of person everyone needs in their life.",
    "Your energy lights up every room you walk into.",
    "If everyone was like you, the world would be a better place.",
    "You make difficult things look easy.",
    "Your smile could end wars.",
    "You're proof that good things exist.",
    "The world is a better place because you're in it.",
    "You have the best laugh.",
    "You're someone's reason to smile.",
    "Your kindness is a balm to everyone who encounters it.",
    "You're more helpful than you realize.",
    "You bring out the best in other people.",
    "Your ability to recall random facts is impressive.",
    "You're like a ray of sunshine on a cloudy day.",
    "You're the friend everyone wishes they had.",
    "Everything seems brighter when you're around.",
    "You're one of a kind. Literally.",
    "You have impeccable taste.",
    "Your potential is limitless.",
    "You could survive a zombie apocalypse. Easily.",
  ];
  const target = args.length > 0 ? args.join(' ').replace(/@/g, '') : context.pushName || 'You';
  const compliment = compliments[Math.floor(Math.random() * compliments.length)];
  await sendReply(context.chatJid, `*${target}* — ${compliment}`, sock, context.rawMessage.key, context.queue);
}

async function handleFortune(context: MessageContext, sock: any): Promise<void> {
  const fortunes = [
    "A beautiful, smart, and loving person will come into your life... after you click this message.",
    "Your hard work will pay off. Not today, but soon.",
    "An unexpected opportunity will arise. Say yes.",
    "Someone is thinking about you right now.",
    "A great adventure awaits you this week.",
    "The answer you're looking for is closer than you think.",
    "Trust your instincts. They haven't failed you yet.",
    "A friend will surprise you with kindness.",
    "Your creativity will solve a major problem soon.",
    "Stop overthinking. The answer is simple.",
    "Money is coming your way — just not the way you expect.",
    "Your next meal will be surprisingly good.",
    "A stranger will change your perspective today.",
    "You'll discover a hidden talent you didn't know you had.",
    "The risk you've been considering? Take it.",
    "Good news will arrive in an unexpected form.",
    "Your patience will be rewarded this month.",
    "Someone admires your strength more than you know.",
    "A new friendship will bring you joy.",
    "You're about to level up. Get ready.",
  ];
  const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  const luckyNumber = Math.floor(Math.random() * 99) + 1;
  await sendReply(context.chatJid, `*FORTUNE COOKIE*\n\n${fortune}\n\nLucky number: ${luckyNumber}`, sock, context.rawMessage.key, context.queue);
}

async function handleFact(context: MessageContext, sock: any): Promise<void> {
  try {
    // Try uselessfacts API first
    const response = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 8000 });
    if (response.data?.text) {
      await sendReply(context.chatJid, `*DID YOU KNOW?*\n\n${response.data.text}`, sock, context.rawMessage.key, context.queue);
      return;
    }
  } catch {
    // Fallback to local facts
  }

  const facts = [
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.",
    "Octopuses have three hearts, nine brains, and blue blood.",
    "A group of flamingos is called a 'flamboyance'.",
    "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
    "Bananas are berries, but strawberries aren't.",
    "The Eiffel Tower can grow up to 6 inches taller in summer due to heat expansion.",
    "A single cloud can weigh more than 1 million pounds.",
    "There are more possible chess games than atoms in the observable universe.",
    "Cows have best friends and get stressed when separated.",
    "The inventor of the Pringles can is buried in one.",
    "A day on Venus is longer than a year on Venus.",
    "Sharks are older than trees. Sharks: 400M years. Trees: 350M years.",
    "The world's largest desert is Antarctica, not the Sahara.",
    "Human teeth are as strong as shark teeth.",
    "An average person walks about 100,000 miles in their lifetime.",
  ];
  const fact = facts[Math.floor(Math.random() * facts.length)];
  await sendReply(context.chatJid, `*DID YOU KNOW?*\n\n${fact}`, sock, context.rawMessage.key, context.queue);
}

async function handleRiddle(context: MessageContext, sock: any): Promise<void> {
  const riddles = [
    { q: "What has keys but no locks?", a: "A piano" },
    { q: "What gets wetter the more it dries?", a: "A towel" },
    { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", a: "An echo" },
    { q: "What has a head and tail but no body?", a: "A coin" },
    { q: "What can travel around the world while staying in a corner?", a: "A stamp" },
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
    { q: "What has many teeth but can't bite?", a: "A comb" },
    { q: "I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?", a: "A map" },
    { q: "What can you catch but not throw?", a: "A cold" },
    { q: "What has hands but can't clap?", a: "A clock" },
    { q: "I'm tall when I'm young and short when I'm old. What am I?", a: "A candle" },
    { q: "What begins with T, ends with T, and has T in it?", a: "A teapot" },
    { q: "What has one eye but can't see?", a: "A needle" },
    { q: "What goes up but never comes down?", a: "Your age" },
    { q: "What invention lets you look right through a wall?", a: "A window" },
  ];
  const riddle = riddles[Math.floor(Math.random() * riddles.length)];
  await sendReply(
    context.chatJid,
    `*RIDDLE*\n\n${riddle.q}\n\n_Reply with your answer! The answer will be revealed in 30 seconds..._`,
    sock, context.rawMessage.key, context.queue,
  );

  // Reveal answer after 30 seconds
  setTimeout(async () => {
    try {
      await sendReply(context.chatJid, `*ANSWER:* ${riddle.a}`, sock, context.rawMessage.key, context.queue);
    } catch {
      // Ignore errors in delayed sends
    }
  }, 30000);
}

// ─── Register Fun Commands ───────────────────────────────────────────────────

registerCommand({ name: 'joke', aliases: ['joke', 'jokes', 'funny'], category: 'fun', description: 'Get a random joke', execute: (ctx, _a, sock, vars) => sendJoke(ctx, sock, vars) });
registerCommand({ name: 'quote', aliases: ['quote', 'quotes', 'q', 'inspire', 'motivation'], category: 'fun', description: 'Get an inspirational quote', execute: (ctx, _a, sock, vars) => sendQuote(ctx, sock, vars) });
registerCommand({ name: 'meme', aliases: ['meme', 'memes'], category: 'fun', description: 'Get a random meme', execute: (ctx, _a, sock) => handleMeme(ctx, sock) });
registerCommand({ name: '8ball', aliases: ['8ball', 'eightball', 'magic', 'magic8ball'], category: 'fun', description: 'Ask the magic 8-ball', execute: (ctx, args, sock) => handle8Ball(ctx, args, sock) });
registerCommand({ name: 'truth', aliases: ['truth'], category: 'fun', description: 'Get a truth question', execute: (ctx, _a, sock) => handleTruth(ctx, sock) });
registerCommand({ name: 'dare', aliases: ['dare'], category: 'fun', description: 'Get a dare challenge', execute: (ctx, _a, sock) => handleDare(ctx, sock) });
registerCommand({ name: 'ship', aliases: ['ship', 'love'], category: 'fun', description: 'Ship two people', execute: (ctx, args, sock) => handleShip(ctx, args, sock) });
registerCommand({ name: 'compliment', aliases: ['compliment', 'comp'], category: 'fun', description: 'Get a compliment', execute: (ctx, args, sock) => handleCompliment(ctx, args, sock) });
registerCommand({ name: 'fortune', aliases: ['fortune', 'cookie'], category: 'fun', description: 'Get a fortune cookie', execute: (ctx, _a, sock) => handleFortune(ctx, sock) });
registerCommand({ name: 'fact', aliases: ['fact', 'facts'], category: 'fun', description: 'Get a random fact', execute: (ctx, _a, sock) => handleFact(ctx, sock) });
registerCommand({ name: 'riddle', aliases: ['riddle', 'riddles'], category: 'fun', description: 'Get a riddle', execute: (ctx, _a, sock) => handleRiddle(ctx, sock) });
