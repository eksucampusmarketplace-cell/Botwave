# BotWave — Contabo VPS Deployment Guide

Deploy BotWave + Evolution API on a single VPS (Contabo, Hetzner, Hostinger, etc.) using Docker Compose.

## What You Get

| Service | Port | Description |
|---------|------|-------------|
| BotWave Web | 3000 | Next.js dashboard + Socket.io game server |
| BotWave Bot (Main) | — | Main bot orchestrator |
| BotWave Workers (x3) | — | Bot workers for session distribution |
| Evolution API | 8080 | WhatsApp connection manager |
| PostgreSQL | — | Database for Evolution API |
| Redis | — | Shared cache for bot + Evolution |
| Portainer | 9000 | Web UI to manage containers & view logs |

## Requirements

- Ubuntu 22.04+ VPS (Contabo Cloud VPS 10 recommended: €3.60/mo)
- At least 4GB RAM
- A domain (optional, for HTTPS)

## Quick Start (One Command)

SSH into your server and run:

```bash
curl -fsSL https://raw.githubusercontent.com/eksucampusmarketplace-cell/Botwave/BotWave/deploy/setup.sh | bash
```

Or manually:

```bash
git clone https://github.com/eksucampusmarketplace-cell/Botwave.git /opt/botwave
cd /opt/botwave/deploy
chmod +x setup.sh update.sh
sudo ./setup.sh
```

## After Setup

### 1. Edit Environment Files

```bash
nano /opt/botwave/deploy/.env.evolution
nano /opt/botwave/deploy/.env.botwave
```

**Important values to set:**
- `.env.evolution`: Generate an API key (`openssl rand -hex 32`)
- `.env.botwave`: Add your Supabase credentials

### 2. Start Everything

```bash
cd /opt/botwave/deploy
docker compose up -d --build
```

First build takes 3-5 minutes. After that, restarts are instant.

### 3. Verify Services Are Running

```bash
docker compose ps
```

All services should show "Up" status.

## Managing Your Server

### View Logs (Terminal)

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f botwave-bot
docker compose logs -f evolution-api
docker compose logs -f botwave-worker-1
```

### View Logs (Web UI — Portainer)

1. Open `http://YOUR_SERVER_IP:9000` in your browser
2. Create an admin account (first time only)
3. Click "Local" → "Containers"
4. Click any container → "Logs" to see live logs

### Update After Code Changes

```bash
cd /opt/botwave/deploy
./update.sh
```

Or manually:

```bash
cd /opt/botwave
git pull
cd deploy
docker compose up -d --build
```

### Restart a Single Service

```bash
docker compose restart botwave-bot
docker compose restart evolution-api
```

### Stop Everything

```bash
docker compose down
```

### Stop Everything AND Delete Data

```bash
docker compose down -v  # WARNING: deletes all database data!
```

## Adding a Domain + HTTPS (Optional)

If you want `https://botwave.yourdomain.com` instead of `http://IP:3000`:

1. Point your domain's A record to your server IP
2. Install Caddy (automatic HTTPS):

```bash
apt install -y caddy
```

3. Edit `/etc/caddy/Caddyfile`:

```
botwave.yourdomain.com {
    reverse_proxy localhost:3000
}

evolution.yourdomain.com {
    reverse_proxy localhost:8080
}
```

4. Restart Caddy:

```bash
systemctl restart caddy
```

Done — Caddy handles SSL certificates automatically.

## Troubleshooting

### Service won't start
```bash
docker compose logs <service-name>
```

### Out of memory
```bash
free -h                    # Check available memory
docker stats               # See per-container memory usage
```

### Can't connect to Evolution API from bot
Make sure `EVOLUTION_API_URL=http://evolution-api:8080` in `.env.botwave` (use Docker service name, not localhost).

### Redis connection error
Verify Redis is running: `docker compose ps redis`

### Port already in use
```bash
lsof -i :3000   # Find what's using the port
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Contabo VPS                           │
│                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │ BotWave Web │   │ Evolution   │   │  Portainer   │  │
│  │  :3000      │   │  API :8080  │   │  :9000       │  │
│  └──────┬──────┘   └──────┬──────┘   └──────────────┘  │
│         │                  │                            │
│  ┌──────┴──────────────────┴──────────────────┐        │
│  │              Docker Network                 │        │
│  └──────┬──────────┬───────────┬──────────────┘        │
│         │          │           │                        │
│  ┌──────┴───┐ ┌────┴────┐ ┌───┴─────┐                  │
│  │ Bot Main │ │  Redis  │ │Postgres │                  │
│  │+ Workers │ │         │ │         │                  │
│  └──────────┘ └─────────┘ └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```
