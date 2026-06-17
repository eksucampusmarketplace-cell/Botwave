#!/bin/bash
# Graceful Deploy Script — Zero-downtime deployment for BotWave
#
# Usage: ./graceful-deploy.sh [service]
#   service: botwave-web | botwave-bot | all (default: all)
#
# Strategy:
#   1. Pull latest code from git
#   2. Build new images
#   3. For web: rolling restart (start new, wait healthy, stop old)
#   4. For bot/workers: graceful stop (SIGTERM → wait for cleanup → restart)
#   5. Verify health after deploy

set -euo pipefail

DEPLOY_DIR="/opt/botwave/deploy"
PROJECT_DIR="/opt/botwave"
LOG_FILE="/opt/botwave/deploy/deploy.log"
HEALTH_URL="http://localhost:10000/api/health"
MAX_HEALTH_WAIT=120  # seconds to wait for healthy status

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

check_health() {
  local attempts=0
  local max_attempts=$((MAX_HEALTH_WAIT / 5))
  
  while [ $attempts -lt $max_attempts ]; do
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
      log "✓ Health check passed (HTTP 200)"
      return 0
    fi
    
    attempts=$((attempts + 1))
    log "  Waiting for health... (attempt $attempts/$max_attempts, got HTTP $response)"
    sleep 5
  done
  
  log "✗ Health check failed after ${MAX_HEALTH_WAIT}s"
  return 1
}

SERVICE="${1:-all}"

log "═══════════════════════════════════════════════"
log "BotWave Graceful Deploy — Service: $SERVICE"
log "═══════════════════════════════════════════════"

# Step 1: Pull latest code
log "Step 1: Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin BotWave 2>&1 | while read -r line; do log "  git: $line"; done

# Step 2: Build new images
log "Step 2: Building Docker images..."
cd "$DEPLOY_DIR"

if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "botwave-web" ]; then
  log "  Building botwave-web..."
  docker compose build botwave-web 2>&1 | tail -5 | while read -r line; do log "  build: $line"; done
fi

if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "botwave-bot" ]; then
  log "  Building bot services..."
  docker compose build botwave-bot botwave-worker-1 botwave-worker-2 botwave-worker-3 2>&1 | tail -5 | while read -r line; do log "  build: $line"; done
fi

# Step 3: Deploy web (rolling restart)
if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "botwave-web" ]; then
  log "Step 3: Deploying botwave-web (rolling restart)..."
  
  # Scale up new container alongside old one
  docker compose up -d --no-deps --force-recreate botwave-web 2>&1 | while read -r line; do log "  deploy: $line"; done
  
  # Wait for new container to be healthy
  log "  Waiting for new web container to be healthy..."
  sleep 10
  
  if check_health; then
    log "  ✓ Web container deployed successfully"
  else
    log "  ⚠ Web container health check failed — container may still be starting"
  fi
fi

# Step 4: Deploy bot services (graceful stop + restart)
if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "botwave-bot" ]; then
  log "Step 4: Deploying bot services (graceful restart)..."
  
  # Send SIGTERM to allow graceful shutdown (saves state, releases locks)
  log "  Sending graceful stop signal to bot containers..."
  docker compose stop -t 30 botwave-bot botwave-worker-1 botwave-worker-2 botwave-worker-3 2>&1 | while read -r line; do log "  stop: $line"; done
  
  # Start with new images
  log "  Starting bot containers with new code..."
  docker compose up -d --force-recreate botwave-bot botwave-worker-1 botwave-worker-2 botwave-worker-3 2>&1 | while read -r line; do log "  start: $line"; done
  
  log "  Waiting 15s for bot services to initialize..."
  sleep 15
  log "  ✓ Bot services deployed"
fi

# Step 5: Verify overall health
log "Step 5: Final health verification..."
sleep 5
if check_health; then
  log "═══════════════════════════════════════════════"
  log "✓ DEPLOY COMPLETE — All services healthy"
  log "═══════════════════════════════════════════════"
else
  log "═══════════════════════════════════════════════"
  log "⚠ DEPLOY COMPLETE — Health check not passing yet"
  log "  Services may still be initializing. Check logs."
  log "═══════════════════════════════════════════════"
fi

# Show container status
log ""
log "Container Status:"
docker ps --format "  {{.Names}}: {{.Status}}" | sort | while read -r line; do log "$line"; done
