#!/bin/bash
# ========================================================
# BotWave — Update & Redeploy
# Run this whenever you push new code to GitHub
# ========================================================
set -e

APP_DIR="/opt/botwave"
cd "$APP_DIR"

echo "[UPDATE] Pulling latest code..."
git pull

echo "[UPDATE] Rebuilding and restarting services..."
cd deploy
# Ensure .env symlink exists for Docker Compose build args
ln -sf .env.botwave .env
docker compose up -d --build

echo "[UPDATE] Done! Services restarting..."
echo ""
echo "View logs: docker compose logs -f"
echo "Check status: docker compose ps"
