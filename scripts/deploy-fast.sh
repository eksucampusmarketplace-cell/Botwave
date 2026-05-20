#!/bin/bash
# ================================================================
# Fast Deploy Script (uses pre-built GHCR images)
# Pulls the latest image from GHCR and restarts services.
# No building on the VPS — deploy in ~15 seconds.
#
# Prerequisites:
#   - GHCR image pushed by GitHub Actions CI
#   - VPS logged into GHCR: docker login ghcr.io
#
# Usage:
#   ./scripts/deploy-fast.sh              # restart all app services
#   ./scripts/deploy-fast.sh web          # restart only botwave-web
#   ./scripts/deploy-fast.sh web whatsapp # restart specific services
# ================================================================

set -e

DEPLOY_DIR="/opt/botwave/deploy"
REPO_DIR="/opt/botwave"
GHCR_IMAGE="ghcr.io/eksucampusmarketplace-cell/botwave:latest"
START_TIME=$(date +%s)

ALL_SERVICES="botwave-web botwave-whatsapp botwave-telegram botwave-userbot"
SERVICES=()

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

if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=($ALL_SERVICES)
fi

echo "=== BotWave Fast Deploy (GHCR) ==="
echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "[deploy] Services: ${SERVICES[*]}"
echo ""

# 1. Pull pre-built image (only downloads changed layers)
echo "[1/4] Pulling pre-built image from GHCR..."
docker pull "$GHCR_IMAGE" 2>&1 | tail -5

# 2. Tag for compose
docker tag "$GHCR_IMAGE" deploy-botwave-web:latest

# 3. Sync deploy config (compose file + env)
echo "[2/4] Syncing deploy config..."
cd "$REPO_DIR"
git fetch origin BotWave
git reset --hard origin/BotWave

# 4. Restart services
echo "[3/4] Restarting: ${SERVICES[*]}..."
cd "$DEPLOY_DIR"
for svc in "${SERVICES[@]}"; do
  docker compose up -d --no-deps "$svc" 2>&1
done

# 5. Verify
echo "[4/4] Waiting for health..."
sleep 10
docker ps --format "table {{.Names}}\t{{.Status}}" | sort

END_TIME=$(date +%s)
echo ""
echo "=== Deploy complete in $((END_TIME - START_TIME))s ==="

# Cleanup
docker image prune -f 2>&1 | tail -3
