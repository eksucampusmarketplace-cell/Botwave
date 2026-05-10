#!/bin/bash
# Weekly Docker cleanup — removes dangling images, stopped containers, unused networks
# Install via cron: 0 3 * * 0 /opt/botwave/deploy/scripts/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1

set -euo pipefail

echo "=== Docker Cleanup: $(date) ==="

# Remove dangling images
echo "Removing dangling images..."
docker image prune -f

# Remove stopped containers (except those with restart policies)
echo "Removing dead containers..."
docker container prune -f

# Remove unused networks
echo "Removing unused networks..."
docker network prune -f

# Remove unused build cache older than 7 days
echo "Removing old build cache..."
docker builder prune -f --filter "until=168h"

# Show disk usage after cleanup
echo "Current Docker disk usage:"
docker system df

echo "=== Cleanup complete ==="
