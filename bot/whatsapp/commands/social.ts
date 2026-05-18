import { registerCommand, getCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, getQuotedMessage, delay } from './helpers';
import { getAfkState, setAfkState } from '../../database';
import Redis from 'ioredis';
import crypto from 'crypto';

// ─── In-Memory Stores ───────────────────────────────────────────────────────

// Ghost mode: userJid -> delete delay in seconds
const ghostTimers = new Map<string, number>();

// Alias store: userJid -> Map<alias, expandedCommand>
// Backed by Redis for persistence across restarts.
const aliasStore = new Map<string, Map<string, string>>();
const ALIAS_REDIS_PREFIX = 'botwave:alias:';

let aliasRedis: Redis | null = null;
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    aliasRedis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1, retryStrategy(t) { return t > 3 ? null : Math.min(t * 200, 2000); } });
    aliasRedis.on('error', () => {});
  } catch { /* Redis unavailable, in-memory only */ }
}

async function loadAliasesFromRedis(userJid: string): Promise<Map<string, string>> {
  if (!aliasRedis) return new Map();
  try {
    const data = await aliasRedis.get(`${ALIAS_REDIS_PREFIX}${userJid}`);
    if (data) return new Map(Object.entries(JSON.parse(data)));
  } catch { /* ignore */ }
  return new Map();
}

async function saveAliasesToRedis(userJid: string, aliases: Map<string, string>): Promise<void> {
  if (!aliasRedis) return;
  try {
    if (aliases.size === 0) {
      await aliasRedis.del(`${ALIAS_REDIS_PREFIX}${userJid}`);
    } else {
      await aliasRedis.set(`${ALIAS_REDIS_PREFIX}${userJid}`, JSON.stringify(Object.fromEntries(aliases)));
    }
  } catch { /* ignore */ }
}

// React rules: chatJid -> [{ pattern, emoji, addedBy }]
const reactRules = new Map<string, Array<{ pattern: string; emoji: string; addedBy: string }>>();

// Deadman switches: userJid -> { message, targetJid, timeoutMs, timeout }
const deadmanStore = new Map<string, {
  message: string;
  targetJid: string;
  timeoutMs: number;
  timeout: ReturnType<typeof setTimeout>;
  createdAt: number;
}>();

// Message history cache for !recap and !spy
const messageCache = new Map<string, Array<{
  sender: string;
  senderName: string;
  text: string;
  timestamp: number;
}>>();
const MAX_CACHE_PER_CHAT = 500;

// Birthday store: key "sessionId:userJid" -> { month, day, name }
const birthdayStore = new Map<string, { month: number; day: number; name: string }>();

// ─── Exports for MessageHandler Hooks ────────────────────────────────────────

export function cacheMessage(chatJid: string, senderJid: string, senderName: string, text: string): void {
  if (!messageCache.has(chatJid)) {
    messageCache.set(chatJid, []);
  }
  const cache = messageCache.get(chatJid)!;
  cache.push({ sender: senderJid, senderName, text, timestamp: Date.now() });
  if (cache.length > MAX_CACHE_PER_CHAT) {
    cache.splice(0, cache.length - MAX_CACHE_PER_CHAT);
  }
}

export function checkReactRules(chatJid: string, text: string): string | null {
  const rules = reactRules.get(chatJid);
  if (!rules || rules.length === 0) return null;
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      return rule.emoji;
    }
  }
  return null;
}

export async function expandAlias(userJid: string, command: string): Promise<string | null> {
  let userAliases = aliasStore.get(userJid);
  if (!userAliases) {
    userAliases = await loadAliasesFromRedis(userJid);
    if (userAliases.size > 0) aliasStore.set(userJid, userAliases);
  }
  if (!userAliases || userAliases.size === 0) return null;
  return userAliases.get(command.toLowerCase()) || null;
}

export function getGhostDelay(userJid: string): number | null {
  return ghostTimers.get(userJid) ?? null;
}

// ─── !afk - Away From Keyboard ──────────────────────────────────────────────

async function handleAfk(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'AFK requires an active session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = args[0]?.toLowerCase();

  if (sub === 'off' || sub === 'back' || sub === 'clear') {
    await setAfkState(context.sessionId, context.senderJid, false);
    await sendReply(context.chatJid, 'Welcome back! AFK mode disabled.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const reason = args.join(' ') || undefined;
  await setAfkState(context.sessionId, context.senderJid, true, reason);
  await sendReply(
    context.chatJid,
    `*AFK MODE ON*\n\n${reason ? `Reason: ${reason}\n\n` : ''}Anyone who tags or messages you will get an auto-reply.\n\nUse !afk off to disable.`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !roast - Savage (Friendly) Roasts ──────────────────────────────────────

const roastTemplates: string[] = [
  'If {name} was a spice, they\'d be flour.',
  '{name} brings everyone so much joy... when they leave.',
  'I\'d explain it to {name}, but I left my crayons at home.',
  '{name}\'s secret talent? Disappointing people.',
  'Somewhere out there, a tree is working hard to produce oxygen for {name}. I think they owe it an apology.',
  '{name} is proof that even evolution makes mistakes.',
  'I\'d roast {name} but my mama told me not to burn trash.',
  '{name}\'s WiFi probably disconnects out of boredom.',
  'If laughter is the best medicine, {name}\'s face must be curing the world.',
  'They say opposites attract. I hope {name} finds someone intelligent, beautiful, and cultured.',
  '{name} is the human equivalent of a participation trophy.',
  'I\'m not saying {name} is boring, but their autobiography would be a pamphlet.',
  '{name}\'s brain is like a browser - 19 tabs open, 3 frozen, and they can\'t find where the music is coming from.',
  'If {name} was any more basic, they\'d have a pH of 14.',
  '{name} types "lol" with a straight face.',
  '{name} puts the "pro" in "procrastination" and the "hot" in... nothing actually.',
  'Scientists say the universe is expanding, but {name}\'s IQ seems to be contracting.',
  'I\'d call {name} a tool but even tools are useful.',
  '{name} is like a cloud - everything brightens up when they disappear.',
  '{name}\'s idea of a balanced diet is a phone in each hand.',
  'If {name} was a candle, they\'d be unscented.',
  '{name}\'s search history is just \'how to be interesting\'.',
  '{name} is the human version of a participation award.',
  'I\'d agree with {name}, but then we\'d both be wrong.',
  '{name} has the personality of a damp cloth.',
  'If {name} was a vegetable, they\'d be a plain potato.',
  '{name}\'s energy drink of choice is warm water.',
  'I\'ve met rocks with more personality than {name}.',
  '{name} is like a software update - when I see them, I think \'not now.\'',
  '{name}\'s so boring, their dreams have a loading screen.',
  '{name} peaked in preschool.',
  'If {name} were a season, they\'d be a Tuesday in February.',
  '{name} is the reason shampoo has instructions.',
  'I\'d roast {name}, but nature already did.',
  '{name}\'s aura is beige.',
  'Even {name}\'s imaginary friend ghosted them.',
  '{name} is living proof that not all opinions are equal.',
  'If {name} was a superhero, they\'d be Captain Obvious.',
  '{name}\'s personality is like elevator music - technically there but nobody notices.',
  '{name} is the type to lose a debate with Siri.',
  'If you Googled \'basic\', {name}\'s picture would be the first result.',
  '{name}\'s autobiography would be titled \'Nothing Happened.\'',
  'Even autocorrect can\'t fix what\'s wrong with {name}.',
  '{name} is the human equivalent of a Terms and Conditions page.',
  'If {name} was a spice, they\'d be flour.',
  '{name} puts the \'meh\' in everything.',
  'Somewhere a village is missing its {name}.',
  '{name}\'s WiFi personality disconnects in public.',
  'If blank walls could talk, they\'d sound like {name}.',
  '{name} is like a Monday in human form.',
  'I\'ve had better conversations with my alarm clock than with {name}.',
  '{name} is the kind of person who claps when the plane lands.',
  '{name}\'s greatest achievement is being someone\'s acquaintance.',
  '{name} has the charisma of a wet paper bag.',
  '{name} is proof that Wi-Fi isn\'t the only thing with a weak signal.',
  'If personality were currency, {name} would be broke.',
  '{name}\'s playlist is just the default ringtone on repeat.',
  'Light travels faster than sound - that\'s why {name} looks okay until they speak.',
  '{name}\'s smile is their best feature... and even that\'s debatable.',
  'The only thing {name} brings to the table is their elbows.',
  'If {name} was a movie, they\'d be straight-to-DVD.',
  '{name} is the kind of person who microwaves water for tea.',
  'Even Google struggles to find something interesting about {name}.',
  '{name}\'s vibe check came back inconclusive.',
  'If {name} had a dollar for every interesting thing about them, they\'d have zero.',
  'The most exciting thing about {name} is their absence.',
  '{name}\'s spirit animal is a speed bump.',
  '{name} is the type to bring a salad to a barbecue.',
  'If {name} was a font, they\'d be Comic Sans.',
  '{name}\'s blood type is B-Negative, just like their personality.',
  '{name} is like a screen door on a submarine - not useful.',
  'If mediocrity was an art, {name} would have a gallery.',
  'I\'ve seen more fire in a wet match than in {name}.',
  '{name} is the type to say \'no offense\' after every sentence.',
  'If {name} was a car, they\'d be a shopping cart.',
  'Even {name}\'s GPS says \'recalculating your life.\'',
  '{name} is the NPC the game devs forgot to give a personality.',
  '{name}\'s cooking show would be titled \'Microwave Mastery.\'',
  'If awkward silence was a person, it\'d be {name}.',
  '{name}\'s dance moves look like a Windows loading error.',
  'Even the group chat gets quieter when {name} joins.',
  '{name} types \'lol\' with a straight face and zero guilt.',
  '{name}\'s alarm probably snoozes itself.',
  'If {name} was a phone, they\'d be permanently on silent.',
  'Even Siri would leave {name} on read.',
  '{name} couldn\'t even win a staring contest with a mirror.',
  'The zoo called - even the sloths move faster than {name}.',
  '{name}\'s motivational speech would be \'it is what it is.\'',
  'If {name} was an app, they\'d be the one nobody downloads.',
  '{name} walks into a room and the vibe walks out.',
  'I\'d say {name} is one in a million, but that\'s statistically generous.',
  'The only curve {name} has is their spine from bad posture.',
  '{name} is the kind of person who reads the Terms of Service.',
  'Even a broken clock is right twice a day. {name}, on the other hand...',
  '{name}\'s highlight reel is just a blank screen.',
  'If {name} had a theme song, it\'d be elevator music.',
  '{name} is like the end credits - everyone leaves when they show up.',
  'The best part about {name} is that they\'re consistently disappointing.',
  '{name} brings the same energy as a library on a Friday night.',
  'If {name} was a drink, they\'d be lukewarm tap water.',
  'Even a paper towel absorbs more personality than {name}.',
  '{name} tried to be a 10 but ended up being a decimal.',
  'If {name} was a holiday, they\'d be the day after a holiday.',
  '{name}\'s social skills are on airplane mode.',
  'The only viral thing about {name} is their cold.',
  'Even a potato has more eyes on it than {name} at a party.',
  '{name}\'s jokes land about as well as a penguin trying to fly.',
  'If boring was a sport, {name} would have a gold medal.',
  '{name} is the kind of person who returns a wave that wasn\'t for them.',
  'I\'d tell {name} to touch grass, but even the grass would avoid them.',
  '{name}\'s favorite hobby is watching paint dry.',
  'Even a screensaver has more movement than {name} at a party.',
  '{name} is the reason people pretend to be on their phone.',
  'If boredom was a virus, {name} would be patient zero.',
  '{name} once entered a personality contest and came last. It was a solo contest.',
  'The only thing sharp about {name} is their elbows.',
  '{name}\'s presence at a party is like a browser popup - unwanted.',
  'If {name} was a video game character, they\'d be the NPC that gives wrong directions.',
  '{name}\'s idea of multitasking is breathing and blinking at the same time.',
  'Even a rock has a harder surface than {name}\'s comebacks.',
  '{name} is the kind of person who googles \'Google.\'',
  'If charisma was a signal, {name} would have zero bars.',
  '{name}\'s Tinder bio just says \'I exist.\'',
  '{name} could bore the wings off a butterfly.',
  'Even WiFi at a campsite is stronger than {name}\'s personality.',
  'If {name} was a color, they\'d be plain gray.',
  'The only thing running through {name}\'s mind is a screensaver.',
  '{name} peaked when they learned to tie their shoes.',
  'If {name} was a sandwich, they\'d be two slices of white bread. No filling.',
  'Even a fortune cookie has deeper insights than {name}.',
  '{name} is like a cloud - everything\'s brighter when they disappear.',
  '{name}\'s idea of adventure is choosing a different cereal brand.',
  'Even a brick wall has more depth than {name}.',
  'If {name} was a streaming service, nobody would subscribe.',
  '{name}\'s spirit animal is a decaf coffee.',
  'Even a loading spinner moves faster than {name}\'s wit.',
  'If {name} was a number, they\'d be zero.',
  '{name} is the kind of person who says \'same\' to everything.',
  'Even Bluetooth connects faster than {name} gets a joke.',
  '{name}\'s most interesting fact is that they have no interesting facts.',
  'If {name} was a password, they\'d be \'password123\' - weak and predictable.',
  '{name} is like the buffering icon of people.',
  'Even a blank piece of paper has more depth than {name}.',
  '{name}\'s personality has less range than a microwave oven.',
  '{name} is the type to lose at solitaire.',
  'Even a calendar has more dates than {name}.',
  '{name}\'s energy level is permanently on low power mode.',
  'If {name} was a planet, they\'d be Pluto - barely counts.',
  '{name} is the type to burn water.',
  'Even a silent film has more drama than {name}.',
  'If {name} was a WiFi network, they\'d be the unsecured one nobody connects to.',
  '{name} is the kind of person who watches ads without skipping.',
  'Even a cactus gets more hugs than {name}.',
  '{name}\'s life is like a browser with 50 tabs open - none of them loading.',
  'If {name} was a notification, they\'d be the one you swipe away.',
  '{name} is the type to congratulate themselves for making toast.',
  'Even a stop sign gets more attention than {name}.',
  '{name}\'s credit score is higher than their personality score.',
  'If {name} was a sound, they\'d be the Windows error noise.',
  '{name} is like a participation certificate - technically there, nobody cares.',
  'Even autocorrect has given up on {name}.',
  'If {name} was a kitchen appliance, they\'d be a broken toaster.',
  '{name}\'s comeback game is weaker than airport WiFi.',
  'Even a GPS wouldn\'t know where {name}\'s life is heading.',
  'If {name} was an emoji, they\'d be the confused face nobody uses.',
  '{name}\'s highlight of the week is laundry day.',
  'Even a speed bump has more purpose than {name}.',
  '{name}\'s idea of living on the edge is staying up past 10pm.',
  'If {name} was an email, they\'d go straight to spam.',
  '{name} is living proof that evolution has a sense of humor.',
  'Even a paper airplane has a better flight path than {name}\'s career.',
  '{name} is the type to practice their surprised face in the mirror.',
  '{name}\'s greatest accomplishment is this chat tolerating them.',
  'Even a dial-up connection is faster than {name}\'s brain.',
  '{name} is the background character that didn\'t make the final cut.',
  'If {name} was a dessert, they\'d be plain jello. No whipped cream.',
  '{name}\'s vibe is the energy of a checkout line at the grocery store.',
  'Even a weather forecast is more exciting than {name}.',
  '{name} is the type of person who brings a book to a party.',
  'If {name} was a TV show, they\'d be cancelled after the pilot.',
  '{name}\'s social media bio probably says \'Just a human.\'',
  'Even a doorbell gets more responses than {name}\'s texts.',
  '{name} is the kind of person who waves at someone waving at someone behind them.',
  'If {name} had a dollar for every original thought, they\'d owe money.',
  'Even a pothole has more depth than {name}\'s personality.',
  '{name} makes beige look exciting.',
  'If {name} was a chapter in a book, it\'d be the one readers skip.',
  '{name} is the human equivalent of a dead pixel.',
  'Even a waiting room magazine is more engaging than {name}.',
  '{name} is the type to lose at tic-tac-toe against themselves.',
  'If {name} was on a talent show, the judges would turn their chairs away.',
  '{name}\'s personality test came back as \'N/A.\'',
  'Even a blank wall has more to offer than a conversation with {name}.',
  'If boredom was contagious, {name} would be a pandemic.',
  'Even a power outage has more spark than {name}.',
  '{name}\'s love language is leaving people on read.',
  'If {name} was a pizza topping, they\'d be plain dough.',
  '{name} once had a staring contest with a wall. The wall won.',
  'Even a rerun is more interesting than {name}.',
  '{name} is the type to get lost in their own house.',
  'If {name} was a song, it\'d be the 30-second ad you can\'t skip.',
  '{name}\'s energy matches a phone at 1% battery.',
  '{name} is the kind of person who puts water on their cereal.',
  'If {name} was a store, it would be permanently closed.',
  '{name}\'s idea of a comeback is \'no u.\'',
  '{name} is the NPC that blocks doorways.',
  'If {name} tried to run away from their problems, they\'d trip.',
  '{name}\'s fitness goal is walking to the fridge.',
  'If {name} was a country, nobody would visit.',
  '{name} is the type to complain about free food.',
  '{name} is about as useful as a chocolate teapot.',
  'If {name} was in a horror movie, the ghost would leave.',
  '{name}\'s signature move is disappointing everyone equally.',
  '{name} is the background noise nobody asked for.',
  'If {name}\'s life was a game, it would be on easy mode and they\'d still lose.',
  '{name}, you\'re the reason God created the middle finger.',
  'If {name} had a brain cell, it would die of loneliness.',
  '{name} is so damn useless, even a broken condom has more purpose.',
  'Shut the hell up {name}, nobody asked for your trash opinion.',
  '{name} talks so much shit, their breath smells like a sewer.',
  'If bullshit was music, {name} would be a whole damn orchestra.',
  '{name} has the IQ of a doorknob and the personality to match.',
  'The only thing {name} is good at is being a waste of oxygen.',
  '{name}, even your mama regrets not using protection.',
  'If stupidity was a crime, {name} would get life in prison.',
  '{name} is the type of dumbass who\'d get lost in a one-way street.',
  'I\'d slap some sense into {name} but that would be animal abuse.',
  '{name} is proof that even trash gets recycled more than their jokes.',
  'Bro {name}, you\'re so full of crap your eyes are brown.',
  '{name} is about as sharp as a bowling ball.',
  'If {name}\'s brain was dynamite, they wouldn\'t have enough to blow their nose.',
  '{name} is the reason we can\'t have nice things in this group.',
  'Damn {name}, your face could make an onion cry.',
  '{name} is like a broken pencil - completely damn pointless.',
  'I\'ve seen smarter things come out of a vending machine than {name}.',
  '{name}, you\'re not just a clown, you\'re the entire damn circus.',
  'If I wanted to hear from an ass, I\'d fart - not listen to {name}.',
  '{name} is the human version of a participation trophy nobody wanted.',
  'Someone give {name} a map because they\'re clearly lost in life.',
  '{name}\'s brain is like a browser with 100 tabs open - all of them frozen.',
  'If {name} was any dumber, someone would have to water them twice a week.',
  '{name} looks like they were drawn with the wrong hand.',
  'I\'d tell {name} to go to hell but I don\'t want to see them there either.',
  '{name} is the reason aliens won\'t visit Earth.',
  'Even Google can\'t find a single reason to like {name}.',
  '{name}\'s gene pool could use a lifeguard.',
  'If {name}\'s personality was a drink, it\'d be flat, warm beer.',
  '{name} is the type to bring a knife to a gun fight and still miss.',
  'Bro {name} really woke up today and chose to be trash. Again.',
  '{name} has the depth of a damn puddle in a drought.',
  'If {name} disappeared tomorrow, nobody would notice for a week.',
  '{name}, your opinion is like a fart in a hurricane - nobody gives a damn.',
  'Even bacteria wouldn\'t culture with {name}.',
  '{name} is the human equivalent of stepping in wet dog shit.',
  'If brains were leather, {name} wouldn\'t have enough to saddle a flea.',
  '{name} is so irrelevant, even their notifications don\'t pop up.',
  'Damn {name}, you look like something I\'d draw with my left foot.',
  '{name} is like a slinky - useless, but fun to push down stairs.',
  'I\'ve met smarter sandwiches than {name}.',
  '{name} couldn\'t pour water out of a boot if the instructions were on the heel.',
  'If {name} was a crayon, they\'d be the white one - nobody uses that shit.',
  '{name}\'s family tree is a straight line.',
  'Bro {name}, you\'re the reason warning labels exist.',
  '{name} is the type to study for a blood test and still fail.',
  'If {name} had a penny for every smart thought, they\'d be in debt.',
  '{name} is so ugly, even their reflection looks away.',
  'If {name} was a spice, they\'d be expired salt.',
  '{name}\'s face is nature\'s best contraceptive.',
  'I\'d say {name} was dropped as a baby, but clearly they were thrown.',
  '{name} is the type to argue with a calculator and lose.',
  'If {name} had one more brain cell, it would be lonely.',
  'Damn {name}, your WiFi signal is stronger than your personality.',
  '{name} makes dumpster fires look classy.',
  'If {name} tried to be a comedian, the audience would demand a refund. And therapy.',
  'Even a GPS would give up trying to find {name}\'s talent.',
  '{name} is so dense, light bends around them.',
  'Somewhere, a tree is producing oxygen for {name}. That tree deserves an apology.',
  '{name} is the human equivalent of a \'terms and conditions\' nobody agrees to.',
  'If {name} was food, they\'d be unseasoned boiled chicken.',
  '{name} talks like they\'ve got a PhD in bullshit.',
  'Bro {name}, you\'re built like a question mark - confused and bent.',
  '{name}\'s whole existence is a typo that never got corrected.',
  'If {name} was any more basic, they\'d be a pH of 14.',
  '{name} is the kind of person who ruins a whole damn group photo.',
  'I\'d say {name} peaked, but you need to go up before you can peak.',
  '{name}\'s so fake, even China wouldn\'t claim them.',
  'If {name} was a movie, it\'d be rated F for \'forget it.\'',
  '{name} is so forgettable, even Alzheimer\'s couldn\'t make it worse.',
  'Bro {name}, even a toilet flushes better content than what you say.',
  '{name} is the definition of \'nothing to write home about.\'',
  'If common sense was money, {name} would owe everybody.',
  '{name}\'s comebacks are weaker than gas station coffee.',
  'Even a scarecrow has more backbone than {name}.',
  '{name} is so slow, they\'d lose a race against a parked car.',
  'If {name} was on fire, I\'d roast marshmallows.',
  'Damn {name}, even your shadow tries to distance itself from you.',
  '{name} is the reason autocorrect was invented - always wrong.',
  'If {name} had a spirit animal, it\'d be a headless chicken.',
  'Bro {name}, you\'ve got the personality of wet cardboard.',
  '{name} is like a broken escalator - still technically a staircase, but disappointing as hell.',
  'If {name} was a haircut, they\'d be the mullet - a mistake from every angle.',
  '{name} is so annoying, even their echo doesn\'t respond.',
  'If {name} tried to mind their own business, their mind would be empty.',
  '{name}\'s favorite color is probably beige. Fitting.',
  'Even spam emails have more value than {name}\'s messages.',
  '{name} is the living, breathing embodiment of a facepalm.',
  'If {name} had an original thought, it would die of shock.',
  '{name} is the type to fail a \'yes or no\' question.',
  '{name} can go sit on a cactus and spin.',
  'Shut your ass up {name}, nobody wants to hear that BS.',
  '{name} is a whole-ass disappointment wrapped in failure.',
  '{name}, kindly go step on a Lego barefoot. Twice.',
  'The only thing {name} ever graduated from is being a dumbass.',
  'If {name} was a candle, they\'d smell like burnt trash.',
  '{name} is the kind of jackass who brings a spoon to a sword fight.',
  'Bro {name}, your existence is God\'s way of saying \'my bad.\'',
  '{name} is so damn boring, insomnia uses them as a cure.',
  'The best part of {name} ran down their mama\'s leg.',
  'If {name} was a season, they\'d be allergy season - annoying as hell.',
  '{name} peaked when the doctor slapped their ass at birth.',
  'Every time {name} speaks, brain cells commit suicide worldwide.',
  '{name} is the type of fool who\'d bring sand to the beach.',
  'If {name}\'s IQ was temperature, it\'d be a damn ice age.',
  'Bro {name}, you\'re built like a before picture in a weight loss ad.',
  '{name} is the reason therapists stay in business.',
  'If {name} was a superhero, they\'d be Captain Deadweight.',
  '{name} talks tough online but cries when their food order is wrong.',
  'Damn {name}, even roaches scatter when you enter a room.',
  '{name} has more issues than a newsstand and less solutions than a desert.',
  'If I throw a stick, will {name} leave?',
  '{name}\'s brain called - it wants a damn refund.',
  'Even a dumpster fire keeps people warm. {name} just wastes everyone\'s time.',
  '{name} is the friend nobody actually invited.',
  'If {name} was weather, they\'d be a shitstorm with no rainbow.',
  '{name}\'s face looks like it caught fire and someone put it out with a fork.',
  'Bro {name}, you were born on a highway - that\'s where most accidents happen.',
  '{name} has the charm of a wet sock in a microwave.',
  'The last time {name} had an original thought, they were still in diapers.',
  '{name}, if you were a fruit, you\'d be a damn lemon - sour and unwanted.',
  'If {name} jumped off their ego and landed on their IQ, they\'d be dead.',
  '{name} is the type to get rejected by a mirror.',
  'I\'d insult {name} but nature already did the job better than I ever could.',
  '{name} is living proof that shit happens.',
  'If {name}\'s personality was a stock, nobody would buy that crap.',
  'Bro {name}, even your Google search results say \'did you mean someone else?\'',
  '{name} brings nothing to the table except crumbs and complaints.',
  'If {name} was a disease, the cure would be \'not talking to them.\'',
  '{name} is the type to cheat at solitaire and still lose.',
  'Damn {name}, even a parking ticket is more welcome than you.',
  '{name} has all the warmth and charm of a restraining order.',
  'If {name} had any less charisma, they\'d be in a vegetative state.',
  '{name}\'s birth certificate is just an apology letter from the condom factory.',
  'I\'d explain it to {name}, but I left my crayons at home.',
  '{name} is the human equivalent of a low-battery notification.',
  'If {name} was a virus, antivirus software would ignore them as a non-threat.',
  '{name} is the reason mirrors crack.',
  'Even a blank screen is more entertaining than {name}.',
  'If {name}\'s ego was half as big as their stupidity, they\'d still be unbearable.',
  '{name} is proof that evolution can go in reverse.',
  'Bro {name}, you peaked in the womb and it\'s been downhill since.',
  'If ignorance is bliss, {name} must be the happiest fool alive.',
  '{name} has the social awareness of a drunk seagull.',
  'If {name} was any more useless, they\'d need batteries.',
  '{name} tried to use their brain once. Once.',
  'If {name} was a car alarm, even the car would disconnect them.',
  '{name} is what happens when the gene pool has no lifeguard.',
  'Bro {name}, your brain is on airplane mode 24/7.',
  '{name}\'s entire vibe is \'error 404: personality not found.\'',
  'If {name} was a country, it\'d be a failed state.',
  '{name} makes watching paint dry seem like a Netflix binge.',
  'If {name} was an ingredient, they\'d be expired flour - bland and useless.',
  '{name} is the reason people believe in karma - someone had to pay for something.',
  'Bro {name}, you\'re about as useful as a screen door on a submarine.',
  '{name} is the NPC that the devs programmed to be annoying on purpose.',
  'If {name} was a superhero power, they\'d be the ability to clear a room.',
  '{name}\'s face could be used as a natural insect repellent.',
  'Even a 404 error page is more responsive than {name}.',
  'If {name} had a dollar for every time they were wrong, they\'d be a billionaire.',
  '{name} is the type to Google \'how to Google things.\'',
  '{name} is the person the group chat was made to talk about.',
  'Every group chat has that one idiot, and {name} is three of them.',
  '{name} is the reason people mute group chats.',
  'This group chat\'s IQ drops by 50 every time {name} types.',
  '{name}, you contribute less to this chat than a bot in sleep mode.',
  'If {name} left this group, morale would skyrocket instantly.',
  '{name} has the audacity to be wrong loudly and often.',
  'The only thing consistent about {name} is how consistently trash they are.',
  '{name} types like they\'re having a stroke and thinks like one too.',
  'Every time {name} sends a message, angels lose their wings.',
  '{name} is the group member that makes everyone else look amazing by comparison.',
  'If {name} was a notification, even Do Not Disturb couldn\'t block the cringe.',
  'Bro {name}, this group was peaceful before you evolved from a lurker.',
  '{name} is the reason people create new group chats without certain people.',
  '{name}\'s messages are the digital equivalent of stepping in gum.',
  '{name} looks like they were assembled from spare parts.',
  'God made {name} and then immediately asked for a refund.',
  '{name}\'s barber clearly hates them.',
  'If {name}\'s face was a map, it\'d say \'you are nowhere.\'',
  '{name} looks like their avatar was randomly generated.',
  'Bro {name}, you look like you were photoshopped in real life - badly.',
  '{name} is built like a stick figure that gave up halfway.',
  'If {name} was in a lineup, witnesses would pick someone else just to be safe.',
  '{name} looks like they got dressed in the dark during an earthquake.',
  '{name}\'s style is \'2009 called and they don\'t want it back either.\'',
  '{name} has two brain cells and they\'re both fighting for third place.',
  'If {name}\'s thoughts were currency, they\'d still be broke.',
  '{name} is the type to put a ruler under their pillow to measure how long they slept.',
  'Bro {name}, you have the critical thinking skills of a goldfish with amnesia.',
  '{name}\'s IQ test came back negative.',
  'If {name} was any slower, they\'d be going backwards.',
  '{name} thinks manual labor is a Spanish politician.',
  'I once explained something to {name} in simple terms. They asked me to simplify it.',
  '{name} is the type to lock their keys inside a motorcycle.',
  '{name}\'s thoughts have less depth than a kiddie pool in a drought.',
  'If brains were gasoline, {name} wouldn\'t have enough to drive an ant\'s motorcycle around a dime.',
  '{name} is the living embodiment of \'the lights are on but nobody\'s home.\'',
  'Bro {name}, your brain has more cobwebs than a haunted house.',
  '{name} thinks WiFi grows on trees and common sense is a superpower.',
  '{name} is the reason they put \'do not eat\' labels on silica gel packets.',
  '{name}\'s love life is more tragic than a Shakespeare play - except nobody cares.',
  'If {name}\'s dating profile was honest, it\'d say \'desperately available.\'',
  '{name} is the type to get friendzoned by their imaginary friend.',
  'Bro {name}, even your dog pretends not to know you in public.',
  '{name}\'s social life is on life support and the plug is almost out.',
  'If {name} was a dating app, it would have zero matches and one-star reviews.',
  '{name}\'s idea of a wild night is staying up past their bedtime.',
  'Even {name}\'s alarm clock is disappointed to see them every morning.',
  '{name} is the type to rehearse ordering food and still mess it up.',
  '{name}\'s bucket list is just a list of naps.',
  '{name} peaked socially in kindergarten and it\'s been free-falling since.',
  'If {name} had a fan club, the president would resign.',
  'Bro {name}, your retirement plan is apparently hoping for the best.',
  '{name} is so lazy, they\'d hire someone to breathe for them if they could.',
  '{name}\'s idea of exercise is running late and jumping to conclusions.',
  '{name} really thought they ate with that last message. Nah fam, you starved.',
  'Hold up, did {name} just say that with their whole chest? Embarrassing.',
  '{name} out here acting like a main character when they\'re barely an extra.',
  'Bro {name}, you talk a lot for someone with nothing to say.',
  '{name} walked into this chat like they own it. Rent is due and they\'re broke.',
  'I\'ve heard better arguments from a fortune cookie than from {name}.',
  '{name} thinks they\'re the sharpest tool in the shed but they\'re just a tool.',
  'The audacity of {name} to exist this confidently with zero talent.',
  '{name} keeps talking like anyone asked. Spoiler: nobody did.',
  'Bro {name}, you\'ve got the confidence of a wrong answer on a multiple-choice test.',
  '{name} acts like they have fans. The only fan they have is the ceiling one.',
  'If {name} was half as smart as they think they are, they\'d still be dumb.',
  '{name} came in here thinking they\'re a 10 when they\'re barely a participation ribbon.',
  'Silence is golden. Too bad {name} can\'t afford it.',
  '{name} typed that like it was a mic drop. It was more like a phone drop - cracked screen, no insurance.',
  '{name} is the human equivalent of a YouTube ad you can\'t skip.',
  'If {name} was a meme, they\'d be the one that died in 2012.',
  '{name} gives off strong \'reply-all to company email\' energy.',
  'Bro {name}, you\'re the human version of clickbait - all title, no substance.',
  '{name} is the internet explorer of people - slow, outdated, and nobody uses them.',
  'If {name} was a social media platform, they\'d be Google Plus.',
  '{name} has the same energy as a \'this page cannot be found\' error.',
  'Bro {name}, you\'re like a pop-up ad - nobody asked and nobody wants you here.',
  '{name} is the type to go viral for all the wrong reasons.',
  '{name} is giving \'main character syndrome\' with \'background extra\' skills.',
  'If {name} was a TikTok, they\'d be the one everyone scrolls past.',
  '{name} is the reason the block button was invented.',
  'Bro {name}, your vibe is \'copied homework but still got it wrong.\'',
  '{name} has all the relevance of a MySpace profile in 2026.',
  '{name} gives off \'peaked in middle school\' energy and it shows.',
  '{name} is blander than unseasoned rice at a gas station.',
  'If {name} was a meal, they\'d be plain toast - dry and disappointing.',
  '{name} has the flavor of a rice cake and the personality to match.',
  'Bro {name}, you\'re about as exciting as watching bread get stale.',
  '{name} is like expired milk - nobody wants them and they just make things worse.',
  'If {name} was ice cream, they\'d be the flavor nobody picks - plain vanilla with freezer burn.',
  '{name} has all the spice of a boiled potato in distilled water.',
  'If {name} was a restaurant, they\'d have zero stars and a health code violation.',
  '{name}\'s personality is like unseasoned chicken - technically edible but nobody\'s happy about it.',
  '{name} is the human equivalent of getting socks for Christmas.',
  'Bro {name}, you\'re like day-old pizza - cold, flat, and regrettable.',
  '{name} is like a stale chip - barely crunchy, zero flavor, and you regret putting them in your mouth.',
  'If {name} was a drink, they\'d be room-temperature tap water in a dirty cup.',
  '{name} adds the same value to a conversation as ketchup on cereal.',
  '{name} is proof that not everything ages like fine wine - some things age like milk.',
  '{name}\'s LinkedIn profile is just a long list of things they\'re bad at.',
  'If {name} put their work ethic on a resume, it would be blank.',
  '{name} has the career trajectory of a ball rolling downhill.',
  'Bro {name}, even your alarm clock gave up on your future.',
  '{name}\'s five-year plan is just \'survive\' and they\'re failing at that.',
  'If {name} was an employee, they\'d be the one who gets fired during training.',
  '{name}\'s hustle is faker than a three-dollar bill.',
  'The only thing {name} has ever built is disappointment.',
  '{name} puts the \'no\' in \'innovation.\'',
  '{name}\'s biggest accomplishment is being consistently mediocre.',
  'If {name}\'s ambition was a flame, you couldn\'t even light a birthday candle.',
  'Bro {name}, your career is going nowhere and even that\'s generous.',
  '{name} is the type to fail upward and still end up at the bottom.',
  '{name}\'s dream job is apparently being a professional disappointment.',
  '{name} has less drive than a parked car with a dead battery.',
  '{name} is the reason \'it\'s not you, it\'s me\' was invented - it\'s definitely them.',
  'If {name} was a relationship status, it\'d be \'permanently single by choice... of everyone else.\'',
  '{name}\'s love language is being annoying and their fluency is off the charts.',
  'Bro {name}, even Cupid looked at you and said \'nah, I\'m good.\'',
  '{name} is the friend nobody claims in public.',
  'If {name} was a plus-one at a wedding, the couple would uninvite themselves.',
  '{name} has been left on read so many times, they think it\'s a conversation style.',
  'Even {name}\'s therapist needs a therapist after dealing with them.',
  '{name} is the type to get dumped via a group chat announcement.',
  '{name}\'s ex has a support group and it\'s growing fast.',
  'If loneliness was an Olympic sport, {name} would have a gold medal.',
  'Bro {name}, even your pillow turns the cold side away from you.',
  '{name} is the walking, talking reason people prefer pets over humans.',
  '{name}\'s best friend is their TV remote and even that changes when they pick it up.',
  '{name} has been ghosted so many times, they should start a paranormal investigation team.',
];

const textRoasts: string[] = [
  'Bro really typed "{text}" like it was a TED talk. Sit down.',
  '"{text}" - Said no intelligent person ever.',
  'I read "{text}" and my brain asked for a refund.',
  'Nobody:\nAbsolutely nobody:\n{name}: "{text}"',
  '"{text}" is the kind of thing you whisper to your pillow, not type in a chat.',
  'I\'ve seen better takes from a fortune cookie. "{text}" really?',
  'Auto-correct read "{text}" and gave up.',
  '"{text}" - The message that made Siri question her existence.',
  'Bro typed "{text}" like the whole group was waiting for it. We weren\'t.',
  'If "{text}" was a movie, it would go straight to DVD.',
  '"{text}" - Someone call the grammar police.',
  'Bro really hit send on "{text}" without a second thought.',
  '"{text}" sounds like something a bot with a fever would generate.',
  'I showed "{text}" to my therapist. We now have two sessions a week.',
  '"{text}" is the kind of message that makes teachers retire early.',
  '"{text}" just lowered the IQ of this entire group chat.',
  'Bro typed "{text}" like it was poetry. It was not.',
  '"{text}" is why aliens won\'t visit us.',
  'I read "{text}" three times hoping it would get better. It didn\'t.',
  '"{text}" hits different - and by different, I mean worse.',
  'Google translate couldn\'t even help "{text}" make sense.',
  '"{text}" is the textual equivalent of a sad trombone.',
  'My phone tried to autocorrect "{text}" into something better. Failed.',
  '"{text}" - Bold of {name} to say that with their whole chest.',
  'Shakespeare rolled in his grave when {name} typed "{text}".',
  '"{text}" just made my spell-check resign.',
  'Even Siri would respond with "I can\'t help with that" to "{text}".',
  '"{text}" - The message nobody needed but {name} delivered anyway.',
  'I forwarded "{text}" to my friend. We\'re no longer friends.',
  '"{text}" is proof that not all messages deserve to be sent.',
  '"{text}" should come with a warning label.',
  'My eyes need therapy after reading "{text}".',
  '"{text}" is the digital equivalent of stepping on a Lego.',
  'I showed "{text}" to a dictionary. The dictionary closed itself.',
  '"{text}" reads like a ransom note from someone who gave up.',
  'The group chat peaked before "{text}" was sent.',
  '"{text}" has the same energy as reheated fries.',
  'Even predictive text would be embarrassed by "{text}".',
  '"{text}" is the text equivalent of a mic drop, except nobody applauded.',
  'Bro thought "{text}" was going to go viral. In a bad way, maybe.',
  '"{text}" just put this whole conversation in the ICU.',
  'If "{text}" was a movie pitch, the studio would close.',
  '"{text}" carries the same energy as wet socks.',
  'Even a chatbot from 2005 could outwrite "{text}".',
  '"{text}" is what happens when brain cells go on strike.',
  'I read "{text}" and my phone dimmed itself in shame.',
  '"{text}" - This is why we need a license to post online.',
  'Auto-save rejected "{text}" for quality reasons.',
  '"{text}" has the literary depth of a puddle.',
  'Bro {name} typed "{text}" thinking it was profound. Narrator: It was not.',
  '"{text}" - Bro really typed that with confidence. Tragic.',
  'Holy hell, "{text}" might be the dumbest thing I\'ve read all week.',
  '"{text}" - Even a monkey with a keyboard would do better.',
  'Bro sent "{text}" like it was a damn thesis. It\'s barely a footnote.',
  '"{text}" is what happens when brain cells take a vacation.',
  '"{text}" - Delete this before more people see it, {name}.',
  'The fact that {name} typed "{text}" and hit send is honestly concerning.',
  '"{text}" just made everyone in this chat lose brain cells.',
  '"{text}" - I\'ve seen better writing on a bathroom wall.',
  '"{text}" hit this chat like a wet fart - unexpected and unwanted.',
  '"{text}" is what you get when autocorrect gives up on life.',
  'Bro {name} really said "{text}" like the whole group was waiting for that. We weren\'t.',
  '"{text}" - That\'s it? That\'s all you had? Damn {name}, that\'s sad.',
  'I showed "{text}" to my phone and it tried to factory reset itself.',
  '"{text}" carries the same energy as a spoiled milk carton - past its date.',
  '"{text}" - {name} put their whole two brain cells into that.',
  'If "{text}" was a person, it would be {name}. Make of that what you will.',
  '"{text}" reads like a cry for help that even emergency services would ignore.',
  'Bro really crafted "{text}" like Shakespeare and delivered it like a drunk parrot.',
  '"{text}" - This is why some people should require a license to type.',
  '"{text}" is the textual equivalent of a car crash - horrible but you can\'t look away.',
  '"{text}" - Even ChatGPT would refuse to generate something that bad.',
  'Someone please tell {name} that "{text}" isn\'t the flex they think it is.',
  '"{text}" - My brain just filed a restraining order against {name}.',
  '"{text}" is proof that {name} peaked in elementary school spelling bees. And lost.',
  '"{text}" reads like a fortune cookie written by someone having a bad day.',
  'Bro typed "{text}" and really thought the group would applaud. We\'re calling an ambulance.',
  '"{text}" - The only crime here is that {name} hit send.',
  '"{text}" has the same intellectual value as a blank piece of paper.',
  '"{text}" - And just like that, {name} set a new record for the worst message in this chat.',
  '"{text}" - I\'d roast this harder but it roasted itself.',
  'The confidence {name} had typing "{text}" is genuinely terrifying.',
  '"{text}" - Somewhere, an English teacher just felt a disturbance in the force.',
  '"{text}" is what you\'d get if you ran garbage through Google Translate five times.',
  '"{text}" - {name} really said this out loud in their head and still hit send.',
  '"{text}" just set this group chat back to the Stone Age.',
  'Bro {name} typed "{text}" thinking it would go hard. It went straight to the trash.',
  '"{text}" - I\'ve seen better sentences in spam emails from Nigerian princes.',
  '"{text}" is the written equivalent of nails on a chalkboard.',
  '"{text}" - This belongs in a museum of terrible messages. Front and center.',
];

async function handleRoast(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text;

  // Resolve target name from @mentions, quoted message sender, or args
  let targetName = 'this person';
  const contextInfo = context.rawMessage.message?.extendedTextMessage?.contextInfo
    || context.rawMessage.message?.conversation?.contextInfo;
  const mentionedJids: string[] = contextInfo?.mentionedJid || [];

  if (mentionedJids.length > 0) {
    // User tagged someone - try to get their display name
    const mentionJid = mentionedJids[0];
    try {
      if (typeof sock.fetchProfile === 'function') {
        const profile = await sock.fetchProfile(mentionJid);
        if (profile?.name || profile?.pushName || profile?.verifiedName) {
          targetName = profile.name || profile.pushName || profile.verifiedName;
        } else {
          targetName = '+' + mentionJid.replace(/@.*$/, '');
        }
      } else {
        targetName = '+' + mentionJid.replace(/@.*$/, '');
      }
    } catch {
      targetName = '+' + mentionJid.replace(/@.*$/, '');
    }
  } else if (quotedMsg && contextInfo?.participant) {
    // Replying to someone's message - use their name
    try {
      if (typeof sock.fetchProfile === 'function') {
        const profile = await sock.fetchProfile(contextInfo.participant);
        if (profile?.name || profile?.pushName || profile?.verifiedName) {
          targetName = profile.name || profile.pushName || profile.verifiedName;
        }
      }
    } catch { /* use default */ }
  } else {
    // Fall back to args or sender name
    const cleanArgs = args.filter(a => !a.startsWith('@')).join(' ').trim();
    targetName = cleanArgs || context.pushName || 'this person';
  }

  let roast: string;
  if (quotedText && quotedText.length > 0) {
    const template = textRoasts[Math.floor(Math.random() * textRoasts.length)];
    const shortText = quotedText.length > 60 ? quotedText.substring(0, 57) + '...' : quotedText;
    roast = template.replace(/\{text\}/g, shortText).replace(/\{name\}/g, targetName);
  } else {
    const template = roastTemplates[Math.floor(Math.random() * roastTemplates.length)];
    roast = template.replace(/\{name\}/g, targetName);
  }

  await sendReply(context.chatJid, `*ROAST* 🔥\n\n${roast}`, sock, context.rawMessage.key, context.queue);
}

// ─── !tldr - Summarize Long Messages ────────────────────────────────────────

function scoreSentences(text: string): string[] {
  const sentences = text.split(/[.!?\n]+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 10);

  if (sentences.length <= 3) return sentences;

  // Word frequency scoring
  const allWords = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  ]);

  const wordFreq = new Map<string, number>();
  for (const w of allWords) {
    if (w.length > 2 && !stopWords.has(w)) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }

  const scored = sentences.map((sentence: string, idx: number) => {
    const words = sentence.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of words) {
      score += wordFreq.get(w) || 0;
    }
    // Position bonus: first and last sentences more important
    if (idx === 0) score *= 1.5;
    if (idx === sentences.length - 1) score *= 1.3;
    // Length bonus: prefer medium-length sentences
    if (words.length >= 5 && words.length <= 25) score *= 1.2;
    return { sentence, score, idx };
  });

  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
  const topCount = Math.min(Math.ceil(sentences.length * 0.3), 5);
  const top = scored.slice(0, topCount);
  // Sort back by original order
  top.sort((a: { idx: number }, b: { idx: number }) => a.idx - b.idx);
  return top.map((t: { sentence: string }) => t.sentence);
}

async function handleTldr(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const sourceText = quotedMsg?.conversation
    || quotedMsg?.extendedTextMessage?.text
    || (args.length > 0 ? args.join(' ') : '');

  if (!sourceText || sourceText.length < 50) {
    await sendReply(context.chatJid, 'Reply to a long message with !tldr, or type !tldr [long text] to summarize.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const bullets = scoreSentences(sourceText);
  if (bullets.length === 0) {
    await sendReply(context.chatJid, 'Could not extract key points from this text.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const summary = bullets.map((b: string) => `• ${b}`).join('\n');
  await sendReply(
    context.chatJid,
    `*TL;DR*\n\n${summary}\n\n_${bullets.length} key point(s) extracted_`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !encrypt / !decrypt - Message Encryption ──────────────────────────────

function encryptText(text: string, pin: string): string {
  const key = crypto.scryptSync(pin, 'botwave-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptText(data: string, pin: string): string | null {
  try {
    const [ivHex, encrypted] = data.split(':');
    if (!ivHex || !encrypted) return null;
    const key = crypto.scryptSync(pin, 'botwave-salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

async function handleEncrypt(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 2) {
    await sendReply(context.chatJid, 'Usage: !encrypt [PIN] [message]\n\nExample: !encrypt 1234 This is my secret message\n\nShare the encrypted text - only !decrypt with the same PIN reveals it.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const pin = args[0];
  const message = args.slice(1).join(' ');
  const encrypted = encryptText(message, pin);
  await sendReply(
    context.chatJid,
    `*ENCRYPTED MESSAGE*\n\n\`\`\`${encrypted}\`\`\`\n\n_Decrypt with: !decrypt [your PIN] [paste encrypted text]_\n_Share the PIN privately - don't post it here!_`,
    sock, context.rawMessage.key, context.queue,
  );
}

async function handleDecrypt(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  let encData: string | undefined;
  let pin: string | undefined;

  if (quotedMsg) {
    const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
    // Extract the encrypted data from quoted message (may be wrapped in ``` blocks)
    const match = quotedText.match(/```([a-f0-9]+:[a-f0-9]+)```/) || quotedText.match(/([a-f0-9]{32}:[a-f0-9]+)/);
    encData = match ? match[1] : quotedText.trim();
    pin = args[0];
  } else if (args.length >= 2) {
    pin = args[0];
    encData = args.slice(1).join(' ').trim();
  }

  if (!pin || !encData) {
    await sendReply(context.chatJid, 'Usage: !decrypt [PIN] [encrypted text]\n\nOr reply to an encrypted message with: !decrypt [PIN]', sock, context.rawMessage.key, context.queue);
    return;
  }

  const decrypted = decryptText(encData, pin);
  if (!decrypted) {
    await sendReply(context.chatJid, 'Decryption failed. Wrong PIN or corrupted data.', sock, context.rawMessage.key, context.queue);
    return;
  }

  await sendReply(context.chatJid, `*DECRYPTED*\n\n${decrypted}`, sock, context.rawMessage.key, context.queue);
}

// ─── !ghost - Auto-Delete Messages ──────────────────────────────────────────

async function handleGhost(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sub = args[0]?.toLowerCase();

  if (sub === 'off' || sub === 'stop' || sub === 'disable') {
    ghostTimers.delete(context.senderJid);
    await sendReply(context.chatJid, 'Ghost mode disabled. Your messages will no longer auto-delete.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'status') {
    const timer = ghostTimers.get(context.senderJid);
    if (timer) {
      await sendReply(context.chatJid, `Ghost mode ON - messages auto-delete after ${timer} seconds.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Ghost mode is OFF.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  const seconds = parseInt(sub || '30') || 30;
  const clamped = Math.max(5, Math.min(300, seconds));
  ghostTimers.set(context.senderJid, clamped);

  await sendReply(
    context.chatJid,
    `*GHOST MODE ON* 👻\n\nYour messages will auto-delete after ${clamped} seconds.\n\nUse !ghost off to disable.`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !alias - Custom Command Shortcuts ──────────────────────────────────────

async function handleAlias(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'list') {
    let userAliases = aliasStore.get(context.senderJid);
    if (!userAliases) {
      userAliases = await loadAliasesFromRedis(context.senderJid);
      if (userAliases.size > 0) aliasStore.set(context.senderJid, userAliases);
    }
    if (!userAliases || userAliases.size === 0) {
      await sendReply(context.chatJid, 'No aliases set.\n\nCreate one: !alias set gm = !ai say good morning poetically', sock, context.rawMessage.key, context.queue);
      return;
    }
    const list = Array.from(userAliases.entries())
      .map(([alias, cmd]: [string, string]) => `• !${alias} → ${cmd}`)
      .join('\n');
    await sendReply(context.chatJid, `*YOUR ALIASES*\n\n${list}\n\n_Use !alias delete [name] to remove_`, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'delete' || sub === 'remove') {
    const aliasName = args[1]?.toLowerCase();
    if (!aliasName) {
      await sendReply(context.chatJid, 'Usage: !alias delete [name]', sock, context.rawMessage.key, context.queue);
      return;
    }
    let userAliases = aliasStore.get(context.senderJid);
    if (!userAliases) {
      userAliases = await loadAliasesFromRedis(context.senderJid);
      if (userAliases.size > 0) aliasStore.set(context.senderJid, userAliases);
    }
    if (userAliases?.has(aliasName)) {
      userAliases.delete(aliasName);
      await saveAliasesToRedis(context.senderJid, userAliases);
      await sendReply(context.chatJid, `Alias !${aliasName} deleted.`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, `No alias named "${aliasName}" found.`, sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (sub === 'set' || sub === 'add') {
    // Parse: !alias set gm = !ai say good morning
    const rest = args.slice(1).join(' ');
    const eqIdx = rest.indexOf('=');
    if (eqIdx === -1) {
      await sendReply(context.chatJid, 'Usage: !alias set [name] = [command]\n\nExample: !alias set gm = !ai say good morning', sock, context.rawMessage.key, context.queue);
      return;
    }
    const aliasName = rest.substring(0, eqIdx).trim().toLowerCase().replace(/^!/, '');
    const command = rest.substring(eqIdx + 1).trim();
    if (!aliasName || !command) {
      await sendReply(context.chatJid, 'Both alias name and command are required.\n\nExample: !alias set gm = !ai say good morning', sock, context.rawMessage.key, context.queue);
      return;
    }
    // Prevent overriding built-in commands
    const reserved = ['alias', 'help', 'ghost', 'chain', 'encrypt', 'decrypt'];
    if (reserved.includes(aliasName)) {
      await sendReply(context.chatJid, `Cannot override built-in command "!${aliasName}".`, sock, context.rawMessage.key, context.queue);
      return;
    }
    // Prevent recursive aliases
    const expandedCmd = command.replace(/^!/, '').split(/\s+/)[0].toLowerCase();
    if (expandedCmd === aliasName) {
      await sendReply(context.chatJid, `Cannot create recursive alias - "!${aliasName}" would call itself.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    if (!aliasStore.has(context.senderJid)) {
      aliasStore.set(context.senderJid, new Map());
    }
    aliasStore.get(context.senderJid)!.set(aliasName, command);
    await saveAliasesToRedis(context.senderJid, aliasStore.get(context.senderJid)!);
    await sendReply(
      context.chatJid,
      `*ALIAS CREATED*\n\n!${aliasName} → ${command}\n\nJust type !${aliasName} to use it.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  await sendReply(context.chatJid, 'Usage:\n!alias list - see your aliases\n!alias set [name] = [command]\n!alias delete [name]', sock, context.rawMessage.key, context.queue);
}

// ─── !chain - Command Piping ────────────────────────────────────────────────

async function handleChain(context: MessageContext, args: string[], sock: any): Promise<void> {
  const fullArgs = args.join(' ');
  const pipes = fullArgs.split('|').map((p: string) => p.trim()).filter((p: string) => p.length > 0);

  if (pipes.length < 2) {
    await sendReply(
      context.chatJid,
      'Usage: !chain [command1] | [command2] | ...\n\nExample: !chain translate es Hello world | tts\n\nPipes the output of each command to the next.',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // For now, chain is limited to 2 steps for safety and simplicity
  if (pipes.length > 3) {
    await sendReply(context.chatJid, 'Chain supports up to 3 steps.', sock, context.rawMessage.key, context.queue);
    return;
  }

  await sendReply(
    context.chatJid,
    `*CHAIN* 🔗 Running ${pipes.length} commands in sequence...\n\n${pipes.map((p: string, i: number) => `${i + 1}. !${p}`).join('\n')}`,
    sock, context.rawMessage.key, context.queue,
  );

  // Execute each command in sequence
  for (const pipe of pipes) {
    const parts = pipe.split(/\s+/);
    const cmdName = parts[0].replace(/^!/, '').toLowerCase();
    const cmdArgs = parts.slice(1);

    const handler = getCommand(cmdName);
    if (!handler) {
      await sendReply(context.chatJid, `Chain stopped: unknown command "!${cmdName}"`, sock, context.rawMessage.key, context.queue);
      return;
    }

    try {
      const vars: TemplateVars = {
        name: context.pushName || 'User',
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        group: context.isGroup ? context.chatJid.split('@')[0] : undefined,
      };
      await handler.execute(context, cmdArgs, sock, vars, cmdName);
      // Brief delay between chain steps for anti-ban
      await delay(1000 + Math.random() * 1000);
    } catch (err) {
      console.error(`Chain step !${cmdName} failed:`, err);
      await sendReply(context.chatJid, `Chain stopped: !${cmdName} failed.`, sock, context.rawMessage.key, context.queue);
      return;
    }
  }
}

// ─── !recap - Group Chat Summarizer ─────────────────────────────────────────

async function handleRecap(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, '!recap only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const count = Math.min(parseInt(args[0] || '50') || 50, MAX_CACHE_PER_CHAT);
  const cache = messageCache.get(context.chatJid);

  if (!cache || cache.length === 0) {
    await sendReply(context.chatJid, 'No messages cached yet. The bot needs to be in the group while messages are being sent. Try again later.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const messages = cache.slice(-count);

  // Word frequency analysis
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'and', 'but',
    'or', 'not', 'so', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'it', 'its', 'this', 'that', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'my',
    'your', 'his', 'her', 'our', 'their', 'just', 'like', 'lol', 'okay', 'ok', 'yeah',
    'no', 'yes', 'if', 'then', 'than', 'too', 'very', 'can', 'what', 'who', 'how',
    'when', 'where', 'why', 'all', 'been', 'being', 'about', 'which', 'get', 'got',
  ]);

  const wordFreq = new Map<string, number>();
  const senderCount = new Map<string, number>();
  let totalWords = 0;

  for (const msg of messages) {
    senderCount.set(msg.senderName, (senderCount.get(msg.senderName) || 0) + 1);
    const words = msg.text.toLowerCase().split(/\s+/);
    totalWords += words.length;
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w) && !w.startsWith('!')) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    }
  }

  // Top talkers
  const topTalkers = Array.from(senderCount.entries())
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]: [string, number]) => `  ${name}: ${count} msgs`)
    .join('\n');

  // Hot topics (top words)
  const hotTopics = Array.from(wordFreq.entries())
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]: [string, number]) => `${word} (${count})`)
    .join(', ');

  // Time range
  const oldest = messages[0];
  const newest = messages[messages.length - 1];
  const timeRange = oldest && newest
    ? `${new Date(oldest.timestamp).toLocaleTimeString()} - ${new Date(newest.timestamp).toLocaleTimeString()}`
    : 'Unknown';

  await sendReply(
    context.chatJid,
    `*GROUP RECAP* (last ${messages.length} messages)\n\n` +
    `*Time span:* ${timeRange}\n` +
    `*Total messages:* ${messages.length}\n` +
    `*Total words:* ${totalWords}\n\n` +
    `*Top talkers:*\n${topTalkers}\n\n` +
    `*Hot topics:* ${hotTopics || 'Not enough data'}`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !react - Auto-React to Patterns ────────────────────────────────────────

async function handleReact(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, '!react only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'list') {
    const rules = reactRules.get(context.chatJid);
    if (!rules || rules.length === 0) {
      await sendReply(context.chatJid, 'No auto-react rules set.\n\nAdd one: !react 🔥 when fire\n\nThe bot will react with 🔥 when someone says "fire".', sock, context.rawMessage.key, context.queue);
      return;
    }
    const list = rules.map((r: { emoji: string; pattern: string }) => `${r.emoji} when "${r.pattern}"`).join('\n');
    await sendReply(context.chatJid, `*AUTO-REACT RULES*\n\n${list}\n\n_Use !react clear to remove all_`, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'clear') {
    reactRules.delete(context.chatJid);
    await sendReply(context.chatJid, 'All auto-react rules cleared.', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Parse: !react 🔥 when fire
  const whenIdx = args.findIndex((a: string) => a.toLowerCase() === 'when');
  if (whenIdx === -1 || whenIdx === 0 || whenIdx >= args.length - 1) {
    await sendReply(context.chatJid, 'Usage: !react [emoji] when [trigger word/phrase]\n\nExample: !react 🔥 when fire\n!react 😂 when lmao', sock, context.rawMessage.key, context.queue);
    return;
  }

  const emoji = args.slice(0, whenIdx).join(' ');
  const pattern = args.slice(whenIdx + 1).join(' ');

  if (!reactRules.has(context.chatJid)) {
    reactRules.set(context.chatJid, []);
  }
  const rules = reactRules.get(context.chatJid)!;
  if (rules.length >= 20) {
    await sendReply(context.chatJid, 'Max 20 react rules per group. Use !react clear to reset.', sock, context.rawMessage.key, context.queue);
    return;
  }

  rules.push({ pattern, emoji, addedBy: context.senderJid });
  await sendReply(
    context.chatJid,
    `*AUTO-REACT ADDED*\n\n${emoji} → when someone says "${pattern}"\n\n_${rules.length} rule(s) active_`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !spy - Group Analytics ─────────────────────────────────────────────────

async function handleSpy(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, '!spy only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const cache = messageCache.get(context.chatJid);
  if (!cache || cache.length < 5) {
    await sendReply(context.chatJid, 'Not enough message data yet. Keep chatting and try again later!', sock, context.rawMessage.key, context.queue);
    return;
  }

  const messages = cache;
  const senderStats = new Map<string, { count: number; totalLen: number; emojis: number }>();
  const hourCounts = new Array(24).fill(0) as number[];
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const allEmojis = new Map<string, number>();
  const wordFreq = new Map<string, number>();

  for (const msg of messages) {
    // Sender stats
    if (!senderStats.has(msg.senderName)) {
      senderStats.set(msg.senderName, { count: 0, totalLen: 0, emojis: 0 });
    }
    const stats = senderStats.get(msg.senderName)!;
    stats.count++;
    stats.totalLen += msg.text.length;

    // Hour tracking
    const hour = new Date(msg.timestamp).getHours();
    hourCounts[hour]++;

    // Emoji tracking
    const emojis = msg.text.match(emojiRegex) || [];
    stats.emojis += emojis.length;
    for (const e of emojis) {
      allEmojis.set(e, (allEmojis.get(e) || 0) + 1);
    }

    // Word tracking
    const words = msg.text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !w.startsWith('!'));
    for (const w of words) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }

  // Most active members
  const topMembers = Array.from(senderStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, s]) => `  ${name}: ${s.count} msgs (avg ${Math.round(s.totalLen / s.count)} chars)`)
    .join('\n');

  // Peak hour
  let peakHour = 0;
  for (let i = 1; i < 24; i++) {
    if (hourCounts[i] > hourCounts[peakHour]) peakHour = i;
  }
  const peakStr = `${peakHour}:00 - ${peakHour + 1}:00`;

  // Top emojis
  const topEmojis = Array.from(allEmojis.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([e, c]) => `${e} (${c})`)
    .join(' ');

  // Most used words
  const topWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, c]) => `${w} (${c})`)
    .join(', ');

  // Activity bar chart (simple text)
  const maxHourCount = Math.max(...hourCounts);
  const hourChart = [0, 6, 12, 18].map((h: number) => {
    const bar = maxHourCount > 0 ? '█'.repeat(Math.ceil((hourCounts[h] / maxHourCount) * 8)) : '';
    return `  ${String(h).padStart(2, '0')}:00 ${bar || '░'} (${hourCounts[h]})`;
  }).join('\n');

  await sendReply(
    context.chatJid,
    `*GROUP ANALYTICS* 🕵️\n\n` +
    `*Messages analyzed:* ${messages.length}\n` +
    `*Peak activity:* ${peakStr}\n\n` +
    `*Top members:*\n${topMembers}\n\n` +
    `*Activity by hour:*\n${hourChart}\n\n` +
    `*Top emojis:* ${topEmojis || 'None'}\n` +
    `*Most used words:* ${topWords || 'N/A'}`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !deadman - Safety Switch ───────────────────────────────────────────────

async function handleDeadman(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sub = args[0]?.toLowerCase();

  if (sub === 'status') {
    const dm = deadmanStore.get(context.senderJid);
    if (dm) {
      const remaining = Math.max(0, Math.ceil((dm.createdAt + dm.timeoutMs - Date.now()) / 60000));
      await sendReply(context.chatJid, `*DEADMAN SWITCH ACTIVE*\n\nTime remaining: ${remaining} min\nTarget: ${dm.targetJid.split('@')[0]}\n\nType !alive to reset the timer\nType !deadman off to cancel`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'No deadman switch active.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (sub === 'off' || sub === 'cancel') {
    const dm = deadmanStore.get(context.senderJid);
    if (dm) {
      clearTimeout(dm.timeout);
      deadmanStore.delete(context.senderJid);
      await sendReply(context.chatJid, 'Deadman switch cancelled.', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'No deadman switch to cancel.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // Parse: !deadman 24h 2348164143260 If I don't check in, call my family
  if (args.length < 3) {
    await sendReply(
      context.chatJid,
      '*DEADMAN SWITCH*\n\nUsage: !deadman [time] [phone] [message]\n\nExample:\n!deadman 24h 2348164143260 If I don\'t check in, something may be wrong\n\nThe message is sent to the phone number if you don\'t type !alive before time runs out.\n\n!deadman status - check timer\n!deadman off - cancel',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // Parse time
  const timeStr = args[0].toLowerCase();
  let timeoutMs = 0;
  const timeMatch = timeStr.match(/^(\d+)(m|min|h|hr|d|day)s?$/);
  if (timeMatch) {
    const val = parseInt(timeMatch[1]);
    const unit = timeMatch[2];
    if (unit === 'm' || unit === 'min') timeoutMs = val * 60000;
    else if (unit === 'h' || unit === 'hr') timeoutMs = val * 3600000;
    else if (unit === 'd' || unit === 'day') timeoutMs = val * 86400000;
  }

  if (timeoutMs < 60000 || timeoutMs > 7 * 86400000) {
    await sendReply(context.chatJid, 'Time must be between 1 minute and 7 days.\n\nExamples: 30m, 6h, 1d, 24h', sock, context.rawMessage.key, context.queue);
    return;
  }

  const targetPhone = args[1].replace(/\D/g, '');
  if (targetPhone.length < 10) {
    await sendReply(context.chatJid, 'Invalid phone number. Use format: 2348164143260 (country code + number)', sock, context.rawMessage.key, context.queue);
    return;
  }
  const targetJid = `${targetPhone}@s.whatsapp.net`;
  const message = args.slice(2).join(' ');

  // Cancel existing
  const existing = deadmanStore.get(context.senderJid);
  if (existing) clearTimeout(existing.timeout);

  const timeout = setTimeout(async () => {
    try {
      deadmanStore.delete(context.senderJid);
      await sock.sendMessage(targetJid, {
        text: `*DEADMAN SWITCH TRIGGERED*\n\n${message}\n\n_This is an automated safety message from ${context.pushName || context.senderJid.split('@')[0]}_`,
      });
      await sendReply(context.chatJid, 'Your deadman switch has been triggered. The message was sent.', sock, context.rawMessage.key, context.queue);
    } catch (err) {
      console.error('[DEADMAN] Failed to send:', err);
    }
  }, timeoutMs);

  deadmanStore.set(context.senderJid, { message, targetJid, timeoutMs, timeout, createdAt: Date.now() });

  const timeDisplay = timeoutMs >= 86400000
    ? `${Math.round(timeoutMs / 86400000)}d`
    : timeoutMs >= 3600000
      ? `${Math.round(timeoutMs / 3600000)}h`
      : `${Math.round(timeoutMs / 60000)}m`;

  await sendReply(
    context.chatJid,
    `*DEADMAN SWITCH SET* ⏰\n\nTimer: ${timeDisplay}\nTarget: ${targetPhone}\nMessage: ${message}\n\nType !alive before the timer runs out to reset it.\nType !deadman off to cancel.`,
    sock, context.rawMessage.key, context.queue,
  );
}

async function handleAlive(context: MessageContext, _args: string[], sock: any): Promise<void> {
  const dm = deadmanStore.get(context.senderJid);
  if (!dm) {
    await sendReply(context.chatJid, 'No deadman switch active. Set one with !deadman', sock, context.rawMessage.key, context.queue);
    return;
  }

  clearTimeout(dm.timeout);
  const newTimeout = setTimeout(async () => {
    try {
      deadmanStore.delete(context.senderJid);
      await sock.sendMessage(dm.targetJid, {
        text: `*DEADMAN SWITCH TRIGGERED*\n\n${dm.message}\n\n_This is an automated safety message from ${context.pushName || context.senderJid.split('@')[0]}_`,
      });
    } catch (err) {
      console.error('[DEADMAN] Failed to send:', err);
    }
  }, dm.timeoutMs);

  deadmanStore.set(context.senderJid, { ...dm, timeout: newTimeout, createdAt: Date.now() });

  await sendReply(context.chatJid, `You're alive! Deadman switch timer reset. ✓`, sock, context.rawMessage.key, context.queue);
}

// ─── !type - Typing Animation Effect ────────────────────────────────────────

async function handleType(context: MessageContext, args: string[], sock: any): Promise<void> {
  const text = args.join(' ');
  if (!text) {
    await sendReply(context.chatJid, 'Usage: !type [message]\n\nShows "typing..." indicator while composing, then sends the message.', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Limit length for safety
  if (text.length > 500) {
    await sendReply(context.chatJid, 'Message too long for typing effect (max 500 chars).', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    // Show "typing..." indicator - this appears as "composing" in WhatsApp
    await sock.sendPresenceUpdate('composing', context.chatJid);

    // Simulate typing duration based on text length (~50ms per char, min 1s, max 8s)
    const typingDuration = Math.max(1000, Math.min(text.length * 50, 8000));
    await delay(typingDuration);

    // Stop typing indicator
    await sock.sendPresenceUpdate('paused', context.chatJid);

    // Small pause before sending (feels natural)
    await delay(300);

    // Send the final message
    await sock.sendMessage(context.chatJid, { text });
  } catch (err) {
    console.error('[TYPE] Animation failed:', err);
    await sendReply(context.chatJid, text, sock, context.rawMessage.key, context.queue);
  }
}

// ─── !birthday - Birthday Tracker ───────────────────────────────────────────

async function handleBirthday(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sub = args[0]?.toLowerCase();
  const storeKey = `${context.sessionId || 'default'}:${context.senderJid}`;

  if (sub === 'set') {
    const dateStr = args[1];
    if (!dateStr) {
      await sendReply(context.chatJid, 'Usage: !birthday set DD/MM\n\nExample: !birthday set 15/03', sock, context.rawMessage.key, context.queue);
      return;
    }
    const parts = dateStr.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
      await sendReply(context.chatJid, 'Invalid date. Use DD/MM format (e.g. 15/03 for March 15).', sock, context.rawMessage.key, context.queue);
      return;
    }
    birthdayStore.set(storeKey, { day, month, name: context.pushName || context.senderJid.split('@')[0] });
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    await sendReply(
      context.chatJid,
      `*BIRTHDAY SET* 🎂\n\n${context.pushName || 'You'}: ${monthNames[month]} ${day}\n\nI'll announce it when the day comes!`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (sub === 'list') {
    const prefix = `${context.sessionId || 'default'}:`;
    const entries: string[] = [];
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    birthdayStore.forEach((val, key) => {
      if (key.startsWith(prefix)) {
        entries.push(`${val.name}: ${val.day} ${monthNames[val.month]}`);
      }
    });
    if (entries.length === 0) {
      await sendReply(context.chatJid, 'No birthdays registered.\n\nSet yours: !birthday set DD/MM', sock, context.rawMessage.key, context.queue);
      return;
    }
    await sendReply(context.chatJid, `*BIRTHDAYS* 🎂\n\n${entries.join('\n')}`, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'next') {
    const prefix = `${context.sessionId || 'default'}:`;
    const now = new Date();
    const today = { month: now.getMonth() + 1, day: now.getDate() };
    let closest: { name: string; day: number; month: number; daysUntil: number } | null = null;

    birthdayStore.forEach((val, key) => {
      if (key.startsWith(prefix)) {
        let daysUntil: number;
        const bdayThisYear = new Date(now.getFullYear(), val.month - 1, val.day);
        if (bdayThisYear >= now) {
          daysUntil = Math.ceil((bdayThisYear.getTime() - now.getTime()) / 86400000);
        } else {
          const bdayNextYear = new Date(now.getFullYear() + 1, val.month - 1, val.day);
          daysUntil = Math.ceil((bdayNextYear.getTime() - now.getTime()) / 86400000);
        }
        if (!closest || daysUntil < closest.daysUntil) {
          closest = { ...val, daysUntil };
        }
      }
    });

    if (!closest) {
      await sendReply(context.chatJid, 'No birthdays registered yet.', sock, context.rawMessage.key, context.queue);
    } else {
      const c = closest as { name: string; day: number; month: number; daysUntil: number };
      await sendReply(context.chatJid, `*NEXT BIRTHDAY* 🎂\n\n${c.name} - in ${c.daysUntil} day(s)!`, sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  await sendReply(
    context.chatJid,
    '*BIRTHDAY TRACKER* 🎂\n\n!birthday set DD/MM - set your birthday\n!birthday list - see all birthdays\n!birthday next - see who\'s next',
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !profile - User Profile Card ───────────────────────────────────────────

async function handleProfile(context: MessageContext, _args: string[], sock: any): Promise<void> {
  const cache = messageCache.get(context.chatJid) || [];
  const userMsgs = cache.filter((m: { sender: string }) => m.sender === context.senderJid);
  const totalMsgs = userMsgs.length;

  // Calculate stats
  const totalChars = userMsgs.reduce((sum: number, m: { text: string }) => sum + m.text.length, 0);
  const avgLen = totalMsgs > 0 ? Math.round(totalChars / totalMsgs) : 0;

  // Emoji count
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  let emojiCount = 0;
  const favEmojis = new Map<string, number>();
  for (const m of userMsgs) {
    const emojis = m.text.match(emojiRegex) || [];
    emojiCount += emojis.length;
    for (const e of emojis) {
      favEmojis.set(e, (favEmojis.get(e) || 0) + 1);
    }
  }

  const topEmoji = Array.from(favEmojis.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e)
    .join(' ') || 'None';

  // Favorite words
  const wordFreq = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'i', 'you', 'to', 'in', 'for',
    'and', 'but', 'or', 'of', 'on', 'it', 'my', 'me', 'that', 'this', 'with', 'at']);
  for (const m of userMsgs) {
    for (const w of m.text.toLowerCase().split(/\s+/)) {
      if (w.length > 3 && !stopWords.has(w) && !w.startsWith('!')) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    }
  }
  const favWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w)
    .join(', ') || 'N/A';

  // Level calculation (every 50 messages = 1 level)
  const level = Math.floor(totalMsgs / 50) + 1;
  const xp = totalMsgs % 50;
  const progressBar = '█'.repeat(Math.floor(xp / 5)) + '░'.repeat(10 - Math.floor(xp / 5));

  // Badge system
  const badges: string[] = [];
  if (totalMsgs >= 100) badges.push('💬 Chatterbox');
  if (totalMsgs >= 500) badges.push('🗣️ Motor Mouth');
  if (emojiCount >= 50) badges.push('😎 Emoji King');
  if (avgLen >= 100) badges.push('📝 Essay Writer');
  if (avgLen <= 10 && totalMsgs > 10) badges.push('⚡ Speed Texter');
  if (badges.length === 0) badges.push('🌱 Newbie');

  const name = context.pushName || context.senderJid.split('@')[0];

  await sendReply(
    context.chatJid,
    `╔══════════════════╗\n` +
    `   *${name}*\n` +
    `╚══════════════════╝\n\n` +
    `*Level ${level}*  [${progressBar}] ${xp}/50 XP\n\n` +
    `📊 *Stats*\n` +
    `  Messages: ${totalMsgs}\n` +
    `  Avg length: ${avgLen} chars\n` +
    `  Emojis used: ${emojiCount}\n\n` +
    `🏆 *Badges*\n  ${badges.join('\n  ')}\n\n` +
    `❤️ *Favorites*\n` +
    `  Emojis: ${topEmoji}\n` +
    `  Words: ${favWords}`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !wrap - Month/Year in Review ───────────────────────────────────────────

async function handleWrap(context: MessageContext, _args: string[], sock: any): Promise<void> {
  const cache = messageCache.get(context.chatJid) || [];
  const userMsgs = cache.filter((m: { sender: string }) => m.sender === context.senderJid);

  if (userMsgs.length < 10) {
    await sendReply(context.chatJid, 'Not enough data for your wrap. Keep chatting and try again later!', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Analyze patterns
  const hourCounts = new Array(24).fill(0) as number[];
  const dayCounts = new Array(7).fill(0) as number[];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let longestMsg = '';
  let totalEmojis = 0;
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

  for (const m of userMsgs) {
    const d = new Date(m.timestamp);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
    if (m.text.length > longestMsg.length) longestMsg = m.text;
    totalEmojis += (m.text.match(emojiRegex) || []).length;
  }

  // Find peak hour and day
  let peakHour = 0;
  let peakDay = 0;
  for (let i = 1; i < 24; i++) if (hourCounts[i] > hourCounts[peakHour]) peakHour = i;
  for (let i = 1; i < 7; i++) if (dayCounts[i] > dayCounts[peakDay]) peakDay = i;

  // Personality type based on behavior
  const avgLen = userMsgs.reduce((s: number, m: { text: string }) => s + m.text.length, 0) / userMsgs.length;
  let personality: string;
  if (avgLen > 80) personality = 'The Novelist 📖 - You write essays in chat';
  else if (avgLen < 15) personality = 'The Sniper 🎯 - Short and deadly messages';
  else if (totalEmojis > userMsgs.length) personality = 'The Emoji Artist 🎨 - More emojis than words';
  else if (peakHour >= 0 && peakHour <= 5) personality = 'The Night Owl 🦉 - Active when everyone sleeps';
  else if (peakHour >= 6 && peakHour <= 10) personality = 'The Early Bird 🐦 - First to text in the morning';
  else personality = 'The Regular 😎 - Balanced and consistent';

  const name = context.pushName || 'You';
  const longestPreview = longestMsg.length > 80 ? longestMsg.substring(0, 77) + '...' : longestMsg;

  await sendReply(
    context.chatJid,
    `🎵 *${name}'s WRAPPED* 🎵\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `📱 *Total messages:* ${userMsgs.length}\n` +
    `📝 *Total characters:* ${userMsgs.reduce((s: number, m: { text: string }) => s + m.text.length, 0).toLocaleString()}\n` +
    `😀 *Emojis used:* ${totalEmojis}\n\n` +
    `⏰ *Peak hour:* ${peakHour}:00\n` +
    `📅 *Most active day:* ${dayNames[peakDay]}\n\n` +
    `💬 *Longest message:*\n"${longestPreview}"\n\n` +
    `🧠 *Your personality:*\n${personality}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `_Based on ${userMsgs.length} messages analyzed_`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── Register All Social Commands ───────────────────────────────────────────

registerCommand({ name: 'afk', aliases: ['afk', 'away', 'brb'], category: 'general', description: 'Set AFK status', execute: (ctx, args, sock) => handleAfk(ctx, args, sock) });
registerCommand({ name: 'roast', aliases: ['roast', 'burn'], category: 'fun', description: 'Roast someone (friendly)', execute: (ctx, args, sock) => handleRoast(ctx, args, sock) });
registerCommand({ name: 'tldr2', aliases: ['tldr2', 'quicksummary', 'bulletpoints'], category: 'utility', description: 'Summarize long messages (no AI)', execute: (ctx, args, sock) => handleTldr(ctx, args, sock) });
registerCommand({ name: 'encrypt', aliases: ['encrypt', 'enc'], category: 'utility', description: 'Encrypt a message with PIN', execute: (ctx, args, sock) => handleEncrypt(ctx, args, sock) });
registerCommand({ name: 'decrypt', aliases: ['decrypt', 'dec'], category: 'utility', description: 'Decrypt an encrypted message', execute: (ctx, args, sock) => handleDecrypt(ctx, args, sock) });
registerCommand({ name: 'ghost', aliases: ['ghost', 'vanish'], category: 'utility', description: 'Auto-delete your messages', execute: (ctx, args, sock) => handleGhost(ctx, args, sock) });
registerCommand({ name: 'alias', aliases: ['alias', 'shortcut'], category: 'utility', description: 'Create command shortcuts', execute: (ctx, args, sock) => handleAlias(ctx, args, sock) });
registerCommand({ name: 'chain', aliases: ['chain', 'pipe'], category: 'utility', description: 'Pipe commands together', execute: (ctx, args, sock) => handleChain(ctx, args, sock) });
registerCommand({ name: 'recap', aliases: ['recap'], category: 'utility', description: 'Summarize group chat', execute: (ctx, args, sock) => handleRecap(ctx, args, sock) });
registerCommand({ name: 'react', aliases: ['react', 'autoreact'], category: 'utility', description: 'Auto-react to patterns', execute: (ctx, args, sock) => handleReact(ctx, args, sock) });
registerCommand({ name: 'spy', aliases: ['spy', 'analytics', 'groupstats'], category: 'utility', description: 'Group analytics dashboard', execute: (ctx, args, sock) => handleSpy(ctx, args, sock) });
registerCommand({ name: 'deadman', aliases: ['deadman', 'deadswitch'], category: 'utility', description: 'Safety switch timer', execute: (ctx, args, sock) => handleDeadman(ctx, args, sock) });
registerCommand({ name: 'alive', aliases: ['alive', 'checkin'], category: 'utility', description: 'Reset deadman switch', execute: (ctx, args, sock) => handleAlive(ctx, args, sock) });
registerCommand({ name: 'type', aliases: ['type', 'typewriter'], category: 'fun', description: 'Typing animation effect', execute: (ctx, args, sock) => handleType(ctx, args, sock) });
registerCommand({ name: 'birthday', aliases: ['birthday', 'bday'], category: 'utility', description: 'Birthday tracker', execute: (ctx, args, sock) => handleBirthday(ctx, args, sock) });
registerCommand({ name: 'profile', aliases: ['profile', 'me', 'card'], category: 'utility', description: 'Your profile card', execute: (ctx, _a, sock) => handleProfile(ctx, _a, sock) });
registerCommand({ name: 'wrap', aliases: ['wrap', 'wrapped', 'review'], category: 'fun', description: 'Your chat wrapped/review', execute: (ctx, _a, sock) => handleWrap(ctx, _a, sock) });
