import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, downloadMedia, getQuotedMessage, getImageFromContext, axios } from './helpers';
import { getUserSettings } from '../database';
import { getBase64FromMediaMessage } from '../evolutionClient';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile, access } from 'fs/promises';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// ─── !scan — Receipt/Invoice Scanner using Groq Vision ──────────────────────

async function handleScan(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  const hasDirectImage = !!context.rawMessage?.message?.imageMessage;
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasQuotedImage = !!quotedMsg?.imageMessage;

  if (!hasDirectImage && !hasQuotedImage) {
    await sendReply(
      context.chatJid,
      '*RECEIPT SCANNER*\n\n' +
      'Send or reply to a photo of a receipt/invoice with *!scan*\n\n' +
      'The AI will extract:\n' +
      '- Store/vendor name\n' +
      '- Individual items & prices\n' +
      '- Subtotal, tax, total\n' +
      '- Date & payment method\n\n' +
      '_Requires Groq API key in settings_',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  let groqKey: string | null = null;
  if (context.userId) {
    try {
      const settings = await getUserSettings(context.userId);
      groqKey = settings?.groq_api_key || null;
    } catch { /* fallback */ }
  }

  if (!groqKey) {
    await sendReply(
      context.chatJid,
      'Add your Groq API key in the dashboard to use receipt scanning!\nbotwave.com/dashboard -> Settings -> AI Settings\n\nGroq is free at console.groq.com',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    await sendReply(context.chatJid, 'Scanning receipt...', sock, context.rawMessage.key, context.queue);

    let imageBuffer: Buffer | null = null;
    if (hasDirectImage) {
      imageBuffer = await downloadMedia(context.rawMessage, sock);
      if (!imageBuffer && context.sessionId) {
        imageBuffer = await getBase64FromMediaMessage(context.sessionId, context.rawMessage);
      }
    } else if (hasQuotedImage) {
      const fakeMsg = { ...context.rawMessage, message: quotedMsg };
      imageBuffer = await downloadMedia(fakeMsg, sock);
      if (!imageBuffer && context.sessionId) {
        imageBuffer = await getBase64FromMediaMessage(context.sessionId, fakeMsg);
      }
    }

    if (!imageBuffer) {
      await sendReply(context.chatJid, 'Could not download the image. Please try sending it again.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: groqKey });

    const customPrompt = args.length > 0 ? `\n\nAdditional context from user: ${args.join(' ')}` : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this receipt/invoice image. Extract and format the following information clearly:

1. **Store/Vendor Name** (if visible)
2. **Date** (if visible)
3. **Items** — list each item with its price
4. **Subtotal**
5. **Tax** (if applicable)
6. **Total**
7. **Payment Method** (if visible)

Format it neatly for WhatsApp. Use *bold* for headers. If something isn't visible, skip it. Be concise.${customPrompt}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const result = completion.choices[0]?.message?.content || 'Could not read the receipt. Try a clearer photo.';
    await sendReply(context.chatJid, `*RECEIPT SCAN RESULT*\n\n${result}`, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    console.error('[SCAN] Error:', error?.message || error);
    if (error?.message?.includes('model') || error?.status === 400) {
      await sendReply(
        context.chatJid,
        'Vision model not available with your API key. Make sure your Groq account has access to vision models at console.groq.com',
        sock,
        context.rawMessage.key,
        context.queue,
      );
    } else {
      await sendReply(context.chatJid, 'Receipt scanning failed. Try a clearer photo or try again later.', sock, context.rawMessage.key, context.queue);
    }
  }
}

// ─── !music — Music Search & Audio Download ─────────────────────────────────

async function findYtDlp(): Promise<string> {
  for (const p of ['/tmp/yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp']) {
    try {
      await access(p);
      return p;
    } catch { /* not found, try next */ }
  }
  return 'yt-dlp';
}

async function handleMusic(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  if (!args.length) {
    await sendReply(
      context.chatJid,
      '*MUSIC SEARCH*\n\n' +
      '!music [song name]\n\n' +
      'Examples:\n' +
      '!music Shape of You\n' +
      '!music Burna Boy Last Last\n' +
      '!music Wizkid Essence\n\n' +
      '_Searches and sends the song as audio_',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const query = args.join(' ');

  try {
    await sendReply(
      context.chatJid,
      `Searching for "${query}"... This may take a moment.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );

    const ytdlpBin = await findYtDlp();
    const tmpFile = path.join(os.tmpdir(), `botwave_music_${Date.now()}`);

    // Search YouTube for the song and get info
    let videoTitle = query;
    let videoUrl = '';
    try {
      const { stdout } = await execFileAsync(ytdlpBin, [
        `ytsearch1:${query} audio`,
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
      ], { timeout: 30000, maxBuffer: 5 * 1024 * 1024 });

      const info = JSON.parse(stdout);
      videoTitle = info.title || query;
      videoUrl = info.webpage_url || info.url || '';
    } catch (searchErr: any) {
      console.error('[MUSIC] Search failed:', searchErr?.message);
    }

    // Download audio only
    const dlArgs = [
      videoUrl || `ytsearch1:${query} audio`,
      '-f', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '128K',
      '--no-playlist',
      '--max-filesize', '16M',
      '-o', `${tmpFile}.%(ext)s`,
      '--no-warnings',
      '--postprocessor-args', '-ac 2 -ar 44100',
    ];

    // Check for YouTube cookies
    const cookiesPath = path.join(os.tmpdir(), 'yt-cookies.txt');
    try {
      await access(cookiesPath);
      dlArgs.push('--cookies', cookiesPath);
    } catch { /* no cookies */ }

    if (videoUrl && /youtube\.com|youtu\.be/.test(videoUrl)) {
      dlArgs.push('--extractor-args', 'youtube:player_client=mediaconnect');
    }

    await execFileAsync(ytdlpBin, dlArgs, { timeout: 120000 });

    // Find the output file
    const { stdout: files } = await execFileAsync('sh', ['-c', `ls ${tmpFile}.* 2>/dev/null | head -1`]);
    const outFile = files.trim();

    if (!outFile) {
      await sendReply(context.chatJid, `Could not download "${query}". Try a different search term.`, sock, context.rawMessage.key, context.queue);
      return;
    }

    const audioBuffer = await readFile(outFile);

    // Send as audio message
    await sock.sendMessage(context.chatJid, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      ptt: false,
      fileName: `${videoTitle.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 60)}.mp3`,
    }, { quoted: context.rawMessage });

    // Clean up
    await unlink(outFile).catch(() => {});

    // Send song info
    const caption = `*${videoTitle}*${videoUrl ? `\n${videoUrl}` : ''}`;
    await sendReply(context.chatJid, caption, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    console.error('[MUSIC] Error:', error?.message || error);
    await sendReply(
      context.chatJid,
      `Could not find or download "${query}".\n\nTips:\n- Try adding the artist name\n- Check the spelling\n- Try a different song`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
  }
}

// ─── !digest — Daily Digest / Group Chat Summary ────────────────────────────

async function handleDigest(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  if (!context.isGroup) {
    await sendReply(
      context.chatJid,
      '*DAILY DIGEST*\n\n' +
      'Use this command in a group chat to get an AI summary of recent messages.\n\n' +
      '!digest — Summarize last few hours\n' +
      '!digest today — Today\'s summary\n' +
      '!digest 50 — Last 50 messages\n\n' +
      '_Requires Groq API key in settings_',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  let groqKey: string | null = null;
  if (context.userId) {
    try {
      const settings = await getUserSettings(context.userId);
      groqKey = settings?.groq_api_key || null;
    } catch { /* fallback */ }
  }

  if (!groqKey) {
    await sendReply(
      context.chatJid,
      'Add your Groq API key in the dashboard to use digest!\nbotwave.com/dashboard -> Settings -> AI Settings\n\nGroq is free at console.groq.com',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    await sendReply(context.chatJid, 'Generating digest...', sock, context.rawMessage.key, context.queue);

    // Determine how many messages or time range
    const arg = args[0]?.toLowerCase() || '';
    let messageLimit = 100;
    let hoursBack = 6;

    if (arg === 'today') {
      hoursBack = 24;
      messageLimit = 300;
    } else if (/^\d+$/.test(arg)) {
      messageLimit = Math.min(parseInt(arg), 500);
      hoursBack = 48;
    }

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Fetch recent messages from the database
    const { data: messages, error } = await supabase
      .from('messages')
      .select('sender_name, content, message_type, created_at')
      .eq('session_id', context.sessionId || '')
      .eq('group_jid', context.chatJid)
      .eq('is_group', true)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(messageLimit);

    if (error) {
      console.error('[DIGEST] DB error:', error);
      await sendReply(context.chatJid, 'Could not fetch messages. Try again later.', sock, context.rawMessage.key, context.queue);
      return;
    }

    if (!messages || messages.length === 0) {
      await sendReply(
        context.chatJid,
        'No recent messages found to summarize. The digest works with tracked group messages.',
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    // Format messages for AI, using real names
    const formattedMessages = messages
      .filter((m: any) => m.content && m.message_type === 'text')
      .map((m: any) => {
        const name = m.sender_name || 'Unknown';
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${name}: ${m.content}`;
      });

    if (formattedMessages.length === 0) {
      await sendReply(
        context.chatJid,
        'No text messages found to summarize in the recent period.',
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    // Count media messages
    const mediaCount = messages.filter((m: any) => m.message_type !== 'text').length;
    const textCount = formattedMessages.length;

    // Truncate if too many messages for context window
    const maxChars = 8000;
    let chatLog = formattedMessages.join('\n');
    if (chatLog.length > maxChars) {
      chatLog = chatLog.slice(-maxChars);
      chatLog = chatLog.slice(chatLog.indexOf('\n') + 1);
    }

    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: groqKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a WhatsApp group chat summarizer. Create a concise, easy-to-read digest of the conversation. Rules:
- Use the REAL NAMES of participants (as shown in the chat log)
- Organize by topic/theme, not chronologically
- Highlight key decisions, questions, and action items
- Note any important links or media shared
- Keep it concise — max 500 words
- Use WhatsApp formatting: *bold* for headers, _italic_ for emphasis
- Be neutral and objective
- If there were arguments or debates, summarize both sides fairly`,
        },
        {
          role: 'user',
          content: `Summarize this group chat (${textCount} text messages${mediaCount > 0 ? `, ${mediaCount} media messages` : ''}):\n\n${chatLog}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.5,
    });

    const summary = completion.choices[0]?.message?.content || 'Could not generate summary.';

    const header = `*GROUP DIGEST*\n` +
      `_${textCount} messages${mediaCount > 0 ? ` + ${mediaCount} media` : ''} summarized_\n\n`;

    await sendReply(context.chatJid, header + summary, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    console.error('[DIGEST] Error:', error?.message || error);
    await sendReply(context.chatJid, 'Digest generation failed. Try again later.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Register Smart Commands ────────────────────────────────────────────────

registerCommand({
  name: 'scan',
  aliases: ['scan', 'receipt', 'invoice'],
  category: 'utility',
  description: 'Scan receipt/invoice from photo',
  execute: async (ctx, args, sock) => {
    await handleScan(ctx, args, sock);
  },
});

registerCommand({
  name: 'music',
  aliases: ['music', 'song', 'findsong'],
  category: 'media',
  description: 'Search & send music as audio',
  execute: async (ctx, args, sock) => {
    await handleMusic(ctx, args, sock);
  },
});

registerCommand({
  name: 'digest',
  aliases: ['digest', 'summary', 'tldr'],
  category: 'utility',
  description: 'AI summary of group chat',
  execute: async (ctx, args, sock) => {
    await handleDigest(ctx, args, sock);
  },
});
