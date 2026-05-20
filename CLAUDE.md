# BotWave - WhatsApp Bot Automation SaaS

Created by BotWave Team | 2026

## Project Overview
BotWave is a WhatsApp bot automation platform built as a SaaS. Users connect their own WhatsApp number via QR code. Each user's session runs from their own device IP (via Baileys), not the server — significantly reducing ban risk.

## Architecture
- **Frontend + API**: Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **Bot Engine**: Baileys (Node.js) WebSocket-based WhatsApp bot
- **Database + Auth**: Supabase (PostgreSQL)
- **AI Integration**: Google Gemini 2.0 Flash (server-side, smart key rotation)
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
- `!ai [message]` - AI chat (powered by Gemini)
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

## Environment Variables
See `.env.example` for required environment variables.
