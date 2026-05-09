#!/bin/bash
# Start both Next.js web server and the WhatsApp bot process
# in a single Render free-tier Web Service.

echo "=== BotWave Starting (web + bot) ==="

# Ensure yt-dlp is available for !download command
if ! command -v yt-dlp &>/dev/null; then
  echo "[start-all] Installing yt-dlp..."
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  echo "[start-all] yt-dlp installed to /tmp/yt-dlp"
else
  echo "[start-all] yt-dlp already available: $(which yt-dlp)"
fi

# Write YouTube cookies file from env var (for yt-dlp authentication)
if [ -n "$YOUTUBE_COOKIES" ]; then
  echo "[start-all] YOUTUBE_COOKIES env var found (${#YOUTUBE_COOKIES} chars), writing cookies file..."
  printf '%b' "$YOUTUBE_COOKIES" | sed 's/^"//;s/"$//' > /tmp/yt-cookies.txt
  echo "[start-all] YouTube cookies written to /tmp/yt-cookies.txt ($(wc -l < /tmp/yt-cookies.txt) lines)"
else
  echo "[start-all] WARNING: YOUTUBE_COOKIES env var not set — YouTube downloads may fail"
fi

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

# Start Next.js with custom server (includes Socket.io for game platform)
echo "[start-all] Starting Next.js web server with Socket.io game server..."
if [ -f dist/bot/server/customServer.js ]; then
  node dist/bot/server/customServer.js 2>&1 &
  WEB_PID=$!
  echo "[start-all] Custom server started (PID: $WEB_PID) — Socket.io game server active"
else
  echo "[start-all] Custom server not found, falling back to standard Next.js start"
  npx next start -p ${PORT:-10000} &
  WEB_PID=$!
  echo "[start-all] Web started (PID: $WEB_PID)"
fi

# If either process dies, kill the other and exit
trap "kill $BOT_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM

wait -n
echo "[start-all] A process exited, shutting down..."
kill $BOT_PID $WEB_PID 2>/dev/null
exit 1
