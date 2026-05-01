#!/usr/bin/env bash
# deploy.sh — build, push, then trigger pull+restart on the droplet
# Usage: ./deploy.sh [user@host]
#   Default host: root@157.230.202.49
set -euo pipefail

HOST="${1:-root@157.230.202.49}"
COMPOSE="docker-compose.prod.yml"
SSH_KEY="/home/tyler/ecf"

# Support both docker compose (v2 plugin) and docker-compose (v1 standalone)
if docker compose version &>/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi

echo "==> Building images..."
$DC -f "$COMPOSE" build

echo "==> Pushing images to registry..."
$DC -f "$COMPOSE" push

echo "==> Deploying to $HOST..."
ssh -i "$SSH_KEY" "$HOST" "cd /root/app && \
  docker compose -f docker-compose.prod.yml pull && \
  docker compose -f docker-compose.prod.yml up -d"

echo "==> Done. Services:"
ssh -i "$SSH_KEY" "$HOST" "docker compose -f /root/app/docker-compose.prod.yml ps"
