#!/bin/bash
# Start both Next.js web server and the WhatsApp bot process
# in a single Render free-tier Web Service.

echo "=== BotWave Starting (web + bot) ==="

# Start the bot process in the background, redirect stderr to stdout
echo "[start-all] Starting bot process..."
node dist/bot/bot/index.js 2>&1 &
BOT_PID=$!
echo "[start-all] Bot started (PID: $BOT_PID)"

# Give bot a moment to crash if it's going to
sleep 2
if ! kill -0 $BOT_PID 2>/dev/null; then
  echo "[start-all] ERROR: Bot process crashed immediately! PID $BOT_PID is dead."
  echo "[start-all] Check for missing env vars or syntax errors in bot code."
else
  echo "[start-all] Bot process is running (PID: $BOT_PID)"
fi

# Start Next.js
echo "[start-all] Starting Next.js web server..."
npx next start -p ${PORT:-10000} &
WEB_PID=$!
echo "[start-all] Web started (PID: $WEB_PID)"

# If either process dies, kill the other and exit
trap "kill $BOT_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM

wait -n
echo "[start-all] A process exited, shutting down..."
kill $BOT_PID $WEB_PID 2>/dev/null
exit 1
