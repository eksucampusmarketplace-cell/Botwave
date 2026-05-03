#!/bin/bash
# Start both Next.js web server and the WhatsApp bot process
# in a single Render free-tier Web Service.

echo "Starting BotWave (web + bot)..."

# Start the bot process in the background
node dist/bot/bot/index.js &
BOT_PID=$!
echo "Bot started (PID: $BOT_PID)"

# Start Next.js in the foreground (Render needs this for port detection)
npx next start -p ${PORT:-10000} &
WEB_PID=$!
echo "Web started (PID: $WEB_PID)"

# If either process dies, kill the other and exit
trap "kill $BOT_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM

wait -n
echo "A process exited, shutting down..."
kill $BOT_PID $WEB_PID 2>/dev/null
exit 1
