#!/bin/bash
# Docker Cleanup Script — run weekly via cron
# Removes dangling images, stopped containers, and unused networks
#
# Install cron job:
#   crontab -e
#   0 3 * * 0 /opt/botwave/deploy/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1

set -euo pipefail

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [docker-cleanup]"

echo "$LOG_PREFIX Starting Docker cleanup..."

echo "$LOG_PREFIX Removing dangling images..."
docker image prune -f

echo "$LOG_PREFIX Removing stopped containers..."
docker container prune -f

echo "$LOG_PREFIX Removing unused networks..."
docker network prune -f

echo "$LOG_PREFIX Removing unused build cache..."
docker builder prune -f --keep-storage=2GB

echo "$LOG_PREFIX Current disk usage:"
docker system df

echo "$LOG_PREFIX Cleanup complete."
