#!/bin/bash
# Docker Cleanup Script — runs daily via cron
# Reclaims disk space by pruning old images, build cache, and stopped containers.
#
# Install cron job (daily at 3 AM):
#   crontab -e
#   0 3 * * * /opt/botwave/deploy/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1

set -euo pipefail

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [docker-cleanup]"

echo "$LOG_PREFIX Starting Docker cleanup..."

# Remove stopped containers
echo "$LOG_PREFIX Removing stopped containers..."
docker container prune -f

# Remove dangling images (untagged layers)
echo "$LOG_PREFIX Removing dangling images..."
docker image prune -f

# Remove unused images older than 48h (keeps current + previous deploy)
echo "$LOG_PREFIX Removing unused images older than 48h..."
docker image prune -a -f --filter "until=48h"

# Remove unused networks
echo "$LOG_PREFIX Removing unused networks..."
docker network prune -f

# Keep 2GB of build cache, prune the rest
echo "$LOG_PREFIX Removing unused build cache (keeping 2GB)..."
docker builder prune -f --keep-storage=2GB

# Remove unused volumes (excluding named volumes attached to running containers)
echo "$LOG_PREFIX Removing unused anonymous volumes..."
docker volume prune -f

echo "$LOG_PREFIX Current disk usage:"
docker system df

DISK_USED=$(df / --output=pcent | tail -1 | tr -d ' %')
if [ "$DISK_USED" -gt 80 ]; then
  echo "$LOG_PREFIX WARNING: Disk usage at ${DISK_USED}% — running aggressive cleanup..."
  docker system prune -a -f --filter "until=24h"
  echo "$LOG_PREFIX Post-aggressive disk usage:"
  docker system df
fi

echo "$LOG_PREFIX Cleanup complete."
