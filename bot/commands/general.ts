import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, pickResponse, getHelpHint, botStartTime, axios, requestLangMap } from './helpers';
import { helpIntros, pingReplies, unknownCommandReplies } from '../utils/responsePools';
import { currentTimeStr, currentDateStr } from '../utils/antiban';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { getAllCommands } from './registry';
import { translateText } from '../utils/translate';

async function sendHelp(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  // If user types "!help text", show quick text menu; otherwise default to docx
  const p = context.commandPrefix || '!';
  if (args.length > 0 && (args[0].toLowerCase() === 'text' || args[0].toLowerCase() === 'quick' || args[0].toLowerCase() === 'menu')) {
    const intro = pickResponse(helpIntros, vars, false);
    let helpMessage = `${intro}

*GENERAL*
!help — Full guide (.docx)
!help text — Quick text menu
!ping — Bot status
!sticker — Make sticker
!joke / !quote / !meme — Fun
!lang [code] — Set your language (e.g. !lang fr)

*AI & SMART*
!ai [message] — AI chat (Gemini)
!img [prompt] — AI image generation
!scan — Receipt/invoice scanner (reply to photo)
!music [song] — Search & send music as audio
!digest — AI summary of group chat
!ask [question] — Smart FAQ

*TOOLS*
!weather / !define / !wiki / !horoscope
!translate / !lyrics / !tts / !currency
!doc / !topdf / !todoc / !totxt
!qr / !short / !note / !remind / !schedule
!calc / !countdown / !cal / !timezone

*STUDY*
!study — Open Study Hub (one-time login link)
!flashcard — Create & review flashcards
!quiz — Quiz from notes or trivia
!pomodoro — Focus timer (25/5 min)

*MEDIA*
!viewonce / !viewonce pr / !toimg / !togif / !toaudio
!removebg / !carbon / !screenshot / !ocr
!blur / !grayscale / !rotate / !resize
!invert / !brightness / !contrast
!crop / !compress / !wallpaper / !qrread

*TEXT*
!reverse / !upper / !lower / !mock
!clap / !tiny / !fliptext / !morse
!braille / !ascii / !font

*PROFILE*
!bio / !setpp / !read

*UTILITIES*
!forward / !base64 / !hash / !color
!palette / !pick / !coinflip / !dice
!password / !uuid / !epoch / !bmi / !age
!unit / !paste / !uptime / !id / !stats

*INFO*
!crypto / !ud / !ip / !npm / !whois [domain]
!whois (reply) — user lookup (name, number, about)
!headers / !country / !emoji

*CREATIVE*
!logo [style] [name] — Generate logos (45+ styles)
!logo preview — View all styles
!brandkit [name] — Brand kit (3 formats)

*SOCIAL & GROUP*
!afk [reason] — Away status (auto-reply)
!roast / !ghost / !type / !wrap / !profile
!tldr2 — Summarize long messages (no AI)
!encrypt / !decrypt — Secret messages
!alias set [name] = [cmd] — Shortcuts
!chain [cmd1] | [cmd2] — Pipe commands
!recap — Group chat summary
!react [emoji] when [word] — Auto-react
!spy — Group analytics dashboard
!deadman / !alive — Safety switch
!birthday set DD/MM — Birthday tracker

*ADMIN*
!download / !save / !savestatus / !tagall
!group / !purge / !settings
!kick / !promote / !demote
!welcome / !goodbye
!antidelete / !recover / !recover pr / !refer
!balance / !plan — Rewards & subscription

*GAMES*
!play / !trivia / !hangman / !wordchain
!answer / !poll / !vote / !leaderboard
!8ball / !truth / !dare / !ship
!compliment / !fortune / !fact / !riddle

*MULTIPLAYER*
!game chess — Start online chess match
!game tictactoe — Start Tic-Tac-Toe
!game join <id> — Join a game room
!game spectate <id> — Watch a live game
!game stats — Your win/loss record
!game leaderboard — Top players

_Tip: Most text commands support reply-to — reply to any message with the command to process that text (e.g. reply with !translate es)_

_Send *!help* for the full .docx guide._
_Only the bot owner can use commands._

_Your chats are private — the bot owner cannot read or access your messages._

📢 *Follow BotWave:* https://whatsapp.com/channel/0029Vb89xfPCMY0IvFWi6B0X`;
    if (p !== '!') helpMessage = helpMessage.replace(/!/g, p);
    await sendReply(context.chatJid, helpMessage, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Default: send docx guide
  await sendHelpDocx(context, sock);
}

/**
 * Generate a comprehensive .docx help guide with deep explanations.
 */
async function sendHelpDocx(context: MessageContext, sock: any): Promise<void> {
  try {
    const sections = [
      {
        title: 'GENERAL COMMANDS',
        commands: [
          {
            name: '!help',
            usage: '!help  or  !help doc',
            description: 'Shows the full command menu in chat. Use "!help doc" to receive this comprehensive .docx guide with deep explanations of every command, usage examples, and tips.',
          },
          {
            name: '!lang',
            usage: '!lang [code]  |  !lang list  |  !lang set [code]  |  !lang reset',
            description: 'Set your preferred language for bot responses. Use "!lang list" to see all 20 supported languages. Set your language with "!lang fr" (French), "!lang yo" (Yoruba), "!lang hi" (Hindi), etc. All bot responses will be automatically translated to your chosen language. Use "!lang reset" to switch back to English.',
          },
          {
            name: '!ping',
            usage: '!ping',
            description: 'Checks if the bot is online and responsive. Replies with a quick status message confirming the bot is alive and running. Useful for verifying your connection.',
          },
          {
            name: '!sticker',
            usage: '!sticker  |  !sticker crop  |  !sticker circle  |  !sticker rounded',
            description: 'Converts an image, video, or GIF into a WhatsApp sticker. Send or reply to a media file with "!sticker" to create a default full-size sticker. Append "crop" to auto-crop to a square, "circle" for a circular mask, or "rounded" for rounded corners.',
          },
          {
            name: '!joke',
            usage: '!joke',
            description: 'Sends a random joke from a curated collection. Every response is unique — the bot uses an anti-repeat system so you will not see the same joke twice in a row.',
          },
          {
            name: '!quote',
            usage: '!quote',
            description: 'Sends a random inspirational or motivational quote. Great for daily motivation or sharing with friends.',
          },
          {
            name: '!meme',
            usage: '!meme',
            description: 'Fetches a random trending meme image from Reddit and sends it directly in chat. The meme is sourced from popular subreddits for fresh content.',
          },
        ],
      },
      {
        title: 'TOOLS',
        commands: [
          {
            name: '!ai',
            usage: '!ai [your message]  or  reply to a message with !ai',
            description: 'Chat with an AI assistant powered by Google Gemini. Send any question, request, or prompt and get an intelligent response. You can also reply to any message with "!ai" to ask the AI about that text. Works automatically — no API key needed. Supports multi-turn conversation context.',
          },
          {
            name: '!weather',
            usage: '!weather [city name]',
            description: 'Gets current weather information for any city worldwide. Shows temperature, conditions, humidity, and wind speed. Example: "!weather Lagos" or "!weather New York".',
          },
          {
            name: '!define',
            usage: '!define [word]  or  reply to a message with !define',
            description: 'Looks up the dictionary definition of any English word. Returns the meaning, part of speech, and example usage. You can also reply to a message containing a word with "!define". Example: "!define serendipity".',
          },
          {
            name: '!horoscope',
            usage: '!horoscope [zodiac sign]',
            description: 'Gets your daily horoscope for any zodiac sign. Supported signs: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces. Example: "!horoscope leo".',
          },
          {
            name: '!translate',
            usage: '!translate [lang] [text]  or  reply with !translate [lang]',
            description: 'Translates text to another language. You can reply to any message with "!translate es" to translate it. Common language codes: es (Spanish), fr (French), de (German), pt (Portuguese), ja (Japanese), ko (Korean), zh (Chinese), ar (Arabic), hi (Hindi). Example: "!translate fr Good morning everyone".',
          },
          {
            name: '!doc',
            usage: '!doc [title] | [content]  or  reply with !doc [title]',
            description: 'Creates a formatted .docx Word document. Supports images — send an image with caption "!doc Title" to embed it. Three ways to use:\n1. Title + Content: "!doc My Essay | Your content here"\n2. Reply mode: Reply to any message with "!doc My Title"\n3. Content only: "!doc Just type content" — auto-titled as "Document".',
          },
          {
            name: '!topdf',
            usage: 'Reply to a .docx/.txt with !topdf',
            description: 'Converts a .docx or .txt file to PDF.',
          },
          {
            name: '!todoc',
            usage: 'Reply to a .txt/.pdf with !todoc',
            description: 'Converts a .txt or .pdf file to .docx (Word).',
          },
          {
            name: '!totxt',
            usage: 'Reply to a .docx/.pdf with !totxt',
            description: 'Extracts plain text from a .docx or .pdf file.',
          },
          {
            name: '!calc',
            usage: '!calc [expression]',
            description: 'Evaluates a mathematical expression. Supports basic arithmetic (+, -, *, /), parentheses, percentages, and more. Example: "!calc (25 * 4) + 10".',
          },
          {
            name: '!note',
            usage: '!note save [text]  |  !note list  |  !note view [id]  |  !note delete [id]',
            description: 'Personal note-taking system. Save quick notes, list all saved notes, view a specific note by ID, or delete notes you no longer need. Notes are stored per user and persist across sessions.',
          },
          {
            name: '!qr',
            usage: '!qr [text or URL]',
            description: 'Generates a QR code image from any text or URL. The QR code is sent as an image you can scan with any QR reader. Example: "!qr https://google.com" or "!qr Hello World".',
          },
          {
            name: '!tts',
            usage: '!tts [text]  or  reply to a message with !tts',
            description: 'Converts text to a voice note (Text-to-Speech). The bot generates an audio message that plays like a regular WhatsApp voice note. You can also reply to any message with "!tts" to convert it to speech. Example: "!tts Good morning everyone".',
          },
          {
            name: '!wiki',
            usage: '!wiki [topic]  or  reply to a message with !wiki',
            description: 'Fetches a Wikipedia summary for any topic. Returns a concise overview with key facts. You can also reply to a message with "!wiki" to look up that text. Example: "!wiki artificial intelligence" or "!wiki Nigeria".',
          },
          {
            name: '!lyrics',
            usage: '!lyrics [song name]  or  reply to a message with !lyrics',
            description: 'Searches for and displays song lyrics. You can also reply to a message containing a song name with "!lyrics". Example: "!lyrics Bohemian Rhapsody" or "!lyrics Shape of You Ed Sheeran". Returns the full lyrics text.',
          },
          {
            name: '!currency',
            usage: '!currency [amount] [FROM] [TO]',
            description: 'Converts currency between any two supported currencies using live exchange rates. Example: "!currency 100 USD NGN" converts 100 US Dollars to Nigerian Naira. "!currency 50 EUR GBP" converts 50 Euros to British Pounds.',
          },
          {
            name: '!short',
            usage: '!short [url]',
            description: 'Shortens a long URL into a compact, shareable link. Useful for cleaning up long URLs before sharing. Example: "!short https://very-long-website-url.com/path/to/page".',
          },
          {
            name: '!img',
            usage: '!img [prompt]',
            description: 'Generates an AI image from a text description. Describe what you want to see and the bot creates an image using AI. Example: "!img a sunset over mountains" or "!img anatomy textbook cover".',
          },
        ],
      },
      {
        title: 'PRODUCTIVITY',
        commands: [
          {
            name: '!remind',
            usage: '!remind [time] [message]',
            description: 'Sets a personal reminder. The bot will message you back after the specified time with your reminder. Time format: "5m" (minutes), "2h" (hours), "1d" (days). Example: "!remind 30m Check the oven" or "!remind 2h Call mom".',
          },
          {
            name: '!schedule',
            usage: '!schedule [time] [message]',
            description: 'Schedules a message to be sent at a specific time. Similar to reminders but designed for scheduled messaging. Example: "!schedule 1h Good night everyone".',
          },
          {
            name: '!stats',
            usage: '!stats',
            description: 'Shows bot statistics and session information including uptime, messages processed, active session details, and system health metrics.',
          },
        ],
      },
      {
        title: 'GAMES & FUN',
        commands: [
          {
            name: '!play',
            usage: '!play numberguess',
            description: 'Starts a number guessing game. The bot picks a random number and you try to guess it. The bot tells you if your guess is too high or too low. Use "!answer [number]" to submit guesses.',
          },
          {
            name: '!trivia',
            usage: '!trivia',
            description: 'Starts a multiple-choice trivia question. Answer with "!answer [letter]" (A, B, C, or D). Correct answers earn points on the leaderboard. Questions span various categories.',
          },
          {
            name: '!hangman',
            usage: '!hangman',
            description: 'Starts a hangman word-guessing game. Guess letters one at a time with "!answer [letter]". You have limited wrong guesses before the game ends. The word is revealed on completion.',
          },
          {
            name: '!wordchain',
            usage: '!wordchain',
            description: 'Starts a word chain game. Each player must say a word that starts with the last letter of the previous word. Use "!answer [word]" to continue the chain. Great for group fun.',
          },
          {
            name: '!answer',
            usage: '!answer [text]',
            description: 'Submits your answer for any active game (trivia, hangman, wordchain, numberguess). The response format depends on the active game type.',
          },
          {
            name: '!poll',
            usage: '!poll [question] | [option1] | [option2] | ...',
            description: 'Creates a poll with multiple options. Separate the question and options with the pipe character "|". Example: "!poll Best color? | Red | Blue | Green". Others vote with "!vote [number]".',
          },
          {
            name: '!vote',
            usage: '!vote [option number]',
            description: 'Casts your vote on the active poll. Use the number corresponding to your choice. Example: "!vote 2" votes for the second option.',
          },
          {
            name: '!leaderboard',
            usage: '!leaderboard',
            description: 'Shows the top active users ranked by points. Points are earned by playing games, answering trivia correctly, and participating in activities.',
          },
          {
            name: '!8ball',
            usage: '!8ball [question]',
            description: 'Ask the Magic 8-Ball a yes/no question and receive a mystical answer. Example: "!8ball Will I pass my exam?".',
          },
          {
            name: '!truth',
            usage: '!truth',
            description: 'Gives you a random "Truth" question from the classic Truth or Dare game. Great for group conversations and getting to know each other.',
          },
          {
            name: '!dare',
            usage: '!dare',
            description: 'Gives you a random dare challenge. Fun and often silly challenges to liven up group chats.',
          },
          {
            name: '!ship',
            usage: '!ship [name1] [name2]',
            description: 'Calculates a fun "love compatibility" percentage between two names. Example: "!ship Alice Bob". Just for fun — not real relationship advice!',
          },
          {
            name: '!compliment',
            usage: '!compliment [name]',
            description: 'Generates a random, wholesome compliment for the named person. Example: "!compliment Sarah". Brightens someone\'s day!',
          },
          {
            name: '!fortune',
            usage: '!fortune',
            description: 'Opens a virtual fortune cookie with a random fortune or piece of wisdom inside.',
          },
          {
            name: '!fact',
            usage: '!fact',
            description: 'Shares a random fun fact. Learn something new every time — facts cover science, history, nature, and more.',
          },
          {
            name: '!riddle',
            usage: '!riddle',
            description: 'Sends a random riddle. You have 30 seconds to think, then the answer is revealed. Test your brain!',
          },
        ],
      },
      {
        title: 'MULTIPLAYER ONLINE GAMES',
        commands: [
          {
            name: '!game chess',
            usage: '!game chess',
            description: 'Start an online chess match. Creates a game room and sends a link — the opponent clicks to join and play in the browser. Features: real-time play, move timers, ELO ratings, opening book detection, premoves, board arrows, sound effects, 7 piece styles, 5 board themes.',
          },
          {
            name: '!game tictactoe',
            usage: '!game tictactoe',
            description: 'Start a Tic-Tac-Toe game. Quick casual game played in the browser. Alias: !game ttt',
          },
          {
            name: '!game join',
            usage: '!game join <room-id>',
            description: 'Join an existing game room by its ID. The room ID is shown when someone creates a game.',
          },
          {
            name: '!game spectate',
            usage: '!game spectate <room-id>',
            description: 'Watch a live game as a spectator. You see the board with a slight delay and can react with emojis. Alias: !game watch',
          },
          {
            name: '!game stats',
            usage: '!game stats',
            description: 'View your multiplayer game statistics — wins, losses, draws, and ELO rating for each game type.',
          },
          {
            name: '!game leaderboard',
            usage: '!game leaderboard [type]',
            description: 'View the top-rated players. Optionally specify a game type (chess/tictactoe). Default: chess. Alias: !game lb',
          },
        ],
      },
      {
        title: 'SOCIAL',
        commands: [
          {
            name: '!afk',
            usage: '!afk [reason]  |  !afk off',
            description: 'Sets your AFK (Away From Keyboard) status. When enabled, anyone who messages or tags you will get an automatic reply with your AFK reason. Use "!afk off" to disable. Example: "!afk sleeping" or "!afk in class".',
          },
          {
            name: '!download',
            usage: '!download [URL]',
            description: 'Downloads media from supported platforms including YouTube, TikTok, Instagram, and Twitter/X. Paste the link after the command and the bot will fetch and send the media. Example: "!download https://youtube.com/watch?v=...".',
          },
          {
            name: '!save',
            usage: '!save (reply to a message)',
            description: 'Saves a message to your personal chat. Reply to any message with "!save" and the bot will forward that message to your DM for safekeeping. Great for bookmarking important messages.',
          },
          {
            name: '!savestatus',
            usage: '!savestatus  |  !savestatus [custom caption]',
            description: 'Saves a status and sends it to the status poster\'s chat. Reply to someone\'s status — text, image, or video — with "!savestatus" and the media will be downloaded and sent to that person\'s chat directly.\n\nCaption Support:\nYou can add a custom caption: "!savestatus Nice pic!" will send the media with your caption.\n\nIf no custom caption is provided, the original caption (if any) is preserved.\n\nSupported Media Types:\n- Text messages\n- Images with optional caption\n- Videos with optional caption\n\nAliases: !ss, !savest',
          },
          {
            name: '!tagall',
            usage: '!tagall [message]',
            description: 'Mentions all members of the current group in a single message. Only works in group chats. You can add an optional message that appears with the mentions. Example: "!tagall Meeting at 3pm today".',
          },
          {
            name: '!group',
            usage: '!group',
            description: 'Displays detailed group information including the group name, description, creation date, participant count, and admin list. Only works in group chats.',
          },
          {
            name: '!kick',
            usage: '!kick @mention  or  reply with !kick',
            description: 'Removes a member from the group. Bot must be admin. Reply to their message or mention them.',
          },
          {
            name: '!promote',
            usage: '!promote @mention  or  reply with !promote',
            description: 'Promotes a member to group admin. Bot must be admin.',
          },
          {
            name: '!demote',
            usage: '!demote @mention  or  reply with !demote',
            description: 'Removes admin status from a member. Bot must be admin.',
          },
          {
            name: '!settings',
            usage: '!settings [option] [value]',
            description: 'Configure bot settings via WhatsApp. Options: afk on/off, afk msg [text], name [name], welcome on/off, status.',
          },
          {
            name: '!welcome',
            usage: '!welcome [message]  or  !welcome reset',
            description: 'Set a custom welcome message for new group members. Use {name}, {group}, {time}, {date}, {count} as placeholders. Must enable with !settings welcome on first.',
          },
          {
            name: '!goodbye',
            usage: '!goodbye [message]  or  !goodbye reset',
            description: 'Set a custom goodbye message when members leave the group. Same placeholders as !welcome.',
          },
          // Autoview removed
          {
            name: '!antidelete',
            usage: '!antidelete on/off',
            description: 'Toggle deleted message recovery. When enabled, the bot silently caches messages. If someone deletes a message, use !recover to view it. Supports text, images, videos, stickers, audio, and documents.\n\nAliases: !antidel',
          },
          {
            name: '!recover',
            usage: '!recover',
            description: 'Shows messages deleted in the last 10 minutes in this chat. In groups, tags the person who deleted each message. Requires !antidelete to be enabled first. Re-sends the actual media (images, videos, stickers) not just a description. Use *!recover pr* to send them to your private chat silently instead — the deleter won\'t be alerted.',
          },
          {
            name: '!balance',
            usage: '!balance',
            description: 'Check your reward balance and progress toward free airtime cashout at ₦100.',
          },
          {
            name: '!plan',
            usage: '!plan',
            description: 'Check your current subscription plan, message quota usage, and session limits.',
          },
          {
            name: '!refer',
            usage: '!refer',
            description: 'Get your unique referral code and shareable signup link. Share with friends to earn ₦20 per signup — they get ₦10 too. Shows your code, link, and referral stats.\n\nAliases: !referral, !invite',
          },
        ],
      },
      {
        title: 'MEDIA & CONVERSION',
        commands: [
          {
            name: '!viewonce',
            usage: '!viewonce (reply to view-once message)',
            description: 'Saves a "view once" image, video, or audio and resends it as a normal message in the same chat. Reply to any view-once media with "!viewonce" to save it before it disappears. Use *!viewonce pr* to save it to your private chat silently instead — the sender won\'t be alerted.\n\nAliases: !vo',
          },
          {
            name: '!toimg',
            usage: '!toimg (reply to sticker)',
            description: 'Converts a WhatsApp sticker back to a PNG image. Reply to any sticker with "!toimg" to get the original image. Works with both static and animated stickers (first frame for animated).\n\nAliases: !toimage',
          },
          {
            name: '!togif',
            usage: '!togif (reply to animated sticker or video)',
            description: 'Converts an animated sticker or short video into a GIF-style looping video. Reply to an animated sticker or video with "!togif". Requires ffmpeg on the server.',
          },
          {
            name: '!toaudio',
            usage: '!toaudio (reply to video)',
            description: 'Extracts the audio track from a video and sends it as an MP3 file. Reply to any video with "!toaudio" to get just the sound. Requires ffmpeg on the server.\n\nAliases: !tomp3',
          },
          {
            name: '!removebg',
            usage: '!removebg (reply to image)',
            description: 'Removes the background from an image using edge-based color detection. Works best with solid-colored backgrounds (white, green screen, etc.). Reply to an image with "!removebg" to get a transparent PNG.\n\nAliases: !rbg',
          },
          {
            name: '!carbon',
            usage: '!carbon [code]  or  reply to text with !carbon',
            description: 'Generates a beautiful code screenshot. Type your code after the command, or reply to a text message with "!carbon". The screenshot uses a dark theme with syntax-style formatting.\n\nAliases: !code',
          },
          {
            name: '!screenshot',
            usage: '!screenshot [url]',
            description: 'Takes a screenshot of any website and sends it as an image. Provide the full URL after the command. Example: "!screenshot https://google.com". The screenshot is captured at 1280px width.\n\nAliases: !ss',
          },
          {
            name: '!ocr',
            usage: '!ocr (reply to image)',
            description: 'Extracts text from an image using Optical Character Recognition (OCR). Reply to any image with "!ocr" to read the text in it. Supports English text. Uses Tesseract.js for local processing — no API key needed.\n\nAliases: !readtext',
          },
        ],
      },
      {
        title: 'PROFILE',
        commands: [
          {
            name: '!bio',
            usage: '!bio [text]',
            description: 'Updates your WhatsApp bio (About section). Maximum 139 characters. Example: "!bio Living my best life". Your bio is visible to all your contacts.\n\nAliases: !about',
          },
          {
            name: '!setpp',
            usage: '!setpp (reply to image)',
            description: 'Sets your WhatsApp profile picture. Reply to an image with "!setpp" and the bot will resize it to a 640x640 square and set it as your profile picture.\n\nAliases: !setpfp, !profilepic',
          },
          {
            name: '!read',
            usage: '!read',
            description: 'Marks messages in the current chat as read. Useful for quickly clearing unread indicators without manually reading each message.\n\nAliases: !markread',
          },
        ],
      },
      {
        title: 'UTILITIES',
        commands: [
          {
            name: '!forward',
            usage: '!forward [phone number] (reply to message)',
            description: 'Forwards a replied message to another contact. Reply to any message (text, image, video, audio, document) and use "!forward" followed by the phone number. Example: "!forward 2348012345678".\n\nAliases: !fwd',
          },
          {
            name: '!base64',
            usage: '!base64 encode [text]  |  !base64 decode [encoded]',
            description: 'Encodes text to Base64 or decodes Base64 back to text. Useful for encoding data or decoding encoded strings.\n\nExamples:\n"!base64 encode Hello World" → SGVsbG8gV29ybGQ=\n"!base64 decode SGVsbG8gV29ybGQ=" → Hello World\n\nAliases: !b64',
          },
          {
            name: '!hash',
            usage: '!hash [text]  |  !md5 [text]  |  !sha256 [text]',
            description: 'Generates cryptographic hashes of text. "!hash" shows both MD5 and SHA-256, while "!md5" and "!sha256" show only the specific hash. Useful for checksums and verification.\n\nExample: "!hash Hello World"',
          },
          {
            name: '!color',
            usage: '!color [hex code]',
            description: 'Generates a visual color swatch from a hex color code. Shows the color as an image with the hex code and RGB values. Supports 3-digit and 6-digit hex codes.\n\nExamples: "!color #FF5733" or "!color 3498DB"\n\nAliases: !colour, !hex',
          },
        ],
      },
      {
        title: 'PRODUCTIVITY',
        commands: [
          { name: '!calc', usage: '!calc [expression]', description: 'Evaluate math expressions. Supports: +, -, *, /, ^ (power), sqrt(), sin(), cos(), tan(), log(), ln(), abs(), pi.\n\nExamples: "!calc 2^10 + sqrt(144)", "!calc sin(45)"\n\nAliases: !math' },
          { name: '!countdown', usage: '!countdown [YYYY-MM-DD]', description: 'Shows how many days until (or since) a given date.\n\nExample: "!countdown 2025-12-25" → "X days until 2025-12-25"' },
          { name: '!cal', usage: '!cal', description: 'Shows the current month calendar with today\'s date highlighted.\n\nAliases: !calendar' },
          { name: '!timezone', usage: '!timezone [city]', description: 'Shows the current time and date in any city/timezone.\n\nExamples: "!timezone London", "!timezone Tokyo"\n\nAliases: !tz, !time' },
          { name: '!uptime', usage: '!uptime', description: 'Shows how long the bot has been running since last restart.' },
          { name: '!id', usage: '!id', description: 'Shows chat information: Chat JID, your JID, message ID, chat type (group/private). Useful for debugging.\n\nAliases: !chatid' },
          { name: '!paste', usage: '!paste [text]', description: 'Creates a paste on paste.rs and returns a shareable link. You can also reply to a message with "!paste" to paste its content.\n\nAliases: !pastebin' },
          { name: '!purge', usage: '!purge [n]', description: 'Request to delete your own last N messages (1-100). Note: Full message deletion requires Baileys direct connection.\n\nAliases: !del' },
        ],
      },
      {
        title: 'STUDY TOOLS',
        commands: [
          {
            name: '!study',
            usage: '!study',
            description: 'Generates a one-time login link to open Study Hub — your personal study dashboard with AI-generated summaries, quizzes, flashcards, and progress tracking. The link expires after 10 minutes or 1 use. Only the bot owner can use this command. Non-bot-users cannot access Study Hub.\n\nAliases: !studyhub',
          },
          {
            name: '!flashcard',
            usage: '!flashcard add [front] | [back]  |  !flashcard list  |  !flashcard test  |  !flashcard delete [n]  |  !flashcard clear',
            description: 'Personal flashcard system for studying. Create cards with a front (question) and back (answer) separated by "|". Review cards randomly with "test". Delete individual cards by number or clear all at once.\n\nExamples:\n"!flashcard add What is H2O? | Water"\n"!flashcard list" — see all your cards\n"!flashcard test" — random card quiz (answer revealed after 10s)\n"!flashcard delete 3" — remove card #3\n"!flashcard clear" — delete all cards\n\nAliases: !fc, !flashcards',
          },
          {
            name: '!quiz',
            usage: '!quiz  |  !quiz from [text]  |  reply to notes with !quiz',
            description: 'Quiz generator with two modes:\n\n1. From notes: Reply to a message containing your study notes with "!quiz" or use "!quiz from [your notes]". Generates fill-in-the-blank questions from the text.\n\n2. General trivia: Just type "!quiz" for a random multiple-choice trivia question. Answer is revealed after 15 seconds.\n\nAliases: !trivia (for general quiz)',
          },
          {
            name: '!pomodoro',
            usage: '!pomodoro [work_mins] [break_mins]  |  !pomodoro status  |  !pomodoro stop',
            description: 'Pomodoro focus timer. Start a work session (default 25 min) followed by a break (default 5 min). The bot notifies you when to switch.\n\nExamples:\n"!pomodoro" — 25 min work, 5 min break\n"!pomodoro 45 10" — 45 min work, 10 min break\n"!pomodoro status" — check remaining time\n"!pomodoro stop" — cancel timer\n\nAliases: !pomo, !focus',
          },
        ],
      },
      {
        title: 'SOCIAL & GROUP',
        commands: [
          { name: '!afk', usage: '!afk [reason]  |  !afk off', description: 'Set yourself as Away From Keyboard. Anyone who tags or messages you gets an auto-reply with your reason. Auto-clears when you use !afk off.\n\nExamples:\n"!afk studying" — AFK with reason\n"!afk" — AFK without reason\n"!afk off" — disable AFK\n\nAliases: !away, !brb' },
          { name: '!roast', usage: '!roast [name]  |  reply to message with !roast', description: 'Generates a savage (but friendly) roast. Reply to someone\'s message for a text-specific roast, or use !roast [name] for a general one. 20+ unique templates.\n\nAliases: !burn' },
          { name: '!tldr2', usage: '!tldr2  |  reply to long message with !tldr2', description: 'Summarizes long messages into key bullet points using sentence scoring by word importance and position. No AI needed. (Note: !tldr maps to the AI-powered !digest command.)\n\nReply to a long message, or: !tldr2 [long text]\n\nAliases: !quicksummary, !bulletpoints' },
          { name: '!encrypt', usage: '!encrypt [PIN] [message]', description: 'Encrypts a message with AES-256 using your PIN. Share the encrypted text — only someone with the PIN can decrypt it.\n\nExample: "!encrypt 1234 This is my secret"\n\nAliases: !enc' },
          { name: '!decrypt', usage: '!decrypt [PIN] [encrypted text]  |  reply with !decrypt [PIN]', description: 'Decrypts an encrypted message. Reply to the encrypted message or paste it after the PIN.\n\nAliases: !dec' },
          { name: '!ghost', usage: '!ghost [seconds]  |  !ghost off', description: 'Ghost mode — your messages auto-delete after X seconds (like Snapchat). Default 30s, range 5-300s.\n\nExamples:\n"!ghost 10" — delete after 10s\n"!ghost off" — disable\n"!ghost status" — check current setting\n\nAliases: !vanish' },
          { name: '!alias', usage: '!alias set [name] = [command]  |  !alias list  |  !alias delete [name]', description: 'Create custom command shortcuts. Map any alias to any command.\n\nExamples:\n"!alias set gm = !ai say good morning poetically"\n"!alias list" — see your aliases\n"!alias delete gm" — remove an alias\n\nAliases: !shortcut' },
          { name: '!chain', usage: '!chain [cmd1] | [cmd2] | [cmd3]', description: 'Pipe commands together like Unix. Each command runs in sequence (up to 3 steps).\n\nExample: "!chain translate es Hello world | tts"\n\nAliases: !pipe' },
          { name: '!recap', usage: '!recap [count]', description: 'Smart group chat summarizer. Analyzes the last N messages (default 50) and shows top talkers, hot topics, and time range. Groups only.\n\nExample: "!recap 100"' },
          { name: '!react', usage: '!react [emoji] when [trigger]  |  !react list  |  !react clear', description: 'Auto-react to messages matching patterns. When someone says the trigger word, bot reacts with the emoji. Groups only.\n\nExamples:\n"!react 🔥 when fire"\n"!react 😂 when lmao"\n\nAliases: !autoreact' },
          { name: '!spy', usage: '!spy', description: 'Group analytics dashboard. Shows who talks most, most active hours, emoji usage stats, and most used words. Groups only.\n\nAliases: !analytics, !groupstats' },
          { name: '!deadman', usage: '!deadman [time] [phone] [message]  |  !deadman status  |  !deadman off', description: 'Safety switch. Sets a timer — if you don\'t type !alive before it runs out, the bot sends your message to the specified contact.\n\nExamples:\n"!deadman 24h 2348164143260 If I don\'t check in, something may be wrong"\n"!alive" — reset the timer\n"!deadman off" — cancel\n\nAliases: !deadswitch' },
          { name: '!alive', usage: '!alive', description: 'Resets your deadman switch timer. Type this to prove you\'re okay.\n\nAliases: !checkin' },
          { name: '!type', usage: '!type [message]', description: 'Typing animation effect. Bot sends your message character by character with a typewriter animation (max 200 chars). Uses message editing for ban safety.\n\nAliases: !typewriter' },
          { name: '!birthday', usage: '!birthday set DD/MM  |  !birthday list  |  !birthday next', description: 'Birthday tracker for groups. Set your birthday, see all birthdays, or check who\'s next.\n\nExamples:\n"!birthday set 15/03"\n"!birthday list"\n"!birthday next"\n\nAliases: !bday' },
          { name: '!profile', usage: '!profile', description: 'Your chat profile card with stats: messages sent, average length, level, XP, badges earned, favorite emojis and words. Level up by chatting more!\n\nAliases: !me, !card' },
          { name: '!wrap', usage: '!wrap', description: 'Your personal chat Wrapped (like Spotify Wrapped). Shows total messages, peak hour, most active day, longest message, personality type, and more.\n\nAliases: !wrapped, !review' },
        ],
      },
      {
        title: 'INFO LOOKUP',
        commands: [
          { name: '!crypto', usage: '!crypto [coin name]', description: 'Shows live cryptocurrency prices from CoinGecko (free, no key). Shows USD, EUR, GBP, NGN prices, 24h change, market cap, and rank.\n\nExamples: "!crypto bitcoin", "!crypto ethereum", "!crypto dogecoin"\n\nAliases: !coin' },
          { name: '!ud', usage: '!ud [word or phrase]', description: 'Looks up definitions on Urban Dictionary. Shows the top-voted definition with example and vote counts.\n\nExample: "!ud yeet"\n\nAliases: !urban' },
          { name: '!ip', usage: '!ip [domain]', description: 'Performs a DNS lookup and shows all IP addresses for a domain.\n\nExample: "!ip google.com"\n\nAliases: !dns, !nslookup' },
          { name: '!npm', usage: '!npm [package name]', description: 'Shows information about an npm package: latest version, description, license, and direct link.\n\nExample: "!npm express"' },
          { name: '!whois', usage: '!whois [domain]', description: 'Performs a WHOIS lookup on a domain showing registrar, creation date, expiry, and name servers.\n\nExample: "!whois google.com"' },
          { name: '!headers', usage: '!headers [url]', description: 'Shows the HTTP response headers of any URL. Useful for debugging websites.\n\nExample: "!headers https://google.com"\n\nAliases: !httpheaders' },
          { name: '!country', usage: '!country [name]', description: 'Shows detailed information about a country: capital, population, region, currency, languages, timezone, and calling code.\n\nExample: "!country Nigeria"' },
          { name: '!emoji', usage: '!emoji [name]', description: 'Search for emojis by name. Shows matching emojis from a built-in database.\n\nExample: "!emoji fire" → 🔥 fire\n\nAliases: !emojisearch' },
          { name: '!palette', usage: '!palette [hex color]', description: 'Generates a color palette image from a base hex color, showing darker, lighter, and complementary colors.\n\nExample: "!palette FF5733"' },
        ],
      },
      {
        title: 'TEXT & WRITING',
        commands: [
          { name: '!reverse', usage: '!reverse [text]', description: 'Reverses the text. Can also reply to a message.\n\nExample: "!reverse Hello World" → "dlroW olleH"\n\nAliases: !rev' },
          { name: '!upper', usage: '!upper [text]', description: 'Converts text to UPPERCASE. Can also reply to a message.\n\nAliases: !uppercase' },
          { name: '!lower', usage: '!lower [text]', description: 'Converts text to lowercase. Can also reply to a message.\n\nAliases: !lowercase' },
          { name: '!mock', usage: '!mock [text]', description: 'Converts text to SpOnGeBoB mOcKiNg style (alternating case).\n\nAliases: !spongebob' },
          { name: '!clap', usage: '!clap [text]', description: 'Inserts 👏 between every word.\n\nExample: "!clap do it now" → "do 👏 it 👏 now"' },
          { name: '!tiny', usage: '!tiny [text]', description: 'Converts text to ᵗⁱⁿʸ superscript Unicode characters.\n\nAliases: !superscript' },
          { name: '!fliptext', usage: '!fliptext [text]', description: 'Flips text upside down using Unicode characters.\n\nExample: "!fliptext hello" → "ollǝɥ"\n\nAliases: !upsidedown' },
          { name: '!morse', usage: '!morse [text or morse code]', description: 'Encodes text to Morse code, or decodes Morse code back to text. Auto-detects the direction.\n\nExamples:\n"!morse hello" → ".... . .-.. .-.. ---"\n"!morse .... .-.." → "hi"' },
          { name: '!braille', usage: '!braille [text]', description: 'Converts text to Braille Unicode characters.\n\nExample: "!braille hello" → "⠓⠑⠇⠇⠕"' },
          { name: '!ascii', usage: '!ascii [text]', description: 'Generates ASCII art text using block characters (max 15 characters).\n\nAliases: !bigtext' },
          { name: '!font', usage: '!font [style] [text]', description: 'Converts text to fancy Unicode font styles.\n\nAvailable styles: bold, italic, bolditalic, monospace, double, script, fraktur, vaporwave, smallcaps\n\nExample: "!font bold Hello World" → "𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝"\n\nAliases: !fancy' },
        ],
      },
      {
        title: 'QUICK UTILITIES',
        commands: [
          { name: '!pick', usage: '!pick [option1, option2, ...]', description: 'Randomly picks one option from a comma-separated list. Needs at least 2 options.\n\nExample: "!pick pizza, burger, sushi"\n\nAliases: !choose' },
          { name: '!coinflip', usage: '!coinflip', description: 'Flips a coin — Heads or Tails.\n\nAliases: !flip' },
          { name: '!dice', usage: '!dice [sides]', description: 'Rolls a dice with the specified number of sides (default 6).\n\nExample: "!dice 20" → Rolled a 14 (d20)\n\nAliases: !roll' },
          { name: '!password', usage: '!password [length]', description: 'Generates a secure random password (4-128 characters, default 16). Includes letters, numbers, and symbols.\n\nAliases: !genpass' },
          { name: '!uuid', usage: '!uuid', description: 'Generates a random UUID v4.' },
          { name: '!epoch', usage: '!epoch', description: 'Shows the current Unix timestamp in seconds, milliseconds, and ISO format.\n\nAliases: !timestamp' },
          { name: '!bmi', usage: '!bmi [weight kg] [height cm]', description: 'Calculates Body Mass Index and category.\n\nExample: "!bmi 70 175" → BMI: 22.9 (Normal weight)' },
          { name: '!age', usage: '!age [YYYY-MM-DD]', description: 'Calculates exact age from a birthdate.\n\nExample: "!age 2000-05-15" → 25 years, 11 months, 20 days' },
          { name: '!unit', usage: '!unit [value] [from] [to]', description: 'Converts between units. Supports: km, mi, m, ft, cm, in, kg, lb, g, oz, l, gal, c (Celsius), f (Fahrenheit), k (Kelvin).\n\nExamples: "!unit 100 km mi", "!unit 37 c f"\n\nAliases: !convert' },
        ],
      },
      {
        title: 'FUN & CREATIVE',
        commands: [
          { name: '!wallpaper', usage: '!wallpaper [optional query]', description: 'Sends a random HD wallpaper (1920x1080). Optionally specify a search query for themed wallpapers.\n\nExamples: "!wallpaper" (random), "!wallpaper nature"\n\nAliases: !wp' },
          { name: '!qrread', usage: '!qrread (reply to image)', description: 'Scans a QR code from an image and shows its content. Reply to an image containing a QR code.\n\nAliases: !scanqr' },
        ],
      },
      {
        title: 'LOGO & BRANDING',
        commands: [
          { name: '!logo', usage: '!logo [style] [name] | [tagline] #hex --size', description: 'Generate professional logos with 45+ styles. Supports taglines (use | separator), custom hex colors (#FF5733), and size presets (--square, --wide, --tall, --banner, --story).\n\nExamples:\n"!logo neon MyBrand"\n"!logo gradient CoolApp | Your Tagline #3498DB --wide"\n"!logo preview" — View all available styles in a grid\n"!logo styles" — List all style names\n\n10 styles are free; remaining styles require BotWave Pro.\n\nAliases: !logogen, !logocreate, !logomaker' },
          { name: '!brandkit', usage: '!brandkit [name] #hex', description: 'Generate a complete brand kit with 3 image formats:\n• Square logo (1080×1080) — profile picture / app icon\n• Banner (1600×400) — website header / social cover\n• Status / Story (1080×1920) — WhatsApp status / IG story\n\nOptionally provide a hex color to customize the palette.\n\nExamples:\n"!brandkit NEXUS"\n"!brandkit NEXUS #FF5733"\n\nRequires BotWave Pro.\n\nAliases: !brand, !brandpack' },
        ],
      },
      // AI Autopilot section removed
      {
        title: 'AI & SMART FEATURES',
        commands: [
          { name: '!scan', usage: '!scan (reply to receipt/invoice photo)', description: 'Scans a receipt or invoice photo using AI vision and extracts store name, items, prices, subtotal, tax, total, and payment method. Send or reply to a photo with "!scan". You can add context: "!scan this is in euros".\n\nAliases: !receipt, !invoice' },
          { name: '!music', usage: '!music [song name]', description: 'Searches for a song and sends it as an audio file. Supports any song — just type the name and optionally the artist.\n\nExamples:\n"!music Shape of You"\n"!music Burna Boy Last Last"\n"!music Wizkid Essence"\n\nAliases: !song, !findsong' },
          { name: '!digest', usage: '!digest  |  !digest today  |  !digest 50', description: 'Generates an AI summary of recent group chat messages using real participant names. Great for catching up on busy groups.\n\nOptions:\n"!digest" — Last few hours\n"!digest today" — Full day summary\n"!digest 50" — Last 50 messages\n\nOnly works in group chats.\n\nAliases: !summary, !tldr' },
          { name: '!ask', usage: '!ask [your question]', description: 'Smart FAQ — ask anything about BotWave commands, features, pricing, or troubleshooting. Uses fuzzy keyword matching to find the best answer from the built-in knowledge base.\n\nExamples:\n"!ask how do I make stickers"\n"!ask what are the pricing plans"\n"!ask is my data safe"\n\nAliases: !faq, !support' },
        ],
      },
      // Smart NLP section removed
      {
        title: 'IMAGE EDITING',
        commands: [
          { name: '!blur', usage: '!blur [amount] (reply to image)', description: 'Applies Gaussian blur to an image. Amount range: 1-100 (default 5).\n\nExample: "!blur 10"' },
          { name: '!grayscale', usage: '!grayscale (reply to image)', description: 'Converts an image to black and white.\n\nAliases: !greyscale, !bw' },
          { name: '!rotate', usage: '!rotate [degrees] (reply to image)', description: 'Rotates an image by the specified degrees (default 90).\n\nExample: "!rotate 180"' },
          { name: '!resize', usage: '!resize [width] [height] (reply to image)', description: 'Resizes an image. If only width is given, height scales proportionally. Max 4096px.\n\nExample: "!resize 800 600"' },
          { name: '!invert', usage: '!invert (reply to image)', description: 'Inverts (negates) all colors in the image.\n\nAliases: !negative' },
          { name: '!brightness', usage: '!brightness [factor] (reply to image)', description: 'Adjusts image brightness. Factor range: 0.1-3.0 (1.0 = no change, higher = brighter).\n\nExample: "!brightness 1.5"' },
          { name: '!contrast', usage: '!contrast [factor] (reply to image)', description: 'Adjusts image contrast. Factor range: 0.1-3.0 (1.0 = no change, higher = more contrast).\n\nExample: "!contrast 1.5"' },
          { name: '!crop', usage: '!crop [x] [y] [width] [height] (reply to image)', description: 'Crops an image to the specified region. Use "!crop center" for a square crop from the center.\n\nExamples: "!crop center", "!crop 50 50 300 200"' },
          { name: '!compress', usage: '!compress (reply to image)', description: 'Compresses an image to reduce file size. Shows the before/after size and percentage saved.' },
        ],
      },
    ];

    // Detect user's language for translating the docx content
    const userLang = requestLangMap.get(context.chatJid);
    const t = async (text: string): Promise<string> => {
      if (!userLang || userLang === 'en') return text;
      try { return await translateText(text, userLang); } catch { return text; }
    };

    const children: Paragraph[] = [];

    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: await t('BotWave Command Guide'), bold: true, size: 48, font: 'Calibri' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: await t('Complete reference with deep explanations for every command'), italics: true, size: 24, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    children.push(new Paragraph({
      children: [new TextRun({ text: await t('All commands start with the "!" prefix. Only the bot owner can use commands.'), size: 22, font: 'Calibri' })],
    }));
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

    for (const section of sections) {
      // Section heading (translated)
      children.push(new Paragraph({
        children: [new TextRun({ text: await t(section.title), bold: true, size: 32, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

      for (const cmd of section.commands) {
        // Command name (keep as-is — these are code syntax)
        children.push(new Paragraph({
          children: [new TextRun({ text: cmd.name, bold: true, size: 26, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_2,
        }));

        // Usage (keep as-is — code syntax)
        children.push(new Paragraph({
          children: [
            new TextRun({ text: await t('Usage: '), bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: cmd.usage, size: 22, font: 'Courier New' }),
          ],
        }));

        // Description (translated, preserve newlines)
        const translatedDesc = await t(cmd.description);
        const descLines = translatedDesc.split('\n');
        for (const line of descLines) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 22, font: 'Calibri' })],
          }));
        }

        children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      }
    }

    // Privacy notice
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: await t('Privacy: Your chats are private. The bot owner cannot read or access your messages. BotWave only responds to commands — it does not store, read, or share any chat content.'),
        size: 20, italics: true, font: 'Calibri',
      })],
      alignment: AlignmentType.CENTER,
    }));

    // Footer
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: `Generated by BotWave at ${currentTimeStr()} on ${currentDateStr()}`,
        size: 18, italics: true, font: 'Calibri',
      })],
      alignment: AlignmentType.CENTER,
    }));

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    const intro = pickResponse(helpIntros, { name: context.pushName || 'User', time: currentTimeStr() }, false);
    await sendReply(
      context.chatJid,
      {
        document: buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: 'BotWave_Command_Guide.docx',
        caption: `${intro}\n\n_Full command guide with detailed explanations._`,
      },
      sock,
      context.rawMessage.key,
      context.queue,
    );
  } catch (error) {
    console.error('[HELP-DOC] Error generating help docx:', error);
    await sendReply(context.chatJid, 'Failed to generate the help document. Try !help for the text version.', sock, context.rawMessage.key, context.queue);
  }
}

async function sendPing(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  const response = pickResponse(pingReplies, vars);
  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function sendUnknownCommand(
  context: MessageContext,
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  let response = pickResponse(unknownCommandReplies, vars, false);
  const prefix = context.commandPrefix || '!';
  if (prefix !== '!') response = response.replace(/!help/g, `${prefix}help`);
  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function handleStudy(
  context: MessageContext,
  sock: any,
): Promise<void> {
  if (!context.isOwner) {
    await sendReply(
      context.chatJid,
      'Only the bot owner can use this command.',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  try {
    // Get the owner's phone number from the socket
    const ownerJid = (sock as any).user?.id || '';
    const phone = '+' + ownerJid.replace(/@.*$/, '').replace(/:\d+$/, '');

    if (!phone || phone === '+') {
      await sendReply(
        context.chatJid,
        'Could not determine your phone number. Please try again.',
        sock,
        context.rawMessage.key,
        context.queue,
      );
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
    const botSecret = process.env.BOT_INTERNAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const res = await axios.post(`${appUrl}/api/study/auth`, {
      phone_number: phone,
      session_id: context.sessionId || null,
      user_id: context.userId || null,
    }, {
      headers: { 'x-bot-secret': botSecret },
      timeout: 15000,
    });

    if (res.data?.success && res.data?.login_url) {
      await sendReply(
        context.chatJid,
        `*Study Hub Access* \u{1F4DA}\n\n` +
        `Click the link below to open Study Hub:\n\n` +
        `${res.data.login_url}\n\n` +
        `\u{26A0}\uFE0F This link expires in *10 minutes* and can only be used *once*.\n` +
        `\u{1F6AB} Do not share this link — it's tied to your account.\n\n` +
        `_Send !study again anytime to get a new link._`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
    } else {
      await sendReply(
        context.chatJid,
        'Failed to generate Study Hub access. Please try again later.',
        sock,
        context.rawMessage.key,
        context.queue,
      );
    }
  } catch (err: any) {
    console.error('[STUDY] Error generating login link:', err?.message || err);
    await sendReply(
      context.chatJid,
      'Something went wrong. Please try again later.',
      sock,
      context.rawMessage.key,
      context.queue,
    );
  }
}

// ─── Register General Commands ───────────────────────────────────────────────

registerCommand({
  name: 'help',
  aliases: ['help', 'h', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  execute: (ctx, args, sock, vars) => sendHelp(ctx, args, sock, vars),
});

registerCommand({
  name: 'ping',
  aliases: ['ping', 'pong', 'alive'],
  category: 'general',
  description: 'Check if the bot is alive',
  execute: (ctx, _args, sock, vars) => sendPing(ctx, sock, vars),
});

registerCommand({
  name: 'study',
  aliases: ['study', 'studyhub'],
  category: 'study',
  description: 'Get a one-time login link to Study Hub',
  ownerOnly: true,
  execute: (ctx, _args, sock) => handleStudy(ctx, sock),
});

// sendUnknownCommand is exported for use by the dispatcher, not registered as a command
export { sendUnknownCommand };
