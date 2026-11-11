#!/bin/bash
# Real-mode smoke test: run the dev server with an invalid Paystack key and
# confirm provider errors surface correctly (502 on initialize, 401 on bad
# webhook signature), then restore simulation mode.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null; sleep 2
PAYSTACK_SECRET_KEY="sk_test_deliberately_invalid_key_smoke" setsid nohup bash .zscripts/dev.sh </dev/null >/tmp/devlaunch-real.log 2>&1 & disown
for i in $(seq 1 40); do curl -s -o /dev/null -m 2 http://localhost:3000/ && break; sleep 1; done
echo "server up (real mode, invalid key)"

TOKEN=$(curl -s -m 20 -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"customer@kumbola.com","password":"kumbola123"}' \
  | bun -e "const d=await Bun.stdin.json(); console.log(d.session?.access_token||'')")

echo "== initialize with invalid key =="
curl -s -o /tmp/init-res.json -w "HTTP %{http_code}\n" -m 30 -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":20,"network":"MTN MoMo"}'
head -c 200 /tmp/init-res.json; echo

echo "== webhook with bad signature =="
curl -s -o /tmp/wh-res.json -w "HTTP %{http_code}\n" -m 20 -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" -H "x-paystack-signature: deadbeef" -d '{"event":"charge.success","data":{"reference":"x"}}'
head -c 120 /tmp/wh-res.json; echo

echo "== intent marked failed in DB =="
bun -e "import pg from 'pg'; const c=new pg.Client({connectionString:process.env.SUPABASE_DB_SESSION_POOL_URL}); await c.connect(); const r=await c.query(\"select reference,status from payment_intents order by created_at desc limit 1\"); console.log(r.rows[0]); await c.end()"

pkill -f "next dev" 2>/dev/null; sleep 2
setsid nohup bash .zscripts/dev.sh </dev/null >/tmp/devlaunch.log 2>&1 & disown
for i in $(seq 1 40); do curl -s -o /dev/null -m 2 http://localhost:3000/ && break; sleep 1; done
echo "server restored (simulation mode)"
curl -s -m 30 -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' \
  -d '{"action":"signin","email":"customer@kumbola.com","password":"kumbola123"}' > /tmp/signin.json
T2=$(bun -e "const d=await Bun.file('/tmp/signin.json').json(); console.log(d.session?.access_token||'')")
curl -s -m 30 -X POST http://localhost:3000/api/payments/initialize -H "Content-Type: application/json" \
  -H "Authorization: Bearer $T2" -d '{"amount":10,"network":"Telecel Cash"}' | head -c 160; echo
