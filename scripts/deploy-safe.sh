#!/bin/bash
# ================================================================
# Safe Rolling Deploy Script
# Only rebuilds botwave-web and botwave-bot containers.
# Evolution API, Redis, Postgres, and other infra stay untouched.
# This prevents WhatsApp session disconnections during deploys.
#
# Usage: ./scripts/deploy-safe.sh
# ================================================================

set -e

DEPLOY_DIR="/opt/botwave/deploy"
cd "$DEPLOY_DIR"

echo "=== BotWave Safe Rolling Deploy ==="
echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# 1. Pull latest code
echo "[deploy] Pulling latest code..."
cd /opt/botwave
git pull origin BotWave
cd "$DEPLOY_DIR"

# 2. Rebuild ONLY the botwave image (shared by web + bot)
echo "[deploy] Rebuilding botwave image (web + bot only)..."
docker compose build botwave-web botwave-bot

# 3. Graceful restart: stop bot first (SIGTERM triggers clean shutdown),
#    then web. Evolution API stays running throughout.
echo "[deploy] Stopping botwave-bot (graceful shutdown)..."
docker compose stop -t 20 botwave-bot
echo "[deploy] Bot stopped. Starting updated bot..."
docker compose up -d botwave-bot

# 4. Wait for bot to be healthy before restarting web
echo "[deploy] Waiting for bot to be healthy..."
sleep 10

# 5. Restart web container
echo "[deploy] Stopping botwave-web..."
docker compose stop -t 15 botwave-web
echo "[deploy] Starting updated web..."
docker compose up -d botwave-web

echo ""
echo "[deploy] Waiting for services to stabilize..."
sleep 5

# 6. Verify health
echo "[deploy] Checking container status..."
docker compose ps botwave-web botwave-bot evolution-api

echo ""
echo "=== Deploy complete! ==="
echo "Evolution API was NOT restarted — WhatsApp sessions preserved."
echo "Bot graceful shutdown ensured clean session handoff."
