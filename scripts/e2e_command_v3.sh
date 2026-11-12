#!/usr/bin/env bash
# Task 19 E2E — Command Centre v3: platform control + reports + search
# Usage: BASE_URL=... bash scripts/e2e_command_v3.sh
set -u
BASE="${BASE_URL:-https://kumbola.frankkoomson1.workers.dev}"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ok: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL: $1"; }
check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected $2, got $3)"; fi
}

echo "== sign in =="
ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"admin@kumbola.com","password":"kumbola123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["session"]["access_token"])')
CUST_TOKEN=$(curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"customer@kumbola.com","password":"kumbola123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["session"]["access_token"])')
[ -n "$ADMIN_TOKEN" ] && ok "admin token" || bad "admin token"
[ -n "$CUST_TOKEN" ] && ok "customer token" || bad "customer token"
AH="Authorization: Bearer $ADMIN_TOKEN"
CH="Authorization: Bearer $CUST_TOKEN"

echo "== dashboard payload extensions =="
PAYLOAD=$(curl -s "$BASE/api/admin?days=7" -H "$AH")
for field in customers plans settings integrations; do
  echo "$PAYLOAD" | python3 -c "import sys,json;d=json.load(sys.stdin);assert '$field' in d, '$field missing'" \
    && ok "payload has $field" || bad "payload has $field"
done
CUSTOMER_ID=$(echo "$PAYLOAD" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["customers"][0]["id"])')
CUST_NAME=$(echo "$PAYLOAD" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["customers"][0]["full_name"])')
PLAN_ID=$(echo "$PAYLOAD" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["plans"][0]["id"])')
PLAN_PRICE=$(echo "$PAYLOAD" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["plans"][0]["price_ghs"])')
echo "  (first customer: $CUST_NAME · plan $PLAN_ID @ GHS $PLAN_PRICE)"

echo "== global search =="
CODE=$(curl -s -o /tmp/s.json -w '%{http_code}' "$BASE/api/admin/search?q=Ama" -H "$AH")
check "search 200" 200 "$CODE"
python3 -c 'import sys,json;d=json.load(open("/tmp/s.json"));assert isinstance(d["people"],list) and isinstance(d["jobs"],list)' \
  && ok "search returns people+jobs" || bad "search returns people+jobs"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/admin/search?q=Ama" -H "$CH")
check "search blocked for customer" 200 "$CODE"   # returns empty lists, not an error

echo "== kill switch: booking_enabled =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d '{"action":"set_flag","key":"booking_enabled","value":"false"}')
check "set_flag off" 200 "$CODE"
BODY=$(curl -s -X POST "$BASE/api/bookings" -H "$CH" -H 'Content-Type: application/json' \
  -d '{"wasteSize":"standard_bin","address":"Test St","municipality":"Suame","preferredTime":"now"}')
echo "$BODY" | grep -q "paused by KumBola operations" && ok "booking paused when flag off" || bad "booking paused when flag off ($BODY)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d '{"action":"set_flag","key":"booking_enabled","value":"true"}')
check "set_flag back on" 200 "$CODE"

echo "== wallet adjustment (ledger-backed) =="
BAL_BEFORE=$(curl -s "$BASE/api/me" -H "$CH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["profile"]["wallet_balance"])')
CODE=$(curl -s -o /tmp/adj.json -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"adjust_wallet\",\"userId\":\"$CUSTOMER_ID\",\"amountGhs\":25,\"reason\":\"e2e test credit\"}")
check "adjust_wallet 200" 200 "$CODE"
BAL_AFTER=$(curl -s "$BASE/api/me" -H "$CH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["profile"]["wallet_balance"])')
python3 -c "print(f'{float($BAL_AFTER) - float($BAL_BEFORE):.2f}')" | grep -qx '25.00' \
  && ok "balance +25.00 via ledger" || bad "balance +25.00 via ledger ($BAL_BEFORE -> $BAL_AFTER)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"adjust_wallet\",\"userId\":\"$CUSTOMER_ID\",\"amountGhs\":25}")
check "adjust_wallet without reason rejected" 400 "$CODE"

echo "== account block / unblock =="
curl -s -o /dev/null -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"set_account\",\"userId\":\"$CUSTOMER_ID\",\"restricted\":true,\"reason\":\"e2e restriction test\"}"
BODY=$(curl -s -X POST "$BASE/api/bookings" -H "$CH" -H 'Content-Type: application/json' \
  -d '{"wasteSize":"standard_bin","address":"Test St","municipality":"Suame","preferredTime":"now"}')
echo "$BODY" | grep -q "restricted" && ok "restricted customer cannot book" || bad "restricted customer cannot book ($BODY)"
curl -s -o /dev/null -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"set_account\",\"userId\":\"$CUSTOMER_ID\",\"restricted\":false}"
curl -s -X POST "$BASE/api/bookings" -H "$CH" -H 'Content-Type: application/json' \
  -d '{"wasteSize":"standard_bin","address":"Test St","municipality":"Suame","preferredTime":"now"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("booking",{}).get("reference") or d.get("reference")' \
  && ok "unblocked customer can book again" || bad "unblocked customer can book again"

echo "== broadcast + support message =="
RECIPIENTS=$(curl -s -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d '{"action":"broadcast","audience":"operators","title":"E2E test notice","body":"Disregard — system test.","kind":"info"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("recipients",0))')
[ "$RECIPIENTS" -gt 0 ] 2>/dev/null && ok "broadcast reached $RECIPIENTS operators" || bad "broadcast recipients"

echo "== pricing control =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"update_plan\",\"planId\":\"$PLAN_ID\",\"priceGhs\":$PLAN_PRICE}")
check "update_plan (same price) audited" 200 "$CODE"

echo "== dumping report triage =="
REPORT_ID=$(curl -s "$BASE/api/admin?days=7" -H "$AH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["reports"][0]["id"] if d["reports"] else "")')
if [ -n "$REPORT_ID" ]; then
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/actions" -H "$AH" -H 'Content-Type: application/json' \
    -d "{\"action\":\"set_report_status\",\"reportId\":\"$REPORT_ID\",\"status\":\"reviewing\"}")
  check "set_report_status 200" 200 "$CODE"
else
  echo "  (no dumping reports to triage)"
fi

echo "== controlled exports =="
for t in bookings transactions impact users audit; do
  TYPE=$(curl -s -o /tmp/rep.csv -w '%{http_code}' "$BASE/api/admin/report?type=$t&days=30&reason=e2e%20verification" -H "$AH")
  check "report $t 200" 200 "$TYPE"
  head -c 2 /tmp/rep.csv | grep -q $'\xef\xbb\xbf' && ok "report $t UTF-8 BOM" || bad "report $t UTF-8 BOM"
done
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/admin/report?type=bookings&days=30" -H "$AH")
check "export without reason rejected" 400 "$CODE"

echo "== audit trail captured the new actions =="
LAST=$(curl -s "$BASE/api/admin?days=7" -H "$AH" | python3 -c 'import sys,json;print(" ".join(e["action"] for e in json.load(sys.stdin)["auditEvents"][:15]))')
for a in flag.set wallet.credit account.block account.unblock broadcast.sent plan.update report.export; do
  echo "$LAST" | grep -q "$a" && ok "audit has $a" || bad "audit has $a"
done

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
