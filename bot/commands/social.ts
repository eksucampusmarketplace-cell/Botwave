import { registerCommand, getCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, getQuotedMessage, delay } from './helpers';
import { getAfkState, setAfkState } from '../database';
import crypto from 'crypto';

// ─── In-Memory Stores ───────────────────────────────────────────────────────

// Ghost mode: userJid -> delete delay in seconds
const ghostTimers = new Map<string, number>();

// Alias store: userJid -> Map<alias, expandedCommand>
const aliasStore = new Map<string, Map<string, string>>();

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

export function expandAlias(userJid: string, command: string): string | null {
  const userAliases = aliasStore.get(userJid);
  if (!userAliases) return null;
  return userAliases.get(command.toLowerCase()) || null;
}

export function getGhostDelay(userJid: string): number | null {
  return ghostTimers.get(userJid) ?? null;
}

// ─── !afk — Away From Keyboard ──────────────────────────────────────────────

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

// ─── !roast — Savage (Friendly) Roasts ──────────────────────────────────────

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
  '{name}\'s brain is like a browser — 19 tabs open, 3 frozen, and they can\'t find where the music is coming from.',
  'If {name} was any more basic, they\'d have a pH of 14.',
  '{name} types "lol" with a straight face.',
  '{name} puts the "pro" in "procrastination" and the "hot" in... nothing actually.',
  'Scientists say the universe is expanding, but {name}\'s IQ seems to be contracting.',
  'I\'d call {name} a tool but even tools are useful.',
  '{name} is like a cloud — everything brightens up when they disappear.',
  '{name}\'s idea of a balanced diet is a phone in each hand.',
];

const textRoasts: string[] = [
  'Bro really typed "{text}" like it was a TED talk. Sit down.',
  '"{text}" — Said no intelligent person ever.',
  'I read "{text}" and my brain asked for a refund.',
  'Nobody:\nAbsolutely nobody:\n{name}: "{text}"',
  '"{text}" is the kind of thing you whisper to your pillow, not type in a chat.',
  'I\'ve seen better takes from a fortune cookie. "{text}" really?',
  'Auto-correct read "{text}" and gave up.',
  '"{text}" — The message that made Siri question her existence.',
  'Bro typed "{text}" like the whole group was waiting for it. We weren\'t.',
  'If "{text}" was a movie, it would go straight to DVD.',
];

async function handleRoast(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text;
  const targetName = args.join(' ') || context.pushName || 'this person';

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

// ─── !tldr — Summarize Long Messages ────────────────────────────────────────

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

// ─── !encrypt / !decrypt — Message Encryption ──────────────────────────────

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
    await sendReply(context.chatJid, 'Usage: !encrypt [PIN] [message]\n\nExample: !encrypt 1234 This is my secret message\n\nShare the encrypted text — only !decrypt with the same PIN reveals it.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const pin = args[0];
  const message = args.slice(1).join(' ');
  const encrypted = encryptText(message, pin);
  await sendReply(
    context.chatJid,
    `*ENCRYPTED MESSAGE*\n\n\`\`\`${encrypted}\`\`\`\n\n_Decrypt with: !decrypt [your PIN] [paste encrypted text]_\n_Share the PIN privately — don't post it here!_`,
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

// ─── !ghost — Auto-Delete Messages ──────────────────────────────────────────

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
      await sendReply(context.chatJid, `Ghost mode ON — messages auto-delete after ${timer} seconds.`, sock, context.rawMessage.key, context.queue);
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

// ─── !alias — Custom Command Shortcuts ──────────────────────────────────────

async function handleAlias(context: MessageContext, args: string[], sock: any): Promise<void> {
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'list') {
    const userAliases = aliasStore.get(context.senderJid);
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
    const userAliases = aliasStore.get(context.senderJid);
    if (userAliases?.has(aliasName)) {
      userAliases.delete(aliasName);
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
      await sendReply(context.chatJid, `Cannot create recursive alias — "!${aliasName}" would call itself.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    if (!aliasStore.has(context.senderJid)) {
      aliasStore.set(context.senderJid, new Map());
    }
    aliasStore.get(context.senderJid)!.set(aliasName, command);
    await sendReply(
      context.chatJid,
      `*ALIAS CREATED*\n\n!${aliasName} → ${command}\n\nJust type !${aliasName} to use it.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  await sendReply(context.chatJid, 'Usage:\n!alias list — see your aliases\n!alias set [name] = [command]\n!alias delete [name]', sock, context.rawMessage.key, context.queue);
}

// ─── !chain — Command Piping ────────────────────────────────────────────────

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

// ─── !recap — Group Chat Summarizer ─────────────────────────────────────────

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
    ? `${new Date(oldest.timestamp).toLocaleTimeString()} — ${new Date(newest.timestamp).toLocaleTimeString()}`
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

// ─── !react — Auto-React to Patterns ────────────────────────────────────────

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

// ─── !spy — Group Analytics ─────────────────────────────────────────────────

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

// ─── !deadman — Safety Switch ───────────────────────────────────────────────

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
      '*DEADMAN SWITCH*\n\nUsage: !deadman [time] [phone] [message]\n\nExample:\n!deadman 24h 2348164143260 If I don\'t check in, something may be wrong\n\nThe message is sent to the phone number if you don\'t type !alive before time runs out.\n\n!deadman status — check timer\n!deadman off — cancel',
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

// ─── !type — Typing Animation Effect ────────────────────────────────────────

async function handleType(context: MessageContext, args: string[], sock: any): Promise<void> {
  const text = args.join(' ');
  if (!text) {
    await sendReply(context.chatJid, 'Usage: !type [message]\n\nThe bot types your message character by character with a typing animation.', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Limit length for ban safety
  if (text.length > 200) {
    await sendReply(context.chatJid, 'Message too long for typing effect (max 200 chars).', sock, context.rawMessage.key, context.queue);
    return;
  }

  // Send initial message then edit it progressively
  // We build the message in chunks for ban safety (not char by char)
  const chunkSize = Math.max(5, Math.ceil(text.length / 10));
  let current = '';

  try {
    // Send initial message with first chunk
    current = text.substring(0, chunkSize) + '▌';
    const sentMsg = await sock.sendMessage(context.chatJid, { text: current });

    if (!sentMsg?.key) {
      await sendReply(context.chatJid, text, sock, context.rawMessage.key, context.queue);
      return;
    }

    // Edit in chunks with delays
    for (let i = chunkSize; i < text.length; i += chunkSize) {
      await delay(800 + Math.random() * 400);
      current = text.substring(0, Math.min(i + chunkSize, text.length));
      const cursor = i + chunkSize < text.length ? '▌' : '';
      try {
        await sock.sendMessage(context.chatJid, { text: current + cursor, edit: sentMsg.key });
      } catch {
        break;
      }
    }

    // Final edit without cursor
    await delay(500);
    try {
      await sock.sendMessage(context.chatJid, { text, edit: sentMsg.key });
    } catch { /* final edit failed, message is still readable */ }
  } catch (err) {
    console.error('[TYPE] Animation failed:', err);
    await sendReply(context.chatJid, text, sock, context.rawMessage.key, context.queue);
  }
}

// ─── !birthday — Birthday Tracker ───────────────────────────────────────────

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
      await sendReply(context.chatJid, `*NEXT BIRTHDAY* 🎂\n\n${c.name} — in ${c.daysUntil} day(s)!`, sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  await sendReply(
    context.chatJid,
    '*BIRTHDAY TRACKER* 🎂\n\n!birthday set DD/MM — set your birthday\n!birthday list — see all birthdays\n!birthday next — see who\'s next',
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── !profile — User Profile Card ───────────────────────────────────────────

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

// ─── !wrap — Month/Year in Review ───────────────────────────────────────────

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
  if (avgLen > 80) personality = 'The Novelist 📖 — You write essays in chat';
  else if (avgLen < 15) personality = 'The Sniper 🎯 — Short and deadly messages';
  else if (totalEmojis > userMsgs.length) personality = 'The Emoji Artist 🎨 — More emojis than words';
  else if (peakHour >= 0 && peakHour <= 5) personality = 'The Night Owl 🦉 — Active when everyone sleeps';
  else if (peakHour >= 6 && peakHour <= 10) personality = 'The Early Bird 🐦 — First to text in the morning';
  else personality = 'The Regular 😎 — Balanced and consistent';

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
