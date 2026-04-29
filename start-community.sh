#!/usr/bin/env bash
# Start the community stack, automatically including the GSM modem override
# if /dev/ttyUSB2 is present on the host.
set -e

COMPOSE_FILES="-f docker-compose.community.yml"

if [ -e /dev/ttyUSB2 ]; then
    echo "GSM modem detected at /dev/ttyUSB2 — enabling SMS."
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.gsm.yml"
else
    echo "GSM modem not present — starting without SMS support."
fi

exec sudo docker-compose $COMPOSE_FILES "$@"
