#!/usr/bin/env bash
# Smoke test for the Cloudflare Workers deployment of KumBola.
# Verifies: (1) landing page, (2) /api/data -> proves SUPABASE_SECRET_KEY binding,
# (3) demo sign-in, (4) authenticated /api/bookings. Tokens are never printed.
set -u
BASE="https://kumbola.frankkoomson1.workers.dev"
EMAIL="customer@kumbola.com"
PASS="kumbola123"

echo "--- 1) Landing page ---"
code=$(curl -sS -o /tmp/cf_home.html -w "%{http_code}" --max-time 30 "$BASE/")
echo "HTTP $code, bytes: $(wc -c < /tmp/cf_home.html)"
grep -o "<title>[^<]*</title>" /tmp/cf_home.html | head -1

echo "--- 2) GET /api/data (public, uses service-role client) ---"
code=$(curl -sS -o /tmp/cf_data.json -w "%{http_code}" --max-time 30 "$BASE/api/data")
echo "HTTP $code"
python3 - <<'PY'
import json
try:
    d = json.load(open('/tmp/cf_data.json'))
    print("plans:", len(d.get('plans', [])), "| sites:", len(d.get('sites', [])), "| municipalities:", len(d.get('municipalities', [])))
except Exception as e:
    print("parse error:", e, open('/tmp/cf_data.json').read()[:200])
PY

echo "--- 3) POST /api/auth signin (demo account) ---"
curl -sS --max-time 30 -X POST "$BASE/api/auth" \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"signin\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  -o /tmp/cf_auth.json -w "HTTP %{http_code}\n"

ACCESS=$(python3 - <<'PY'
import json
try:
    d = json.load(open('/tmp/cf_auth.json'))
    # /api/auth returns {session: {access_token, ...}, user: {...}} — accept both shapes
    at = d.get('access_token') or (d.get('session') or {}).get('access_token') or ''
    print(at)
except Exception:
    print('')
PY
)
python3 - <<'PY'
import json
d = json.load(open('/tmp/cf_auth.json'))
s = d.get('session') or {}
u = d.get('user') or s.get('user') or {}
print("keys:", sorted(d.keys()))
print("user email:", u.get('email'))
print("has access_token:", bool(d.get('access_token') or s.get('access_token')))
print("error:", d.get('error') or d.get('msg') or 'none')
PY

echo "--- 4) GET /api/bookings (authenticated) ---"
if [ -n "$ACCESS" ]; then
  code=$(curl -sS -o /tmp/cf_bookings.json -w "%{http_code}" --max-time 30 \
    -H "Authorization: Bearer $ACCESS" "$BASE/api/bookings")
  echo "HTTP $code"
  python3 - <<'PY'
import json
try:
    d = json.load(open('/tmp/cf_bookings.json'))
    b = d.get('bookings', d if isinstance(d, list) else [])
    print("bookings count:", len(b))
except Exception as e:
    print("parse error:", e, open('/tmp/cf_bookings.json').read()[:200])
PY
else
  echo "skipped (no access token)"
fi
