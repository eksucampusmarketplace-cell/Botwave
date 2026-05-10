#!/bin/bash
# ========================================================
# BotWave — First-time SSL Setup with Let's Encrypt
# Run this ONCE after deploying to set up HTTPS
# ========================================================
set -e

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="botwave.online"
EMAIL="${1:-admin@botwave.online}"

echo "[SSL] Setting up HTTPS for $DOMAIN"
echo "[SSL] Email: $EMAIL"
echo ""

# Step 1: Use pre-SSL config (HTTP only, no certs needed)
echo "[SSL] Step 1: Starting Nginx with HTTP-only config..."
cp "$DEPLOY_DIR/nginx/pre-ssl.conf" "$DEPLOY_DIR/nginx/active.conf"
cd "$DEPLOY_DIR"
docker compose up -d nginx

echo "[SSL] Waiting for Nginx to start..."
sleep 5

# Step 2: Request certificates
echo "[SSL] Step 2: Requesting SSL certificates from Let's Encrypt..."
docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "evo.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email

# Step 3: Switch to full SSL config
echo "[SSL] Step 3: Switching to HTTPS config..."
cp "$DEPLOY_DIR/nginx/default.conf" "$DEPLOY_DIR/nginx/active.conf"
docker compose restart nginx

echo ""
echo "[SSL] Done! HTTPS is now active."
echo "[SSL] https://$DOMAIN"
echo "[SSL] https://evo.$DOMAIN"
echo ""
echo "[SSL] Certificates auto-renew via the certbot container."
echo "[SSL] To manually renew: docker compose run --rm certbot renew"
