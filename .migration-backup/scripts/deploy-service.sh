#!/usr/bin/env bash
# deploy-service.sh
#
# Build and restart a single BotWave service on this host without going
# through GitHub Actions. Use it when you want to push a hot-fix from a
# developer machine + SSH or when CI is unavailable.
#
# Usage (run on the VPS, from anywhere):
#   sudo ./deploy-service.sh web
#   sudo ./deploy-service.sh whatsapp
#   sudo ./deploy-service.sh telegram
#   sudo ./deploy-service.sh userbot
#   sudo ./deploy-service.sh web telegram          # multiple at once
#   sudo ./deploy-service.sh all                   # all four
#
# What it does (per service):
#   1. cd into /opt/botwave (override with BOTWAVE_DIR)
#   2. git pull origin BotWave (skip with SKIP_PULL=1)
#   3. docker compose build <service>            (from source, locally)
#   4. docker compose up -d --no-deps <service>  (graceful — SIGTERM only)
#
# It deliberately avoids:
#   - `docker compose down -v` (wipes Evolution Postgres volume)
#   - `docker kill` / `kill -9` (CLAUDE.md: graceful stops only)
#   - touching any service that wasn't requested

set -euo pipefail

BOTWAVE_DIR="${BOTWAVE_DIR:-/opt/botwave}"
DEPLOY_DIR="${BOTWAVE_DIR}/deploy"

ALL_SERVICES=(botwave-web botwave-whatsapp botwave-telegram botwave-userbot)

# Map short name → compose service name.
resolve() {
  case "$1" in
    web|botwave-web)             echo botwave-web ;;
    whatsapp|botwave-whatsapp)   echo botwave-whatsapp ;;
    telegram|botwave-telegram)   echo botwave-telegram ;;
    userbot|botwave-userbot)     echo botwave-userbot ;;
    all)                          printf '%s\n' "${ALL_SERVICES[@]}" ;;
    *)
      echo "Unknown service: $1" >&2
      echo "Valid: web | whatsapp | telegram | userbot | all" >&2
      return 1
      ;;
  esac
}

usage() {
  cat <<'EOF'
Usage: deploy-service.sh <service> [service ...]
       deploy-service.sh all

Services: web | whatsapp | telegram | userbot
Env vars:
  BOTWAVE_DIR=/opt/botwave   Override repo root.
  SKIP_PULL=1                Skip `git pull` (use current working tree).
  SKIP_BUILD=1               Skip `docker compose build` (rely on existing image).
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if [[ ! -d "$DEPLOY_DIR" ]]; then
  echo "deploy/ not found at $DEPLOY_DIR (set BOTWAVE_DIR or check checkout)" >&2
  exit 1
fi

# Resolve the requested services into the full compose service names.
SERVICES=()
while IFS= read -r svc; do
  SERVICES+=("$svc")
done < <(
  for arg in "$@"; do
    resolve "$arg"
  done | awk '!seen[$0]++'
)

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  echo "=== git pull origin BotWave ==="
  git -C "$BOTWAVE_DIR" fetch origin BotWave
  git -C "$BOTWAVE_DIR" reset --hard origin/BotWave
fi

cd "$DEPLOY_DIR"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "=== docker compose build ${SERVICES[*]} ==="
  docker compose build "${SERVICES[@]}"
fi

echo "=== docker compose up -d --no-deps ${SERVICES[*]} ==="
docker compose up -d --no-deps "${SERVICES[@]}"

echo
echo "=== Post-deploy state ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | sort
