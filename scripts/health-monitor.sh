#!/bin/bash
# health-monitor.sh — Infrastructure health check for BotWave
# Run from VPS: bash /opt/botwave/scripts/health-monitor.sh
# Or schedule via cron: */5 * * * * /opt/botwave/scripts/health-monitor.sh >> /var/log/botwave-health.log 2>&1

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILURES=0
WARNINGS=0

check() {
  local name="$1" cmd="$2" critical="${3:-true}"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} $name"
  elif [ "$critical" = "true" ]; then
    echo -e "${RED}[FAIL]${NC} $name"
    FAILURES=$((FAILURES + 1))
  else
    echo -e "${YELLOW}[WARN]${NC} $name"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo "=== BotWave Health Check — $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
echo ""

# 1. Container health
echo "─── Docker Containers ───"
for svc in botwave_web botwave_whatsapp botwave_telegram botwave_userbot evolution_api botwave_redis; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "not_found")
  case "$status" in
    healthy)   echo -e "${GREEN}[OK]${NC} $svc (healthy)" ;;
    unhealthy) echo -e "${RED}[FAIL]${NC} $svc (unhealthy)"; FAILURES=$((FAILURES + 1)) ;;
    starting)  echo -e "${YELLOW}[WARN]${NC} $svc (starting)"; WARNINGS=$((WARNINGS + 1)) ;;
    *)         echo -e "${RED}[FAIL]${NC} $svc ($status)"; FAILURES=$((FAILURES + 1)) ;;
  esac
done

echo ""
echo "─── Service Endpoints ───"

# 2. BotWave web reachability
check "botwave-web HTTP" "curl -sf -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/ | grep -q '200\|301\|302'"

# 3. Evolution API reachability
check "evolution-api HTTP" "curl -sf -o /dev/null --max-time 10 http://localhost:8080/"

# 4. Webhook reachability (Evolution → BotWave via Docker network)
echo ""
echo "─── Webhook Connectivity ───"
WEBHOOK_STATUS=$(docker exec evolution_api wget -q -O /dev/null --timeout=5 http://botwave-web:10000/api/evolution/webhook 2>&1; echo $?)
if [ "$WEBHOOK_STATUS" = "0" ] || docker exec evolution_api wget -q -O /dev/null --timeout=5 http://botwave-web:10000/api/evolution/webhook 2>&1 | grep -q "405"; then
  echo -e "${GREEN}[OK]${NC} evolution-api → botwave-web webhook (reachable)"
else
  echo -e "${RED}[FAIL]${NC} evolution-api → botwave-web webhook (UNREACHABLE)"
  FAILURES=$((FAILURES + 1))
fi

# 5. Redis connectivity
echo ""
echo "─── Redis ───"
check "redis ping" "docker exec botwave_redis redis-cli ping | grep -q PONG"
REDIS_MEMORY=$(docker exec botwave_redis redis-cli info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "unknown")
echo "  Redis memory: $REDIS_MEMORY"

# 6. Proxy health spot-check (test first 3 proxies from pool)
echo ""
echo "─── Proxy Spot-Check ───"
PROXY_LIST=$(docker exec botwave_whatsapp printenv PROXY_LIST 2>/dev/null || echo "")
if [ -n "$PROXY_LIST" ]; then
  PROXY_COUNT=$(echo "$PROXY_LIST" | tr ',' '\n' | wc -l)
  echo "  Total proxies in pool: $PROXY_COUNT"

  # Test first 3 proxies
  TESTED=0
  PROXY_OK=0
  while IFS=',' read -ra PROXIES; do
    for proxy in "${PROXIES[@]}"; do
      [ $TESTED -ge 3 ] && break
      HOST=$(echo "$proxy" | cut -d: -f1)
      PORT=$(echo "$proxy" | cut -d: -f2)
      USER=$(echo "$proxy" | cut -d: -f3)
      PASS=$(echo "$proxy" | cut -d: -f4)
      TESTED=$((TESTED + 1))
      if curl -sf -o /dev/null --max-time 8 --proxy "http://${USER}:${PASS}@${HOST}:${PORT}" https://web.whatsapp.com 2>/dev/null; then
        echo -e "  ${GREEN}[OK]${NC} Proxy $HOST:$PORT → WhatsApp reachable"
        PROXY_OK=$((PROXY_OK + 1))
      else
        echo -e "  ${YELLOW}[WARN]${NC} Proxy $HOST:$PORT → WhatsApp unreachable"
        WARNINGS=$((WARNINGS + 1))
      fi
    done
  done <<< "$PROXY_LIST"
  echo "  Spot-check: $PROXY_OK/$TESTED proxies healthy"
else
  echo -e "  ${YELLOW}[WARN]${NC} No PROXY_LIST configured"
  WARNINGS=$((WARNINGS + 1))
fi

# 7. Disk usage
echo ""
echo "─── Disk ───"
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo -e "${RED}[FAIL]${NC} Disk usage: ${DISK_USAGE}%"
  FAILURES=$((FAILURES + 1))
elif [ "$DISK_USAGE" -gt 80 ]; then
  echo -e "${YELLOW}[WARN]${NC} Disk usage: ${DISK_USAGE}%"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}[OK]${NC} Disk usage: ${DISK_USAGE}%"
fi

# 8. Memory
MEMORY_FREE=$(free -m | awk 'NR==2{printf "%d/%dMB (%.0f%% used)", $3, $2, $3*100/$2}')
echo "  Memory: $MEMORY_FREE"

# Summary
echo ""
echo "═══════════════════════════════════════"
if [ $FAILURES -gt 0 ]; then
  echo -e "${RED}RESULT: $FAILURES failure(s), $WARNINGS warning(s)${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}RESULT: All critical checks passed, $WARNINGS warning(s)${NC}"
  exit 0
else
  echo -e "${GREEN}RESULT: All checks passed${NC}"
  exit 0
fi
