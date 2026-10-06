#!/bin/sh
# Restarts draw.service when the DRAW API stops answering its health check, or
# answers that its own state file no longer reads, twice in a row.
# draw-health.timer runs it every minute. The API answers only requests that
# carry the service token, so the unit loads the app's .env for
# DRAW_SERVICE_TOKEN and PORT. A ledger that does not answer is logged and left
# to the uptime monitor, since restarting the API cannot fix it. Restarts are
# at least ten minutes apart.
set -u

url="${DRAW_HEALTH_URL:-http://127.0.0.1:${PORT:-4173}/api/health}"
state="${STATE_DIRECTORY:-/var/lib/draw-health}"
cooldown="${DRAW_HEALTH_COOLDOWN_SECONDS:-600}"
mkdir -p "$state"

count() {
  value=$(tr -cd '0-9' < "$state/$1" 2>/dev/null)
  echo "${value:-0}"
}

# The token goes to curl on stdin, so it never shows in the process list.
body="$state/last-response.json"
code=$(printf 'x-draw-service: %s\n' "${DRAW_SERVICE_TOKEN:-}" | curl --silent --max-time 15 --header @- \
  --output "$body" --write-out '%{http_code}' "$url")

case "$code" in
  200)
    echo 0 > "$state/failures"
    exit 0
    ;;
  403)
    # A wrong or missing token is a setup problem. Restarting would not fix it.
    echo "the API refused the health check with 403. Check DRAW_SERVICE_TOKEN in the environment file." >&2
    exit 1
    ;;
  000)
    reason="no answer within 15 seconds"
    ;;
  *)
    if grep -q '"state":{"ok":false' "$body" 2>/dev/null; then
      reason="HTTP $code, the API cannot read its state file"
    else
      # The API answered, so the process is up. Whatever failed, most often the
      # ledger, is outside what a restart can fix.
      echo 0 > "$state/failures"
      echo "draw health check answered HTTP $code: $(head -c 400 "$body" 2>/dev/null). Not restarting, since the API itself answered."
      exit 0
    fi
    ;;
esac

failures=$(( $(count failures) + 1 ))
echo "$failures" > "$state/failures"
echo "draw health check failed ($reason), $failures in a row"
if [ "$failures" -lt 2 ]; then
  exit 0
fi

now=$(date +%s)
if [ $(( now - $(count restarted-at) )) -lt "$cooldown" ]; then
  echo "draw.service was restarted less than $cooldown seconds ago, waiting before another restart"
  exit 0
fi

echo "restarting draw.service"
echo "$now" > "$state/restarted-at"
echo 0 > "$state/failures"
systemctl restart draw.service
