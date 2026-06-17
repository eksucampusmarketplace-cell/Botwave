# BotWave - Testing Instructions

## API Endpoints

### 1. Create Bot (Bot Management Mode)
```bash
curl -X POST https://www.botwave.online/api/telegram/create-bot \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_auth_cookie>" \
  -d '{
    "botName": "Test Bot",
    "botUsername": "test_example_bot",
    "ownerTelegramId": "123456789"
  }'
```

### 2. Analytics Summary
```bash
curl "https://www.botwave.online/api/telegram/analytics/summary?sessionId=<uuid>&chatId=<chat_id>" \
  -H "Cookie: <your_auth_cookie>"
```

### 3. Broadcast Message
```bash
curl -X POST https://www.botwave.online/api/telegram/broadcast \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_auth_cookie>" \
  -d '{
    "sessionId": "<uuid>",
    "text": "Hello from BotWave!",
    "pin": false,
    "silent": false
  }'
```

### 4. User XP Data
```bash
curl "https://www.botwave.online/api/telegram/xp/user?sessionId=<uuid>&chatId=<chat_id>&userId=<user_id>" \
  -H "Cookie: <your_auth_cookie>"
```

### 5. Webhook Setup
```bash
curl -X POST https://www.botwave.online/api/telegram/webhook/setup \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_auth_cookie>" \
  -d '{"sessionId": "<uuid>"}'
```

Or via shell script:
```bash
./scripts/setup-webhook.sh <BOT_TOKEN> <SESSION_ID>
```

### 6. CAPTCHA Verification (Turnstile)
```bash
curl -X POST https://www.botwave.online/api/telegram/captcha/verify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<uuid>",
    "chatId": "<chat_id>",
    "userId": "<user_id>",
    "turnstileToken": "<turnstile_response_token>"
  }'
```

## Telegram Bot Commands to Test

### Core Commands
- `/start` — Bot greeting in private/group
- `/help` — Show all commands
- `/panel` — Open mini app admin panel

### Legal & Compliance
- `/privacy` — Show privacy policy link
- `/terms` — Show terms of service link

### Channel Management
- `/setchannel @mychannel` — Set announcement channel
- `/announce Hello everyone!` — Send to announcement channel
- `/channels` — List configured channels

### CAPTCHA (in a group)
- `/captcha on` — Enable CAPTCHA
- `/captcha off` — Disable CAPTCHA
- Add a new member to test verification flow

### Bot-to-Bot Loop Protection
- Add another bot to the group
- Send messages from another bot — should be rate-limited to 1 reply/minute

## WhatsApp Commands to Test

### Custom Commands
- Send any configured trigger word — bot should respond with custom response
- Verify cooldown enforcement
- Verify image attachments

### E-Commerce (Shop)
- `!shop` — List available products
- `!buy <product>` — Add product to cart
- `!cart` — View cart contents and total
- `!checkout` — Place order and clear cart

### Chatbot Flows
- Send the configured trigger keyword to start a flow
- Answer questions in sequence
- Verify variable substitution works

## Dashboard Pages to Test

1. **Create Bot** — `/dashboard/create-bot`
   - Fill in bot name, username, and owner Telegram ID
   - Verify rate limiting (max 3/day)

2. **Terms of Service** — `/terms`
   - Verify page renders correctly

3. **Privacy Policy** — `/privacy`
   - Verify page renders correctly

## Mini App Settings to Test

1. Open mini app via `/panel` in Telegram
2. Navigate to CAPTCHA feature card → tap to expand config
3. Change captcha mode (button/math/text/turnstile)
4. Set mute time, kick settings, custom button text
5. Save and verify settings persist

## Database Migrations

Run migration `054_botwave_complete_features.sql` in Supabase SQL Editor to create:
- `bot_creations` table
- `carts` table
- `orders` table
- `flow_sessions` table
- Performance indexes
- Missing columns on existing tables

## Environment Variables

Ensure these are set in `.env`:
```
MAIN_TELEGRAM_BOT_TOKEN=<your_main_bot_token>
BOT_OWNER_TELEGRAM_ID=<your_telegram_user_id>
TURNSTILE_SECRET_KEY=<optional_turnstile_key>
TURNSTILE_SITE_KEY=<optional_turnstile_site_key>
REDIS_URL=redis://localhost:6379
```
