#!/bin/bash
# Rebuild & redeploy `botwave-web` without losing webhook events from Evolution.
#
# Why: Evolution API delivers WhatsApp events (connection.update,
# messages.upsert, etc.) to `botwave-web:10000/api/evolution/webhook` as
# fire-and-forget HTTP POSTs. While `botwave-web` is being rebuilt (the
# container goes down for ~3-10s during force-recreate), every webhook
# Evolution tries to send fails with ECONNREFUSED and is silently dropped —
# there is no retry queue on the Evolution side. Users perceive this as
# "the bot stopped responding after the deploy".
#
# This script wraps the rebuild with `docker compose pause evolution-api`
# so Evolution stops emitting webhooks during the swap. Once `botwave-web`
# is healthy, Evolution is unpaused and any queued events from WhatsApp
# (which WhatsApp itself holds for ~30s) flush through naturally.
#
# Usage:
#   cd /root/Botwave/deploy && ./rebuild-web.sh
#   cd /root/Botwave/deploy && ./rebuild-web.sh --no-build      # skip docker build, just recreate
#
# Run from the deploy directory or pass DEPLOY_DIR=/root/Botwave/deploy.

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "$0")" && pwd)}"
HEALTH_URL="${HEALTH_URL:-http://localhost:10000/api/health}"
MAX_HEALTH_WAIT="${MAX_HEALTH_WAIT:-90}"
SKIP_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --no-build) SKIP_BUILD=1 ;;
    -h|--help)
      head -20 "$0" | tail -19
      exit 0
      ;;
    *)
      echo "[rebuild-web] Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

log() { echo "[rebuild-web] $(date '+%H:%M:%S') $*"; }

cd "$DEPLOY_DIR"

if [ ! -f docker-compose.yml ]; then
  echo "[rebuild-web] No docker-compose.yml in $DEPLOY_DIR" >&2
  exit 1
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
  log "Building botwave-web image..."
  docker compose build botwave-web
fi

cleanup() {
  # Always unpause Evolution even if the rebuild fails — webhooks dropped
  # for a minute are recoverable, but leaving Evolution paused breaks WhatsApp
  # connectivity entirely.
  if docker ps --filter name=evolution_api --format '{{.Status}}' | grep -q '(Paused)'; then
    log "Unpausing evolution-api (cleanup)"
    docker compose unpause evolution-api >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

log "Pausing evolution-api to queue webhooks during web rebuild..."
docker compose pause evolution-api

log "Recreating botwave-web container..."
docker compose up -d --no-deps --force-recreate botwave-web

log "Waiting for botwave-web to become healthy (max ${MAX_HEALTH_WAIT}s)..."
attempts=0
max_attempts=$((MAX_HEALTH_WAIT / 3))
healthy=0
while [ "$attempts" -lt "$max_attempts" ]; do
  response=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || echo 000)
  if [ "$response" = "200" ]; then
    log "botwave-web is healthy (HTTP 200)"
    healthy=1
    break
  fi
  attempts=$((attempts + 1))
  sleep 3
done

if [ "$healthy" -ne 1 ]; then
  log "WARN: botwave-web did not return 200 within ${MAX_HEALTH_WAIT}s — unpausing Evolution anyway"
fi

log "Unpausing evolution-api..."
docker compose unpause evolution-api

log "Done. Recent web logs:"
docker logs --tail 15 botwave_web 2>&1 || true

if [ "$healthy" -ne 1 ]; then
  exit 1
fi
