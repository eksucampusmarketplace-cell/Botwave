#!/bin/bash
# Hotfix: faster command replies + route instance webhooks to webhook worker
set -eu

DEPLOY_DIR="${DEPLOY_DIR:-/opt/botwave/deploy}"

# Per-instance webhooks should not hammer the dashboard container
if grep -q 'WEBHOOK_BASE_URL=http://botwave-web:10000' "$DEPLOY_DIR/.env.botwave" 2>/dev/null; then
  sed -i 's|WEBHOOK_BASE_URL=http://botwave-web:10000|WEBHOOK_BASE_URL=http://botwave_webhook_worker:10000|' "$DEPLOY_DIR/.env.botwave"
  echo "Updated WEBHOOK_BASE_URL -> botwave_webhook_worker"
fi

patch_container() {
  local name="$1"
  local mq="/app/dist/bot/bot/whatsapp/utils/MessageQueue.js"
  local mh="/app/dist/bot/bot/whatsapp/handlers/MessageHandler.js"
  docker exec "$name" test -f "$mq" || return 0
  docker exec "$name" sed -i \
    -e 's/const minDelay = 2000;/const minDelay = (msg.fast ? 150 : 200);/' \
    -e 's/const maxDelay = 5000;/const maxDelay = (msg.fast ? 400 : 800);/' \
    "$mq" 2>/dev/null || true
  docker exec "$name" sed -i \
    -e 's/await delay(500 + Math.random() \* 1500)/await delay(80 + Math.random() * 120)/' \
    "$mh" 2>/dev/null || true
  echo "Patched $name"
}

patch_container botwave_whatsapp
patch_container botwave_webhook_worker

docker restart botwave_whatsapp botwave_webhook_worker
echo "Restarted bot containers. Dashboard web left running."
