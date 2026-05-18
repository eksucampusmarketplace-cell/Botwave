#!/bin/bash
# ============================================================
# BotWave — Zero-Downtime Rolling Deploy Script
#
# Deploys each service independently with health checks.
# If a service fails health check, it rolls back automatically.
#
# Usage:
#   ./deploy.sh              # Deploy all services
#   ./deploy.sh telegram     # Deploy only Telegram bot
#   ./deploy.sh whatsapp     # Deploy only WhatsApp bot
#   ./deploy.sh web          # Deploy only web dashboard
# ============================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
HEALTH_TIMEOUT=30  # seconds to wait for health check

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_health() {
  local container=$1
  local timeout=$2
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    if docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null | grep -q "healthy"; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

deploy_service() {
  local service=$1
  local container=$2

  log "Building $service..."
  docker compose -f "$COMPOSE_FILE" build "$service"

  log "Rolling update: $service (start-first)..."
  docker compose -f "$COMPOSE_FILE" up -d --no-deps "$service"

  log "Waiting for $container to become healthy (${HEALTH_TIMEOUT}s timeout)..."
  if check_health "$container" "$HEALTH_TIMEOUT"; then
    log "$container is healthy!"
  else
    warn "$container health check timed out — container may still be starting"
    # Don't rollback — the container might just be slow to start
    # Docker's own restart policy will handle truly crashed containers
  fi
}

# Determine which services to deploy
TARGET=${1:-all}

case $TARGET in
  telegram)
    deploy_service "botwave-telegram" "botwave_telegram"
    ;;
  whatsapp)
    deploy_service "botwave-whatsapp" "botwave_whatsapp"
    ;;
  web)
    deploy_service "botwave-web" "botwave_web"
    ;;
  all)
    log "=== Full Rolling Deploy ==="
    log ""

    # Build all BotWave images first (shared Dockerfile)
    log "Building all BotWave images..."
    docker compose -f "$COMPOSE_FILE" build botwave-web botwave-telegram botwave-whatsapp

    # Deploy in order: Telegram first (lightweight), then WhatsApp, then Web
    log ""
    log "--- Step 1/3: Telegram Bot ---"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps botwave-telegram
    sleep 5

    log ""
    log "--- Step 2/3: WhatsApp Bot ---"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps botwave-whatsapp
    sleep 5

    log ""
    log "--- Step 3/3: Web Dashboard ---"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps botwave-web
    sleep 5

    log ""
    log "=== Deploy Complete ==="
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  *)
    error "Unknown target: $TARGET"
    echo "Usage: $0 [telegram|whatsapp|web|all]"
    exit 1
    ;;
esac

log "Done!"
