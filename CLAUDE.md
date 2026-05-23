# BotWave - WhatsApp Bot Automation SaaS

Created by BotWave Team | 2026

## Project Overview
BotWave is a WhatsApp bot automation platform built as a SaaS. Users connect their own WhatsApp number via QR code. Each user's session runs from their own device IP (via Baileys), not the server — significantly reducing ban risk.

## Architecture
- **Frontend + API**: Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **Bot Engine**: Baileys (Node.js) WebSocket-based WhatsApp bot
- **Database + Auth**: Supabase (PostgreSQL)
- **AI Integration**: Groq (llama-3.3-70b-versatile) with multi-key rotation. Gemini 2.0 Flash fallback is OFF by default; set `AI_ALLOW_GEMINI_FALLBACK=true` to re-enable.
- **Deployment**: Render (two services: botwave-web + botwave-bot)

## Key Directories
- `/app` - Next.js pages and API routes
- `/app/api` - REST API routes
- `/app/dashboard` - User dashboard pages
- `/bot` - WhatsApp bot code
- `/bot/handlers` - Message and command handlers
- `/bot/utils` - Anti-ban utilities, response pools, promo system
- `/components` - React components
- `/lib` - Utilities and shared code
- `/supabase` - Database migrations

## Commands
```bash
npm run dev          # Start development server
npm run build        # Build Next.js app
npm run build:bot    # Compile bot code
npm run start:bot    # Run the bot
npm run lint         # Run ESLint
```

## Bot Commands (prefix: !)
- `!help` - Show all commands
- `!ping` - Check bot status
- `!sticker` - Create sticker from image
- `!ai [message]` - AI chat (powered by Groq, llama-3.3-70b-versatile)
- `!weather [city]` - Get weather info
- `!joke` - Random joke
- `!quote` - Inspirational quote
- `!define [word]` - Dictionary lookup
- `!horoscope [sign]` - Daily horoscope
- `!translate [lang] [text]` - Translate text
- `!doc [title] | [content]` - Create .docx document
- `!poll [question] | [options]` - Create poll
- `!vote [n]` - Vote on poll
- `!play [game]` - Start a mini game
- `!trivia` / `!hangman` / `!wordchain` - Game shortcuts
- `!leaderboard` - View top users
- `!afk [reason]` - Set AFK status
- `!download [url]` - Download media

## Anti-Ban Features (Basic)
- Human-like response flow (read receipts → seen delay → typing → pause → send)
- 50-100 response variations per command (no identical message fingerprints)
- Emoji rotation and dynamic variable injection ({name}, {time}, {date})
- Message humanizer (occasional typos, casual phrases, skipped capitals)
- Time-based response tone (late night: minimal, morning: energetic)
- Max 3 reconnect attempts per session
- 2-second stagger between session startups
- Session-level (10 msgs/min) and user-level (20 msgs/min) rate limiting
- Anti-spam flood detection (5 msgs in 10s = warning)
- Never-send-same-message-twice dedup (10-message LRU buffer per pool)

## Advanced Anti-Ban System (`bot/utils/advancedAntiban.ts`)
- **Session Warmup**: New sessions limited to 15 msgs/day, scales to 200 over 7 days
- **Daily Message Cap**: Hard 200 msg/day limit per session (combines with warmup)
- **Read-But-Skip**: 15% chance bot reads but doesn't respond in groups (like a real person)
- **Group Cooldown**: 3-8s random gap between replies in the same group
- **Media Fingerprint Jitter**: Random bytes appended to stickers for unique hashes
- **Presence Simulation**: Toggles online/offline based on time of day (80% offline at night)
- **Message Length Jitter**: Zero-width chars + punctuation variations for unique byte fingerprints
- **Activity Hours**: Quiet hours (12am-6am) with slower responses and shortened messages
- **Anti-Pattern Delays**: 5% chance of 15-30s "distracted" delay, 3% chance of 30-60s, 1% chance of 60-120s

## Promo System
- Shows "Create your own bot" link every 10th use of creative commands
- Only on: sticker, doc, translate, img2text
- Never on: joke, weather, ai, ping, afk, games

## Deployment Safety Rules

**CRITICAL — follow these rules during any deploy, rebuild, or container restart:**

1. **NEVER use `docker kill`, `kill -9`, or any force-kill on bot containers.** Always use `docker stop` (sends SIGTERM) or `docker compose down` (graceful shutdown). The bot handles SIGTERM gracefully — it releases locks, saves state, and disconnects cleanly. Force-killing skips all cleanup and can leave stale locks that orphan sessions.

2. **NEVER use `docker compose down -v` unless explicitly instructed.** The `-v` flag deletes volumes, which wipes Evolution API's persistent database. All WhatsApp sessions will require re-pairing.

3. **NEVER change `EVOLUTION_API_KEY` or `EVOLUTION_API_URL` between deploys** without also deleting all Evolution instances and resetting sessions. Old instances become unreachable with new credentials.

4. **Always rebuild with `docker compose build` then `docker compose up -d`.** The bot's graceful shutdown handler preserves auth state in Supabase. On restart, `tryReconnectExisting()` reconnects using saved credentials — no re-pairing needed.

5. **Container name references:** The WhatsApp bot container is `botwave_whatsapp` (NOT `botwave_bot_main`). Always use the correct name in logs, admin panels, and scripts.

6. **Session persistence:** Auth state is stored in Supabase (`auth_state` column) and in Evolution API's PostgreSQL (if `DATABASE_SAVE_DATA_INSTANCE=true`). Normal restarts do NOT require users to re-pair. Only infrastructure changes (wiping Evolution DB, changing API keys) or user-initiated logouts break sessions.

7. **Auto-recovery runs with exponential backoff** (`AUTO_RECOVERY_MAX_ATTEMPTS = 5` in `sessionCoordinator.ts`, backoff 2/4/8/16/32 minutes — total ~62 minutes before the session is marked `pairing_failed`). The loop **short-circuits to `pairing_failed`** as soon as `last_pairing_error` is set to `whatsapp_device_removed:*` — that signal is written by `BotManager`'s keep-alive disconnect handler when the WebSocket reports `statusCode === 401` (loggedOut / device_removed / conflict). The user must re-pair from the dashboard once this happens; soft reconnect cannot recover a 401. **Pre-condition:** a working `PROXY_LIST` must be configured — without it, auto-recovery creates an orphan cycle (reconnect → 401 → retry).

8. **Proxy pool (`PROXY_LIST`)** must be configured before scaling beyond 1 WhatsApp session. Without proxies, all sessions connect from the server IP and get mass-disconnected by WhatsApp.

9. **Device fingerprint (`CONFIG_SESSION_PHONE_CLIENT` / `CONFIG_SESSION_PHONE_NAME`)** must be set in `.env.evolution` to a generic desktop string (e.g. `Chrome (Linux)` / `Chrome`). The Evolution API default is `Evolution API` — which broadcasts to WhatsApp's anti-abuse system that the client is a bot. The env vars are read by `evolution-api` on container start (changes require `docker compose up -d --force-recreate evolution-api`, not just `restart`).

10. **Webhook delivery is fire-and-forget.** Evolution sends webhooks to `botwave-web:10000/api/evolution/webhook` and drops events that can't be delivered. When rebuilding `botwave_web`, ALWAYS use `deploy/rebuild-web.sh` (pauses Evolution during the swap so webhooks queue instead of failing). Direct `docker compose up -d --build botwave-web` will silently lose any `connection.update` / `messages.upsert` events fired during the rebuild window.

11. **Stale-session janitor** runs every 12h from `whatsapp-entrypoint.ts` (`cleanupStaleSessions`). Deletes `bot_sessions` rows in `inactive`/`pairing_failed` state older than 7 days that have never had a successful pair (`last_active IS NULL`). Keeps the admin dashboard's connection rate honest.

## Environment Variables
See `.env.example` for required environment variables.
