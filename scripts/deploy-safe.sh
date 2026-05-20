#!/bin/bash
# ================================================================
# Safe Rolling Deploy Script
# Rebuilds only changed services with Docker layer caching.
# Evolution API, Redis, Postgres, and other infra stay untouched.
# This prevents WhatsApp session disconnections during deploys.
#
# Usage:
#   ./scripts/deploy-safe.sh              # rebuild all app services
#   ./scripts/deploy-safe.sh web          # rebuild only botwave-web
#   ./scripts/deploy-safe.sh whatsapp     # rebuild only botwave-whatsapp
#   ./scripts/deploy-safe.sh web telegram # rebuild specific services
# ================================================================

set -e

DEPLOY_DIR="/opt/botwave/deploy"
REPO_DIR="/opt/botwave"
START_TIME=$(date +%s)

# Default: rebuild all app services
ALL_SERVICES="botwave-web botwave-whatsapp botwave-telegram botwave-userbot"
SERVICES=()

# Parse arguments — map short names to compose service names
for arg in "$@"; do
  case "$arg" in
    web)       SERVICES+=("botwave-web") ;;
    whatsapp)  SERVICES+=("botwave-whatsapp") ;;
    telegram)  SERVICES+=("botwave-telegram") ;;
    userbot)   SERVICES+=("botwave-userbot") ;;
    all)       SERVICES=($ALL_SERVICES) ;;
    *)         SERVICES+=("$arg") ;;
  esac
done

# If no args, rebuild all app services
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=($ALL_SERVICES)
fi

echo "=== BotWave Safe Rolling Deploy ==="
echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "[deploy] Services: ${SERVICES[*]}"
echo ""

# 1. Pull latest code
echo "[deploy] Pulling latest code..."
cd "$REPO_DIR"
git fetch origin BotWave
git reset --hard origin/BotWave
cd "$DEPLOY_DIR"

# 2. Build only the specified services (Docker layer cache reused)
echo "[deploy] Building: ${SERVICES[*]}..."
docker compose build --parallel "${SERVICES[@]}" 2>&1 | tail -20

# 3. Rolling restart — one service at a time to preserve uptime.
#    Uses --no-deps so infra services (redis, evo, postgres) are never touched.
#    SIGTERM gives each container time to save state before stopping.
for svc in "${SERVICES[@]}"; do
  echo "[deploy] Restarting $svc..."
  docker compose up -d --no-deps "$svc" 2>&1
done

# 4. Wait for health checks
echo ""
echo "[deploy] Waiting for services to stabilize..."
sleep 10

# 5. Verify health
echo "[deploy] Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | sort

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "=== Deploy complete in ${ELAPSED}s ==="
echo "Infrastructure (Evolution API, Redis, Postgres) was NOT restarted."
echo "WhatsApp sessions preserved."
