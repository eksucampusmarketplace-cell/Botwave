import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, pickResponse, getHelpHint, getQuotedMessage, axios } from './helpers';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';
import { callAI, AIQuotaExhaustedError, AIRateLimitError } from '../../lib/ai-provider';
import {
  weatherReplies,
  dictReplies,
  aiIntros,
} from '../utils/responsePools';
import {
  horoscopeSigns,
  horoscopeReadings,
  translateReplies,
} from '../utils/responsePools';
import dns from 'dns';
import { execFile } from 'child_process';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);
const execFileAsync = promisify(execFile);

async function handleAICommand(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const query = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!query) {
    await sendReply(
      context.chatJid,
      'Please provide a message after *!ai* or reply to a message with *!ai*\n\nExample: !ai What is quantum computing?',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    await sendReply(context.chatJid, 'Thinking...', sock, context.rawMessage.key, context.queue);

    const aiResponse = await callAI({
      prompt: query,
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt: 'You are a helpful WhatsApp bot assistant called BotWave. Keep responses concise and friendly. Max 300 words.',
    });

    const intro = pickResponse(aiIntros, vars, false);

    await sendReply(context.chatJid, `${intro}\n\n${aiResponse}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('AI error:', error);
    let msg = 'AI service temporarily unavailable. Please try again later.';
    if (error instanceof AIQuotaExhaustedError) {
      msg = 'AI quota exhausted — the Gemini API key needs billing enabled on its Google Cloud project. Contact the bot admin.';
    } else if (error instanceof AIRateLimitError) {
      const secs = Math.ceil(error.retryAfterMs / 1000);
      msg = `AI is rate-limited. Please try again in ~${secs} seconds.`;
    }
    await sendReply(
      context.chatJid,
      msg,
      sock,
      context.rawMessage.key,
      context.queue,
    );
  }
}

async function handleWeatherCommand(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, getHelpHint('weather'), sock, context.rawMessage.key, context.queue);
    return;
  }

  const city = args.join(' ');
  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    const intro = pickResponse(weatherReplies, vars, false);

    if (apiKey) {
      // OpenWeatherMap API (if key configured)
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
        { timeout: 10000 },
      );
      const data = response.data;
      const weatherInfo = `${intro}\n\n*${data.name}, ${data.sys.country}*\n\nTemp: ${data.main.temp}°C\nHumidity: ${data.main.humidity}%\nWind: ${data.wind.speed} m/s\nCondition: ${data.weather[0].description}\nFeels like: ${data.main.feels_like}°C`;
      await sendReply(context.chatJid, weatherInfo, sock, context.rawMessage.key, context.queue);
    } else {
      // Free fallback: wttr.in (no API key needed)
      const response = await axios.get(
        `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
        { timeout: 10000 },
      );
      const data = response.data;
      const current = data?.current_condition?.[0];
      const area = data?.nearest_area?.[0];
      if (!current) {
        await sendReply(context.chatJid, `Could not get weather for "${city}".`, sock, context.rawMessage.key, context.queue);
        return;
      }
      const areaName = area?.areaName?.[0]?.value || city;
      const country = area?.country?.[0]?.value || '';
      const weatherInfo = `${intro}\n\n*${areaName}${country ? ', ' + country : ''}*\n\nTemp: ${current.temp_C}°C\nHumidity: ${current.humidity}%\nWind: ${current.windspeedKmph} km/h\nCondition: ${current.weatherDesc?.[0]?.value || 'N/A'}\nFeels like: ${current.FeelsLikeC}°C`;
      await sendReply(context.chatJid, weatherInfo, sock, context.rawMessage.key, context.queue);
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendReply(context.chatJid, `City "${city}" not found.`, sock, context.rawMessage.key, context.queue);
    } else {
      console.error('Weather API error:', error);
      await sendReply(context.chatJid, 'Weather service temporarily unavailable. Try again later.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function handleDefine(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const word = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!word) {
    await sendReply(context.chatJid, getHelpHint('define'), sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
    const entry = response.data[0];

    if (!entry) {
      await sendReply(context.chatJid, `No definition found for "${word}".`, sock, context.rawMessage.key, context.queue);
      return;
    }

    const intro = pickResponse(dictReplies, vars, false);
    const phonetic = entry.phonetic || '';
    const meanings = entry.meanings
      .slice(0, 3)
      .map((m: any) => {
        const defs = m.definitions.slice(0, 2).map((d: any) => d.definition).join('\n  ');
        return `*${m.partOfSpeech}*\n  ${defs}`;
      })
      .join('\n\n');

    await sendReply(
      context.chatJid,
      `${intro}\n\n*${entry.word}* ${phonetic}\n\n${meanings}`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error: any) {
    if (error.response?.status === 404) {
      await sendReply(context.chatJid, `No definition found for "${word}".`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Dictionary service error.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function handleHoroscope(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, getHelpHint('horoscope'), sock, context.rawMessage.key, context.queue);
    return;
  }

  const sign = args[0].toLowerCase();
  const signData = horoscopeSigns[sign];

  if (!signData) {
    await sendReply(
      context.chatJid,
      `Unknown sign "${args[0]}". Use !horoscope to see all signs.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const reading = horoscopeReadings[Math.floor(Math.random() * horoscopeReadings.length)];

  await sendReply(
    context.chatJid,
    `${signData.emoji} *${sign.toUpperCase()}* (${signData.element})\n\n${reading}\n\n_${vars.date}_`,
    sock,
    context.rawMessage.key,
    context.queue,
  );
}

async function handleTranslate(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';

  const knownLangs = new Set([
    'af','sq','am','ar','hy','az','eu','be','bn','bs','bg','ca','ceb','zh','co','hr','cs','da',
    'nl','en','eo','et','fi','fr','fy','gl','ka','de','el','gu','ht','ha','haw','he','hi','hmn',
    'hu','is','ig','id','ga','it','ja','jw','kn','kk','km','rw','ko','ku','ky','lo','la','lv',
    'lt','lb','mk','mg','ms','ml','mt','mi','mr','mn','my','ne','no','ny','or','ps','fa','pl',
    'pt','pa','ro','ru','sm','gd','sr','st','sn','sd','si','sk','sl','so','es','su','sw','sv',
    'tl','tg','ta','tt','te','th','tr','tk','uk','ur','ug','uz','vi','cy','xh','yi','yo','zu',
  ]);

  // Parse args: !translate [target] [text] OR !translate [source] [target] [text]
  if (args.length < 1 || (args.length < 2 && !quotedText)) {
    await sendReply(
      context.chatJid,
      getHelpHint('translate') +
        '\n\n*Usage:*\n' +
        '• `!translate en Hello` — auto-detect source → English\n' +
        '• `!translate fr en Bonjour` — French → English\n' +
        '• Reply to a message with `!translate en` to translate it',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  let sourceLang = 'autodetect';
  let targetLang: string;
  let text: string;

  const firstArg = args[0].toLowerCase();
  const secondArg = args.length > 1 ? args[1].toLowerCase() : '';

  if (args.length >= 2 && knownLangs.has(firstArg) && knownLangs.has(secondArg)) {
    sourceLang = firstArg;
    targetLang = secondArg;
    text = args.length > 2 ? args.slice(2).join(' ') : quotedText;
  } else {
    targetLang = firstArg;
    text = args.length > 1 ? args.slice(1).join(' ') : quotedText;
  }

  if (!text) {
    await sendReply(context.chatJid, 'No text to translate. Provide text or reply to a message.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const langpair = `${sourceLang}|${targetLang}`;
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`,
      { timeout: 10000 },
    );

    const translated = response.data?.responseData?.translatedText;
    const detectedLang = response.data?.responseData?.detectedLanguage;
    if (!translated || response.data?.responseStatus === 403) {
      await sendReply(context.chatJid, 'Translation failed. Check language codes and try again.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const fromLabel = sourceLang === 'autodetect' && detectedLang ? detectedLang : sourceLang;
    let reply = pickResponse(translateReplies, vars, false);
    reply += `\n\n*Original (${fromLabel}):* ${text}\n*Translated (${targetLang}):* ${translated}`;

    // Promo check
    if (context.sessionId && context.userId) {
      const showPromo = await shouldShowPromo(
        context.sessionId,
        context.userId,
        context.senderJid,
        'translate',
      );
      if (showPromo) {
        reply += getPromoMessage();
      }
    }

    await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Translation error:', error);
    await sendReply(context.chatJid, 'Translation service error. Try again later.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleWiki(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const query = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!query) {
    await sendReply(context.chatJid, getHelpHint('wiki'), sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const response = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { timeout: 10000, headers: { 'User-Agent': 'BotWave/1.0 (WhatsApp Bot; contact@botwave.app)' } },
    );
    const data = response.data;
    if (data.type === 'disambiguation') {
      await sendReply(context.chatJid, `Multiple results for "${query}". Try being more specific.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    let msg = `*${data.title || query}*\n\n`;
    msg += data.extract || 'No summary available.';
    if (data.content_urls?.desktop?.page) {
      msg += `\n\n🔗 ${data.content_urls.desktop.page}`;
    }
    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await sendReply(context.chatJid, `No Wikipedia article found for "${args.join(' ')}". Try different keywords.`, sock, context.rawMessage.key, context.queue);
    } else {
      console.error('[WIKI] Error:', error);
      await sendReply(context.chatJid, 'Wikipedia lookup failed. Try again.', sock, context.rawMessage.key, context.queue);
    }
  }
}

async function handleLyrics(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const query = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!query) {
    await sendReply(context.chatJid, getHelpHint('lyrics'), sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    let artist = '';
    let title = query;
    if (query.includes(' - ')) {
      const parts = query.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    let lyrics = '';

    // Method 1: lrclib.net (free, no auth, large database)
    if (!lyrics) {
      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const resp = await axios.get(searchUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'BotWave/1.0' },
        });
        const results = resp.data;
        if (Array.isArray(results) && results.length > 0) {
          // Find best match — prefer plain lyrics over synced
          const best = results.find((r: any) => r.plainLyrics) || results[0];
          lyrics = best?.plainLyrics || best?.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]\s*/g, '') || '';
        }
      } catch (err: any) {
        console.log('[LYRICS] lrclib.net failed:', err?.message);
      }
    }

    // Method 2: lyrics.ovh (original, may be flaky)
    if (!lyrics && artist) {
      try {
        const response = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
          { timeout: 10000 },
        );
        lyrics = response.data?.lyrics || '';
      } catch (err) {
        console.log('[LYRICS] lyrics.ovh failed:', (err as Error)?.message);
      }
    }

    // Method 3: lyrics.ovh with guessed artist/title split
    if (!lyrics) {
      try {
        const searchParts = query.split(' ');
        const guessArtist = searchParts[0];
        const guessTitle = searchParts.slice(1).join(' ') || searchParts[0];
        const response = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(guessArtist)}/${encodeURIComponent(guessTitle)}`,
          { timeout: 10000 },
        );
        lyrics = response.data?.lyrics || '';
      } catch (err) {
        console.log('[LYRICS] lyrics.ovh guess failed:', (err as Error)?.message);
      }
    }

    // Method 4: Netease/other via lrclib artist+title search
    if (!lyrics && artist) {
      try {
        const resp = await axios.get(
          `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
          { timeout: 10000, headers: { 'User-Agent': 'BotWave/1.0' } },
        );
        const results = resp.data;
        if (Array.isArray(results) && results.length > 0) {
          const best = results.find((r: any) => r.plainLyrics) || results[0];
          lyrics = best?.plainLyrics || best?.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]\s*/g, '') || '';
        }
      } catch (err) {
        console.log('[LYRICS] fallback search failed:', (err as Error)?.message);
      }
    }

    if (!lyrics) {
      await sendReply(context.chatJid, `No lyrics found for "${query}".\n\nTry: !lyrics Artist - Song Title\nExample: !lyrics Ed Sheeran - Shape of You`, sock, context.rawMessage.key, context.queue);
      return;
    }

    // Clean up lyrics
    lyrics = lyrics.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // Truncate if too long for WhatsApp
    if (lyrics.length > 4000) {
      lyrics = lyrics.slice(0, 4000) + '\n\n... (truncated)';
    }
    await sendReply(context.chatJid, `*${query.toUpperCase()}*\n\n${lyrics}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[LYRICS] Error:', error);
    await sendReply(context.chatJid, 'Lyrics lookup failed. Try: !lyrics Artist - Song Title', sock, context.rawMessage.key, context.queue);
  }
}

async function handleCurrency(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (args.length < 3) {
    await sendReply(context.chatJid, getHelpHint('currency'), sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const amount = parseFloat(args[0]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(context.chatJid, 'Invalid amount. Use: !currency 100 USD NGN', sock, context.rawMessage.key, context.queue);
      return;
    }
    // Skip "to" if user writes "100 USD to NGN"
    const fromCurrency = args[1].toUpperCase();
    const toCurrency = (args[2].toLowerCase() === 'to' && args[3]) ? args[3].toUpperCase() : args[2].toUpperCase();

    const response = await axios.get(
      `https://api.frankfurter.dev/v2/rates?base=${fromCurrency}&quotes=${toCurrency}`,
      { timeout: 10000 },
    );
    const rates = response.data?.data?.[0]?.quotes;
    if (!rates || !rates[toCurrency]) {
      await sendReply(context.chatJid, `Could not find exchange rate for ${fromCurrency} to ${toCurrency}. Check currency codes.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    const rate = rates[toCurrency];
    const converted = (amount * rate).toFixed(2);
    await sendReply(
      context.chatJid,
      `*CURRENCY EXCHANGE*\n\n${amount.toLocaleString()} ${fromCurrency} = *${parseFloat(converted).toLocaleString()} ${toCurrency}*\n\nRate: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`,
      sock, context.rawMessage.key, context.queue,
    );
  } catch (error) {
    console.error('[CURRENCY] Error:', error);
    await sendReply(context.chatJid, 'Currency conversion failed. Check your currency codes (e.g. USD, EUR, NGN, GBP).', sock, context.rawMessage.key, context.queue);
  }
}

async function handleTimezone(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*TIMEZONE*\n\n!timezone [city]\n\nExample: !timezone London\nExample: !timezone Tokyo', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const city = args.join(' ');
    const response = await axios.get(`https://worldtimeapi.org/api/timezone`, { timeout: 10000 });
    const zones: string[] = response.data;
    const match = zones.find((z: string) => z.toLowerCase().includes(city.toLowerCase()));
    if (!match) {
      await sendReply(context.chatJid, `No timezone found for "${city}". Try a major city name.`, sock, context.rawMessage.key, context.queue);
      return;
    }
    const timeRes = await axios.get(`https://worldtimeapi.org/api/timezone/${match}`, { timeout: 10000 });
    const dt = new Date(timeRes.data.datetime);
    await sendReply(context.chatJid, `*TIMEZONE*\n\n*${match}*\nTime: ${dt.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\nDate: ${dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nUTC Offset: ${timeRes.data.utc_offset}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Failed to fetch timezone info.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleCrypto(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*CRYPTO PRICE*\n\n!crypto [coin]\n\nExamples:\n!crypto bitcoin\n!crypto ethereum\n!crypto dogecoin', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const coin = args[0].toLowerCase();
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}`, {
      params: { localization: false, tickers: false, community_data: false, developer_data: false },
      timeout: 10000,
    });
    const d = response.data;
    const price = d.market_data.current_price;
    const change24h = d.market_data.price_change_percentage_24h;
    const arrow = change24h >= 0 ? '📈' : '📉';
    await sendReply(context.chatJid, `*${d.name} (${d.symbol.toUpperCase()})* ${arrow}\n\n*USD:* $${price.usd?.toLocaleString()}\n*EUR:* €${price.eur?.toLocaleString()}\n*GBP:* £${price.gbp?.toLocaleString()}\n*NGN:* ₦${price.ngn?.toLocaleString()}\n\n*24h Change:* ${change24h?.toFixed(2)}%\n*Market Cap:* $${d.market_data.market_cap.usd?.toLocaleString()}\n*Rank:* #${d.market_cap_rank}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Coin not found. Use the full name (e.g., bitcoin, ethereum, dogecoin).', sock, context.rawMessage.key, context.queue);
  }
}

async function handleUrbanDictionary(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const term = args.length ? args.join(' ') : (quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '');
  if (!term) {
    await sendReply(context.chatJid, '*URBAN DICTIONARY*\n\n!ud [word or phrase]\n\nExample: !ud yeet\n\n_Tip: Reply to a message with !ud to look it up_', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const response = await axios.get(`https://api.urbandictionary.com/v0/define`, {
      params: { term },
      timeout: 10000,
    });
    if (!response.data.list?.length) {
      await sendReply(context.chatJid, `No definition found for "${term}".`, sock, context.rawMessage.key, context.queue);
      return;
    }
    const def = response.data.list[0];
    const clean = (s: string) => s.replace(/\[|\]/g, '').slice(0, 1000);
    await sendReply(context.chatJid, `*${term.toUpperCase()}*\n\n*Definition:*\n${clean(def.definition)}\n\n*Example:*\n${clean(def.example || 'N/A')}\n\n👍 ${def.thumbs_up}  👎 ${def.thumbs_down}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Failed to look up definition.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleIpLookup(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*DNS/IP LOOKUP*\n\n!ip [domain]\n\nExample: !ip google.com', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const domain = args[0].replace(/^https?:\/\//, '').split('/')[0];
    const addresses = await dnsResolve(domain);
    await sendReply(context.chatJid, `*DNS LOOKUP: ${domain}*\n\n${(addresses as string[]).map((ip: string) => `• ${ip}`).join('\n')}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Could not resolve that domain.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Fun & Creative Commands ────────────────────────────────────────────────

const fontMaps: Record<string, Record<string, string>> = {
  bold: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D41A + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D400 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7CE + i)]))),
  italic: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D44E + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D434 + i)]))),
  bolditalic: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D482 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D468 + i)]))),
  monospace: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D68A + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D670 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7F6 + i)]))),
  double: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D552 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D538 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0x1D7D8 + i)]))),
  script: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D4B6 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D49C + i)]))),
  fraktur: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0x1D51E + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0x1D504 + i)]))),
  vaporwave: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, String.fromCodePoint(0xFF41 + i)]).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, String.fromCodePoint(0xFF21 + i)])).concat('0123456789'.split('').map((c, i) => [c, String.fromCodePoint(0xFF10 + i)]))),
  smallcaps: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c, i) => [c, 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'[i]])),
};


// ─── More Info Lookup Commands ──────────────────────────────────────────────

async function handleNpm(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!npm [package name]', sock, context.rawMessage.key, context.queue); return; }
  try {
    const pkg = args[0].toLowerCase();
    const response = await axios.get(`https://registry.npmjs.org/${pkg}`, { timeout: 10000 });
    const d = response.data;
    const latest = d['dist-tags']?.latest || 'unknown';
    const desc = d.description || 'No description';
    const license = d.license || 'Unknown';
    await sendReply(context.chatJid, `*NPM: ${d.name}*\n\n*Version:* ${latest}\n*Description:* ${desc}\n*License:* ${license}\n*Link:* https://npmjs.com/package/${d.name}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Package not found on npm.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleWhois(context: MessageContext, args: string[], sock: any): Promise<void> {
  // Helper to extract a clean phone number from any JID format
  function extractPhoneNumber(jid: string): string | null {
    // Standard format: 2348012345678@s.whatsapp.net
    const standard = jid.replace(/@s\.whatsapp\.net$|@g\.us$/, '');
    if (/^\d{7,15}$/.test(standard)) return standard;
    // LID or other format — can't extract number
    return null;
  }

  // Helper to build user info card
  async function buildUserCard(targetJid: string, displayName: string): Promise<string> {
    const phoneNumber = extractPhoneNumber(targetJid);

    // Try to fetch full profile via Evolution API
    let profileName = displayName;
    let aboutText = '';
    let profilePicUrl = '';

    try {
      if (typeof sock.fetchProfile === 'function') {
        const profile = await sock.fetchProfile(targetJid);
        if (profile) {
          if (profile.name || profile.pushName || profile.verifiedName) {
            profileName = profile.name || profile.pushName || profile.verifiedName || displayName;
          }
          if (profile.status || profile.about) {
            aboutText = profile.status || profile.about || '';
          }
          if (profile.picture || profile.profilePictureUrl || profile.imgUrl) {
            profilePicUrl = profile.picture || profile.profilePictureUrl || profile.imgUrl || '';
          }
        }
      }
    } catch { /* profile fetch failed — privacy settings or API unavailable */ }

    // Fallback: try to get profile pic separately
    if (!profilePicUrl) {
      try {
        if (typeof sock.fetchProfilePictureUrl === 'function') {
          const picUrl = await sock.fetchProfilePictureUrl(targetJid);
          if (picUrl) profilePicUrl = picUrl;
        }
      } catch { /* no profile pic or privacy settings */ }
    }

    let info = `*WHO IS THIS?*\n\n`;
    info += `*Name:* ${profileName}\n`;
    if (phoneNumber) {
      info += `*Number:* +${phoneNumber}\n`;
    }
    if (aboutText) info += `*About:* ${aboutText}\n`;
    if (profilePicUrl) info += `*Profile Pic:* ${profilePicUrl}\n`;
    info += `\n_Reply to any message with !whois to look up the sender._`;
    return info;
  }

  // ── 1. Replying to someone's message → show that user's info ──
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const msg = context.rawMessage?.message || context.rawMessage;
  // Check all message types for contextInfo
  const contextInfoPath = context.rawMessage?.contextInfo
    || msg?.extendedTextMessage?.contextInfo
    || msg?.imageMessage?.contextInfo
    || msg?.videoMessage?.contextInfo
    || msg?.audioMessage?.contextInfo
    || msg?.documentMessage?.contextInfo
    || msg?.stickerMessage?.contextInfo
    || msg?.contactMessage?.contextInfo
    || msg?.locationMessage?.contextInfo;
  const quotedParticipant = contextInfoPath?.participant;

  if (quotedMsg && quotedParticipant) {
    try {
      const targetJid = quotedParticipant.includes('@')
        ? quotedParticipant
        : quotedParticipant + '@s.whatsapp.net';
      // pushName may be on contextInfo or on the quoted message's key
      const displayName = contextInfoPath?.pushName
        || context.rawMessage?.pushName
        || 'Unknown';
      const info = await buildUserCard(targetJid, displayName);
      await sendReply(context.chatJid, info, sock, context.rawMessage.key, context.queue);
    } catch (error) {
      console.error('[WHOIS-USER] Error:', error);
      await sendReply(context.chatJid, 'Could not fetch user info. They may have privacy settings enabled.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // ── 2. @mention lookup: !whois @someone ──
  const mentionedJids: string[] = contextInfoPath?.mentionedJid || [];

  if (mentionedJids.length > 0) {
    try {
      const targetJid = mentionedJids[0];
      const info = await buildUserCard(targetJid, 'Mentioned User');
      await sendReply(context.chatJid, info, sock, context.rawMessage.key, context.queue);
    } catch (error) {
      console.error('[WHOIS-MENTION] Error:', error);
      await sendReply(context.chatJid, 'Could not fetch mentioned user info.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // ── 3. Phone number lookup: !whois 2348012345678 ──
  if (args.length && args[0].match(/^\+?\d{7,15}$/)) {
    try {
      const phone = args[0].replace(/^\+/, '');
      const targetJid = phone + '@s.whatsapp.net';
      const info = await buildUserCard(targetJid, 'Phone Lookup');
      await sendReply(context.chatJid, info, sock, context.rawMessage.key, context.queue);
    } catch (error) {
      console.error('[WHOIS-PHONE] Error:', error);
      await sendReply(context.chatJid, 'Could not fetch info for that number.', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // ── 4. Self lookup: !whois with no args ──
  if (!args.length) {
    try {
      const info = await buildUserCard(context.senderJid, context.pushName || 'You');
      await sendReply(context.chatJid, info, sock, context.rawMessage.key, context.queue);
    } catch (error) {
      console.error('[WHOIS-SELF] Error:', error);
      await sendReply(context.chatJid, `*WHOIS*\n\n*Self lookup:* !whois\n*User lookup:* Reply to someone's message with !whois\n*Mention:* !whois @someone\n*Phone:* !whois 2348012345678\n*Domain:* !whois google.com`, sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  // ── 5. Domain WHOIS lookup: !whois google.com ──
  try {
    const domain = args[0].replace(/^https?:\/\//, '').split('/')[0];
    const { stdout } = await execFileAsync('whois', [domain], { timeout: 10000 });
    const lines = stdout.split('\n').filter((l: string) => l.match(/domain name|registrar|creation|expir|name server|updated/i)).slice(0, 10);
    await sendReply(context.chatJid, `*WHOIS: ${domain}*\n\n${lines.join('\n') || 'No WHOIS data available.'}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'WHOIS lookup failed. The whois tool may not be installed on this server.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleHeaders(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!headers [url]', sock, context.rawMessage.key, context.queue); return; }
  let url = args[0];
  if (!url.startsWith('http')) url = 'https://' + url;
  try {
    const response = await axios.head(url, { timeout: 10000, maxRedirects: 3 });
    const hdrs = Object.entries(response.headers).map(([k, v]) => `*${k}:* ${v}`).join('\n');
    await sendReply(context.chatJid, `*HTTP HEADERS*\n*Status:* ${response.status}\n\n${hdrs}`, sock, context.rawMessage.key, context.queue);
  } catch (error: any) {
    await sendReply(context.chatJid, `Failed: ${error?.message || 'Unknown error'}`, sock, context.rawMessage.key, context.queue);
  }
}

async function handleCountry(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) { await sendReply(context.chatJid, '!country [name]\n\nExample: !country Nigeria', sock, context.rawMessage.key, context.queue); return; }
  try {
    const name = args.join(' ');
    const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`, { timeout: 10000 });
    const c = response.data[0];
    const currencies = c.currencies ? Object.values(c.currencies).map((v: any) => `${v.name} (${v.symbol})`).join(', ') : 'N/A';
    const languages = c.languages ? Object.values(c.languages).join(', ') : 'N/A';
    await sendReply(context.chatJid, `*${c.flag} ${c.name.common}*\n\n*Official:* ${c.name.official}\n*Capital:* ${c.capital?.join(', ') || 'N/A'}\n*Population:* ${c.population?.toLocaleString()}\n*Region:* ${c.region} (${c.subregion || ''})\n*Currency:* ${currencies}\n*Languages:* ${languages}\n*Timezone:* ${c.timezones?.[0] || 'N/A'}\n*Calling Code:* ${c.idd?.root || ''}${c.idd?.suffixes?.[0] || ''}`, sock, context.rawMessage.key, context.queue);
  } catch {
    await sendReply(context.chatJid, 'Country not found.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Register Info Commands ─────────────────────────────────────────────────

registerCommand({ name: 'ai', aliases: ['ai', 'ask', 'chat'], category: 'info', description: 'AI chat', execute: (ctx, args, sock, vars) => handleAICommand(ctx, args, sock, vars) });
registerCommand({ name: 'weather', aliases: ['weather', 'w', 'forecast'], category: 'info', description: 'Get weather info', execute: (ctx, args, sock, vars) => handleWeatherCommand(ctx, args, sock, vars) });
registerCommand({ name: 'define', aliases: ['define', 'dictionary', 'dict'], category: 'info', description: 'Dictionary lookup', execute: (ctx, args, sock, vars) => handleDefine(ctx, args, sock, vars) });
registerCommand({ name: 'horoscope', aliases: ['horoscope', 'zodiac'], category: 'info', description: 'Daily horoscope', execute: (ctx, args, sock, vars) => handleHoroscope(ctx, args, sock, vars) });
registerCommand({ name: 'translate', aliases: ['translate', 'tr'], category: 'info', description: 'Translate text', execute: (ctx, args, sock, vars) => handleTranslate(ctx, args, sock, vars) });
registerCommand({ name: 'wiki', aliases: ['wiki', 'wikipedia'], category: 'info', description: 'Wikipedia lookup', execute: (ctx, args, sock) => handleWiki(ctx, args, sock) });
registerCommand({ name: 'lyrics', aliases: ['lyrics', 'lyric'], category: 'info', description: 'Song lyrics', execute: (ctx, args, sock) => handleLyrics(ctx, args, sock) });
registerCommand({ name: 'currency', aliases: ['currency', 'exchange', 'fx'], category: 'info', description: 'Currency conversion', execute: (ctx, args, sock) => handleCurrency(ctx, args, sock) });
registerCommand({ name: 'timezone', aliases: ['timezone', 'tz', 'time'], category: 'info', description: 'World time zones', execute: (ctx, args, sock) => handleTimezone(ctx, args, sock) });
registerCommand({ name: 'crypto', aliases: ['crypto', 'coin'], category: 'info', description: 'Cryptocurrency prices', execute: (ctx, args, sock) => handleCrypto(ctx, args, sock) });
registerCommand({ name: 'ud', aliases: ['ud', 'urban'], category: 'info', description: 'Urban Dictionary', execute: (ctx, args, sock) => handleUrbanDictionary(ctx, args, sock) });
registerCommand({ name: 'ip', aliases: ['ip', 'dns', 'nslookup'], category: 'info', description: 'IP/DNS lookup', execute: (ctx, args, sock) => handleIpLookup(ctx, args, sock) });
registerCommand({ name: 'npm', aliases: ['npm'], category: 'info', description: 'NPM package info', execute: (ctx, args, sock) => handleNpm(ctx, args, sock) });
registerCommand({ name: 'whois', aliases: ['whois'], category: 'info', description: 'WHOIS lookup', execute: (ctx, args, sock) => handleWhois(ctx, args, sock) });
registerCommand({ name: 'headers', aliases: ['headers', 'httpheaders'], category: 'info', description: 'HTTP headers', execute: (ctx, args, sock) => handleHeaders(ctx, args, sock) });
registerCommand({ name: 'country', aliases: ['country'], category: 'info', description: 'Country info', execute: (ctx, args, sock) => handleCountry(ctx, args, sock) });
