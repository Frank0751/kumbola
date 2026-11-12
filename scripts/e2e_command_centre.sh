#!/usr/bin/env bash
# E2E verification of the Command Centre API on the live Cloudflare deployment.
set -u
BASE="https://kumbola.frankkoomson1.workers.dev"

AT=$(curl -sS --max-time 30 -X POST "$BASE/api/auth" -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"admin@kumbola.com","password":"kumbola123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['session']['access_token'])")
[ -z "$AT" ] && { echo "signin FAILED"; exit 1; }
echo "admin signin OK"

AUTH="Authorization: Bearer $AT"
CT="Content-Type: application/json"

echo "--- 1) GET /api/admin?days=30 (payload v2) ---"
curl -sS --max-time 30 -H "$AUTH" "$BASE/api/admin?days=30" -o /tmp/admin.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/admin.json'))
print("days series:", len(d['daily']), "| vettingQueue:", [p['full_name'] + ':' + p['vetting_status'] for p in d['vettingQueue']])
print("reviewQueue statuses:", [r['status'] for r in d['reviewQueue']][:8], "… total", len(d['reviewQueue']))
print("auditEvents:", len(d['auditEvents']), "| drivers:", len(d['drivers']))
print("integrity top:", d['integrity'][0]['fullName'] if d['integrity'] else 'none')
PY

echo "--- 2) dispatch one pending job ---"
BOOKING=$(python3 -c "
import json
d = json.load(open('/tmp/admin.json'))
b = next(b for b in d['recentBookings'] if b['status']=='pending')
drv = next(x for x in d['drivers'] if x['is_online'] and x['vetting_status']=='approved')
print(b['id'], b['reference'], drv['id'], drv['full_name'])")
read -r BID REF DID DNAME <<<"$BOOKING"
echo "dispatching $REF -> $DNAME"
curl -sS --max-time 30 -X POST "$BASE/api/admin/actions" -H "$AUTH" -H "$CT" \
  -d "{\"action\":\"dispatch\",\"bookingId\":\"$BID\",\"driverId\":\"$DID\"}"
echo

echo "--- 3) site close + reopen round-trip ---"
SITE=$(python3 -c "import json; d=json.load(open('/tmp/admin.json')); s=d['sites'][0]; print(s['id'], s['name'], s['is_active'])")
read -r SID SNAME SACTIVE <<<"$SITE"
echo "site: $SNAME (active=$SACTIVE)"
curl -sS --max-time 30 -X POST "$BASE/api/admin/actions" -H "$AUTH" -H "$CT" -d "{\"action\":\"set_site\",\"siteId\":\"$SID\",\"active\":false}"; echo
curl -sS --max-time 30 -X POST "$BASE/api/admin/actions" -H "$AUTH" -H "$CT" -d "{\"action\":\"set_site\",\"siteId\":\"$SID\",\"active\":true}"; echo

echo "--- 4) disposal review reject -> approve round-trip ---"
VID=$(python3 -c "import json; d=json.load(open('/tmp/admin.json')); v=d['reviewQueue'][0]; print(v['id'], v['reference'], v['status'])")
read -r VERID VREF VSTATUS <<<"$VID"
echo "verification for $VREF (status=$VSTATUS)"
curl -sS --max-time 30 -X POST "$BASE/api/admin/actions" -H "$AUTH" -H "$CT" -d "{\"action\":\"review_disposal\",\"verificationId\":\"$VERID\",\"decision\":\"reject\",\"note\":\"E2E test\"}"; echo
curl -sS --max-time 30 -X POST "$BASE/api/admin/actions" -H "$AUTH" -H "$CT" -d "{\"action\":\"review_disposal\",\"verificationId\":\"$VERID\",\"decision\":\"approve\"}"; echo

echo "--- 5) vetting gate: driver5 (pending) tries to go online ---"
DAT=$(curl -sS --max-time 30 -X POST "$BASE/api/auth" -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"driver6@kumbola.com","password":"kumbola123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['session']['access_token'])")
curl -sS --max-time 30 -X POST "$BASE/api/driver" -H "Authorization: Bearer $DAT" -H "$CT" -d '{"online":true}' -w " <- expect 403"; echo

echo "--- 6) audit trail now contains the actions ---"
curl -sS --max-time 30 -H "$AUTH" "$BASE/api/admin?days=7" | python3 -c "
import json,sys
d = json.load(sys.stdin)
for e in d['auditEvents'][:6]: print(' ', e['actorName'], '|', e['action'], '|', e.get('details'))
"
echo "E2E done"
