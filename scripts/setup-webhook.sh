#!/bin/bash
# Setup Telegram webhook for a bot session
# Usage: ./scripts/setup-webhook.sh <BOT_TOKEN> <SESSION_ID>
#
# This sets the webhook URL to:
#   https://www.botwave.online/api/telegram/webhook/<SESSION_ID>

set -e

BOT_TOKEN="${1}"
SESSION_ID="${2}"
APP_URL="${APP_URL:-https://www.botwave.online}"

if [ -z "$BOT_TOKEN" ] || [ -z "$SESSION_ID" ]; then
  echo "Usage: $0 <BOT_TOKEN> <SESSION_ID>"
  echo ""
  echo "Example:"
  echo "  $0 123456:ABC-DEF my-session-uuid"
  echo ""
  echo "Environment variables:"
  echo "  APP_URL - Base URL (default: https://www.botwave.online)"
  exit 1
fi

WEBHOOK_URL="${APP_URL}/api/telegram/webhook/${SESSION_ID}"

echo "Setting webhook for session ${SESSION_ID}..."
echo "Webhook URL: ${WEBHOOK_URL}"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\", \"callback_query\", \"chat_member\", \"my_chat_member\"]
  }")

echo ""
echo "Response: ${RESPONSE}"

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo ""
  echo "Webhook set successfully!"
else
  echo ""
  echo "Failed to set webhook. Check the bot token and try again."
  exit 1
fi
