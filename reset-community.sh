#!/usr/bin/env bash
# reset-community.sh — tear down the local community stack and wipe all data volumes,
# then bring it back up fresh.
#
# Usage: ./reset-community.sh
set -euo pipefail

COMPOSE_FILE="docker-compose.community.yml"

echo "==> Stopping and removing containers + volumes..."
docker-compose -f "$COMPOSE_FILE" down -v

echo "==> Starting fresh..."
docker-compose -f "$COMPOSE_FILE" up --build -d

echo "==> Done. Logs (Ctrl-C to stop following):"
docker-compose -f "$COMPOSE_FILE" logs -f
