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
  "What's the most embarrassing song on your playlist?",
  "Have you ever pretended to like a gift?",
  "What's the pettiest thing you've ever done?",
  "What's the worst date you've ever been on?",
  "Have you ever read someone's messages without them knowing?",
  "What's something you've done that you'd judge someone else for?",
  "What's the most money you've wasted on something?",
  "Have you ever lied to get out of plans?",
  "What's your most unpopular opinion?",
  "What's the worst thing you've ever said behind someone's back?",
  "Have you ever had a crush on a friend's partner?",
  "What's the most embarrassing thing you've been caught doing?",
  "What's a habit you have that you're ashamed of?",
  "Have you ever cheated on a test?",
  "What's the longest you've stalked someone online?",
  "What's the dumbest thing you've ever argued about?",
  "Have you ever pretended to be sick to skip something?",
  "What's the most embarrassing autocorrect fail you've had?",
  "Who in this group chat annoys you the most?",
  "What's the worst fashion choice you've ever made?",
  "Have you ever ghosted someone?",
  "What's the meanest thing you've ever done to a sibling?",
  "What's a lie you told that got way out of hand?",
  "What's the most cringe thing you've posted on social media?",
  "Have you ever pretended to text to avoid someone?",
  "What's something you've never admitted to your parents?",
  "What's the most immature thing you still do?",
  "Have you ever been jealous of your best friend?",
  "What's the worst excuse you've ever given?",
  "What's a secret talent you have that nobody knows about?",
  "What's the most embarrassing nickname someone has given you?",
  "Have you ever accidentally sent a message to the wrong person?",
  "What's the weirdest food combination you enjoy?",
  "Who was your first crush and do they know?",
  "What's the longest you've gone without brushing your teeth?",
  "Have you ever been scared of a kid's movie?",
  "What's the most embarrassing thing in your camera roll?",
  "What's the worst haircut you've ever gotten?",
  "Have you ever returned a gift?",
  "What's a rumor you started or spread?",
  "What's the most trouble you got into at school?",
  "Have you ever blamed a fart on someone else?",
  "What's the biggest lie on your resume or profile?",
  "What app do you spend the most embarrassing amount of time on?",
  "Have you ever screenshotted a conversation to share with someone?",
  "What's the worst thing you've done while someone wasn't looking?",
  "Have you ever pretended to know something you didn't?",
  "What's the cringiest thing you've done to impress someone?",
  "Have you ever regifted something?",
  "What's the pettiest reason you've unfollowed someone?",
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
  "Send a voice note saying 'I'm the smartest person here' in a baby voice",
  "Post your battery percentage - if it's below 50%, you lose",
  "Send a screenshot of your most recent search history",
  "Type a message using only your nose",
  "Change your display name to 'I lost a dare' for 30 minutes",
  "Send the most recent emoji you used 50 times in a row",
  "Record yourself doing your best impression of a cat",
  "Send a voice note singing the national anthem",
  "Text 'I love you' to the 3rd contact in your phone",
  "Share your top 3 most used emojis",
  "Let the group pick your profile pic for 1 hour",
  "Send a voice note of you beatboxing",
  "Type your name with your elbow",
  "Send a selfie making your ugliest face",
  "Share the last YouTube video you watched",
  "Send a voice note laughing for 15 seconds straight",
  "Post a childhood photo in the group",
  "Text your best friend 'I know what you did' with no context",
  "Share your screen time for today",
  "Send a paragraph roasting yourself",
  "Record yourself doing 20 jumping jacks",
  "Send the oldest photo in your gallery",
  "Change your bio to something the group chooses for 1 hour",
  "Send a voice note in a British accent reading the last message",
  "Share the last song you listened to",
  "Text someone 'wrong number, sorry' then 'wait, are you still coming tonight?'",
  "Post a status the group writes for you",
  "Send a selfie from an unflattering angle",
  "Voice note yourself saying a tongue twister 5 times fast",
  "Share your most used app",
  "Let someone in the group post a story on your behalf",
  "Send a voice note whispering the alphabet backwards",
  "Share your recently deleted photos if any",
  "Message someone you haven't talked to in a year and say 'hey stranger'",
  "Share the first photo in your WhatsApp saved images",
  "Record yourself doing a 10-second dance",
  "Send a message using only song lyrics for the next 5 minutes",
  "Call someone and sing them happy birthday even if it's not their birthday",
  "Text your mom or dad 'we need to talk' and screenshot their response",
  "Share your alarm times",
  "Send a voice note of you rapping about the last meal you ate",
  "Post a no-filter, no-edit selfie right now",
  "Let the group choose your wallpaper for 24 hours",
  "Send a message to the last caller saying 'thanks for last night'",
  "Share the 10th photo in your gallery with no context",
  "Send a voice note talking like a robot for 20 seconds",
  "Record yourself saying 'I am beautiful and smart' 5 times with a straight face",
  "Share the weirdest meme on your phone",
  "Send your most used sticker 10 times",
  "Text 'I miss you' to the 7th contact in your phone",
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
    "You have a heart of gold.",
    "Your positive attitude is contagious.",
    "You make the world a brighter place.",
    "Your creativity knows no bounds.",
    "You have the power to make people smile without even trying.",
    "Your determination is truly inspiring.",
    "You're the kind of friend everyone deserves.",
    "Your laughter is the best sound in any room.",
    "You have an amazing ability to make others feel comfortable.",
    "Your confidence is magnetic.",
    "You're braver than you believe.",
    "Your intelligence shines through everything you do.",
    "You have the coolest sense of humor.",
    "Your work ethic is something to admire.",
    "You make even the toughest situations look manageable.",
    "Your presence alone can light up a room.",
    "You have a gift for making people feel special.",
    "Your resilience in tough times is remarkable.",
    "You're the definition of strength and grace.",
    "Your optimism is a superpower.",
    "You're the type of person who makes a difference just by being there.",
    "Your generosity has no limits.",
    "You have incredible taste in everything.",
    "Your ideas are always fresh and innovative.",
    "You're genuinely one of the kindest people out there.",
    "Your passion for life is infectious.",
    "You make everyone around you better just by being yourself.",
    "Your honesty is refreshing in a world full of noise.",
    "You have the rare ability to see the good in everyone.",
    "Your smile could power a city.",
    "You're the person everyone hopes to meet.",
    "Your voice could calm a storm.",
    "You're like a breath of fresh air on a stuffy day.",
    "Your wisdom beyond your years is impressive.",
    "You're proof that amazing people exist.",
    "Your empathy makes the world a kinder place.",
    "You have an incredible sense of style.",
    "Your energy is absolutely unmatched.",
    "You make complicated things look simple.",
    "Your loyalty is one of your greatest qualities.",
    "You're the human version of a warm hug.",
    "Your perspective always adds value to any conversation.",
    "You have the kind of personality that people write songs about.",
    "Your ambition is inspiring to everyone who knows you.",
    "You're like the sun - you brighten everyone's day.",
    "Your thoughtfulness never goes unnoticed.",
    "You have an old soul with a young heart.",
    "Your courage to be yourself is truly admirable.",
    "You're the glue that holds your friend group together.",
    "Your sense of adventure makes life more fun for everyone around you.",
  ];
  const target = args.length > 0 ? args.join(' ').replace(/@/g, '') : context.pushName || 'You';
  const compliment = compliments[Math.floor(Math.random() * compliments.length)];
  await sendReply(context.chatJid, `*${target}* - ${compliment}`, sock, context.rawMessage.key, context.queue);
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
    "Money is coming your way - just not the way you expect.",
    "Your next meal will be surprisingly good.",
    "A stranger will change your perspective today.",
    "You'll discover a hidden talent you didn't know you had.",
    "The risk you've been considering? Take it.",
    "Good news will arrive in an unexpected form.",
    "Your patience will be rewarded this month.",
    "Someone admires your strength more than you know.",
    "A new friendship will bring you joy.",
    "You're about to level up. Get ready.",
    "A pleasant surprise is waiting for you around the corner.",
    "Your talents will be recognized and suitably rewarded soon.",
    "The stars align in your favor this week. Make bold moves.",
    "A new hobby will bring unexpected joy into your life.",
    "Someone you admire secretly admires you back.",
    "A forgotten dream will resurface and guide your next steps.",
    "Your phone will ring with good news very soon.",
    "An old friend will reconnect with you when you least expect it.",
    "Financial prosperity is just around the corner. Keep working.",
    "Your next big break is closer than you think.",
    "A random act of kindness you do today will come back to you tenfold.",
    "The answer to your biggest question lies within you already.",
    "Tomorrow will bring clarity to something that's been confusing you.",
    "A compliment you give today will change someone's entire week.",
    "Your next meal will be the best one you've had in months.",
    "A change of scenery will spark incredible creativity.",
    "Someone is about to enter your life who will change everything.",
    "Your hard work behind the scenes is about to pay off publicly.",
    "A book or article you read soon will give you a life-changing insight.",
    "The universe is conspiring in your favor. Trust the process.",
    "Your gut feeling about that decision? Trust it. You're right.",
    "A technological discovery will make your life easier this month.",
    "The person you're thinking of right now is also thinking of you.",
    "Your positivity today will create a ripple effect that lasts weeks.",
    "An unexpected message will make your entire day.",
    "Your creative side is about to produce something amazing.",
    "A childhood memory will inspire your next great idea.",
    "Someone will ask for your advice soon. Your wisdom matters.",
    "A small investment today will grow into something significant.",
    "Your persistence is about to be rewarded in a big way.",
    "The weather this weekend will perfectly match your mood.",
    "A song you hear today will become your new favorite.",
    "Your next conversation will lead to an exciting opportunity.",
    "Something you lost will be found in an unexpected place.",
    "A dream you have tonight will contain an important message.",
    "Your patience with a difficult person will finally pay off.",
    "The next picture you take will be one you treasure forever.",
    "A challenge you face tomorrow will reveal a hidden strength.",
    "Your kindness to a stranger today will come full circle.",
    "The project you've been putting off? Start today. It'll flow easily.",
    "Your next adventure will create a memory that lasts a lifetime.",
    "A moment of silence today will bring you profound clarity.",
    "The risk you take this week will lead to incredible rewards.",
    "Someone you meet casually will become an important part of your story.",
    "Your next workout will give you an incredible runner's high.",
    "A forgotten skill will become useful again very soon.",
    "Your determination today plants seeds for tomorrow's success.",
    "The universe has big plans for you. Stay open to the signs.",
    "A piece of advice you receive this week will save you months of effort.",
    "Your next selfie will be your best one yet.",
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
    "A jiffy is an actual unit of time - 1/100th of a second.",
    "The average person spends 6 months of their lifetime waiting for red lights.",
    "It's physically impossible for pigs to look up at the sky.",
    "The inventor of the fire hydrant is unknown because the patent was destroyed in a fire.",
    "Wombat poop is cube-shaped.",
    "The dot over the letters 'i' and 'j' is called a 'tittle'.",
    "A group of porcupines is called a 'prickle'.",
    "Oxford University is older than the Aztec Empire.",
    "A bolt of lightning is five times hotter than the surface of the sun.",
    "The average cloud weighs about 1.1 million pounds.",
    "Scotland's national animal is the unicorn.",
    "Avocados are a fruit, not a vegetable.",
    "Humans share about 60% of their DNA with bananas.",
    "The total weight of all ants on Earth roughly equals the total weight of all humans.",
    "A flock of crows is called a 'murder'.",
    "Cleopatra lived closer to the Moon landing than to the building of the Great Pyramid.",
    "The shortest war in history lasted only 38 to 45 minutes.",
    "Honey is the only food that doesn't spoil.",
    "An octopus has three hearts and blue blood.",
    "There are more stars in the universe than grains of sand on all of Earth's beaches.",
    "Polar bear fur is actually transparent, not white.",
    "Sea otters hold hands while sleeping to keep from drifting apart.",
    "The longest hiccuping spree lasted 68 years.",
    "A sneeze can travel up to 100 miles per hour.",
    "Your nose can remember 50,000 different scents.",
    "Butterflies taste with their feet.",
    "The shortest commercial flight is only 57 seconds long.",
    "A single spaghetti noodle is called a 'spaghetto'.",
    "A group of jellyfish is called a 'smack'.",
    "Hot water freezes faster than cold water (Mpemba effect).",
    "Venus is the only planet that spins clockwise.",
    "Coca-Cola was originally green.",
    "The average person produces enough saliva to fill two swimming pools.",
    "Lightning strikes the Earth about 8 million times a day.",
    "The Mona Lisa has no eyebrows - it was fashionable in Renaissance Florence.",
    "A crocodile cannot stick its tongue out.",
    "There are more fake flamingos in the world than real ones.",
    "Astronauts cannot cry in space - no gravity for tears to flow.",
    "The strongest muscle in the human body is the tongue.",
    "Bananas are slightly radioactive due to their potassium content.",
    "A cat has 32 muscles in each ear.",
    "The average person walks the equivalent of five times around the world in a lifetime.",
    "Dolphins sleep with one eye open.",
    "The electric chair was invented by a dentist.",
    "Your fingerprint is unique - even identical twins have different fingerprints.",
    "Goldfish have a memory span of about 3 months, not 3 seconds.",
    "The human brain uses about 20% of the body's total energy.",
    "A small child could swim through the veins of a blue whale.",
    "There are more trees on Earth than stars in the Milky Way.",
    "Rubber bands last longer when refrigerated.",
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
    { q: "What has a neck but no head?", a: "A bottle" },
    { q: "What has words but never speaks?", a: "A book" },
    { q: "What can fill a room but takes up no space?", a: "Light" },
    { q: "What gets broken without being held?", a: "A promise" },
    { q: "What can you hold in your left hand but not in your right?", a: "Your right elbow" },
    { q: "What is always in front of you but can't be seen?", a: "The future" },
    { q: "I shave every day, but my beard stays the same. What am I?", a: "A barber" },
    { q: "What has legs but doesn't walk?", a: "A table" },
    { q: "What goes through cities and fields but never moves?", a: "A road" },
    { q: "I have branches but no fruit, trunk, or leaves. What am I?", a: "A bank" },
    { q: "What building has the most stories?", a: "A library" },
    { q: "What has 13 hearts but no other organs?", a: "A deck of cards" },
    { q: "If you drop me I'll crack, but smile and I'll smile back. What am I?", a: "A mirror" },
    { q: "The more of this there is, the less you see. What is it?", a: "Darkness" },
    { q: "David's father has three sons: Snap, Crackle, and ___?", a: "David" },
    { q: "I follow you everywhere but you can never touch me. What am I?", a: "Your shadow" },
    { q: "What has a thumb and four fingers but is not alive?", a: "A glove" },
    { q: "What can run but never walks, has a mouth but never talks?", a: "A river" },
    { q: "What has a ring but no finger?", a: "A phone" },
    { q: "What goes up and down stairs without moving?", a: "A carpet" },
    { q: "What has an eye but cannot see?", a: "A needle" },
    { q: "I'm light as a feather, but the strongest person can't hold me for long. What am I?", a: "Your breath" },
    { q: "What word becomes shorter when you add two letters?", a: "Short" },
    { q: "What has four wheels and flies?", a: "A garbage truck" },
    { q: "What starts with 'e' and ends with 'e' but only has one letter?", a: "An envelope" },
    { q: "What belongs to you but is used more by others?", a: "Your name" },
    { q: "What can be cracked, made, told, and played?", a: "A joke" },
    { q: "Where does today come before yesterday?", a: "In the dictionary" },
    { q: "What has keys but no locks?", a: "A keyboard" },
    { q: "What has a face and two hands but no arms or legs?", a: "A clock" },
    { q: "What has many needles but doesn't sew?", a: "A pine tree" },
    { q: "What runs all around a yard without moving?", a: "A fence" },
    { q: "I'm full of holes but I can still hold water. What am I?", a: "A sponge" },
    { q: "What is easy to get into but hard to get out of?", a: "Trouble" },
    { q: "What has a bed but never sleeps?", a: "A river" },
    { q: "What grows when you feed it but dies when you water it?", a: "Fire" },
    { q: "What has cities, mountains, and water but no houses, trees, or fish?", a: "A map" },
    { q: "I have keys but no doors. I have space but no rooms. You can enter but can't go inside. What am I?", a: "A keyboard" },
    { q: "What comes once in a minute, twice in a moment, but never in a thousand years?", a: "The letter M" },
    { q: "What can travel around the world while staying in one spot?", a: "A stamp" },
    { q: "What has a head, a tail, is brown, and has no legs?", a: "A penny" },
    { q: "What is so fragile that saying its name breaks it?", a: "Silence" },
    { q: "What is seen in the middle of March and April but not at the start or end?", a: "The letter R" },
    { q: "How many months have 28 days?", a: "All of them" },
    { q: "What word is spelled wrong in every dictionary?", a: "Wrong" },
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
