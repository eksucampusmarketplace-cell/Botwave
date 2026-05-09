#!/bin/bash
# ========================================================
# BotWave + Evolution API — One-Click Server Setup
# Run this on a fresh Ubuntu VPS (Contabo, Hetzner, etc.)
# ========================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   BotWave + Evolution API — Server Setup        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Update system ──
echo "[1/6] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ──
echo "[2/6] Installing Docker..."
if command -v docker &>/dev/null; then
  echo "  Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "  Docker installed: $(docker --version)"
fi

# ── 3. Install Docker Compose plugin ──
echo "[3/6] Verifying Docker Compose..."
if docker compose version &>/dev/null; then
  echo "  Docker Compose available: $(docker compose version)"
else
  apt-get install -y docker-compose-plugin
  echo "  Docker Compose installed: $(docker compose version)"
fi

# ── 4. Clone repo ──
echo "[4/6] Setting up BotWave..."
APP_DIR="/opt/botwave"

if [ -d "$APP_DIR" ]; then
  echo "  Directory $APP_DIR already exists. Pulling latest..."
  cd "$APP_DIR"
  git pull
else
  git clone https://github.com/eksucampusmarketplace-cell/Botwave.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Setup env files ──
echo "[5/6] Setting up environment files..."
cd "$APP_DIR/deploy"

if [ ! -f .env.evolution ]; then
  cp .env.evolution.example .env.evolution
  echo "  Created .env.evolution — EDIT THIS FILE with your values!"
else
  echo "  .env.evolution already exists, skipping."
fi

if [ ! -f .env.botwave ]; then
  cp .env.botwave.example .env.botwave
  echo "  Created .env.botwave — EDIT THIS FILE with your values!"
else
  echo "  .env.botwave already exists, skipping."
fi

# Docker Compose reads ${VAR} substitutions from .env in the same directory.
# Symlink .env -> .env.botwave so build args resolve correctly.
ln -sf .env.botwave .env
echo "  Linked .env -> .env.botwave for Docker Compose build args."

# ── 6. Setup firewall ──
echo "[6/6] Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP (for future nginx/caddy)
  ufw allow 443/tcp   # HTTPS
  ufw allow 3000/tcp  # BotWave Web
  ufw allow 8080/tcp  # Evolution API
  ufw allow 9000/tcp  # Portainer
  ufw --force enable
  echo "  Firewall configured."
else
  echo "  ufw not found, skipping firewall setup."
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Setup Complete!                                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit your environment files:"
echo "     nano $APP_DIR/deploy/.env.evolution"
echo "     nano $APP_DIR/deploy/.env.botwave"
echo ""
echo "  2. Start all services:"
echo "     cd $APP_DIR/deploy"
echo "     docker compose up -d --build"
echo ""
echo "  3. View logs:"
echo "     docker compose logs -f"
echo ""
echo "  4. Open Portainer (web dashboard for logs/management):"
echo "     http://YOUR_SERVER_IP:9000"
echo ""
echo "  5. Your services will be at:"
echo "     BotWave Web:     http://YOUR_SERVER_IP:3000"
echo "     Evolution API:   http://YOUR_SERVER_IP:8080"
echo "     Portainer:       http://YOUR_SERVER_IP:9000"
echo ""
