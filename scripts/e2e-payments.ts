// KumBola payments E2E — wallet top-ups through /api/payments/*.
// Runs against a dev server in simulation mode (no PAYSTACK_SECRET_KEY).
const BASE = process.env.E2E_BASE ?? 'http://localhost:3000'
type Json = Record<string, unknown>
const j = (r: Response) => r.json() as Promise<Json>

let failed = false
function check(name: string, cond: boolean, detail: unknown = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${cond ? '' : ` :: ${JSON.stringify(detail).slice(0, 200)}`}`)
  if (!cond) failed = true
}

async function auth(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signin', email, password }),
  })
  const data = await j(res)
  const s = data.session as { access_token: string } | undefined
  if (!s) throw new Error(`signin failed: ${JSON.stringify(data)}`)
  return s.access_token
}

const cust = await auth('customer@kumbola.com', 'kumbola123')
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${cust}` }

// --- 1. simulated initialize ---
const balRes = await fetch(`${BASE}/api/me`, { headers: { Authorization: `Bearer ${cust}` } }).then(j)
const balanceBefore = Number((balRes.profile as Json)?.wallet_balance)
const initRes = await fetch(`${BASE}/api/payments/initialize`, {
  method: 'POST', headers: H, body: JSON.stringify({ amount: 50, network: 'MTN MoMo' }),
})
const init = await j(initRes)
check('initialize 200', initRes.status === 200, init)
check('simulation mode flagged', init.simulated === true, init)
const ref = init.reference as string
check('reference format KBP-…', typeof ref === 'string' && ref.startsWith('KBP-'), ref)
check(`balance credited (+50: ${balanceBefore} -> ${init.balance})`, Number(init.balance) === balanceBefore + 50, init)

// --- 2. verify is idempotent ---
const verRes = await fetch(`${BASE}/api/payments/verify?reference=${encodeURIComponent(ref)}`, {
  headers: { Authorization: `Bearer ${cust}` },
})
const ver = await j(verRes)
check('verify succeeded', ver.status === 'succeeded' && Number(ver.balance) === balanceBefore + 50, ver)

// --- 3. ownership guard: another user cannot see the reference ---
const drv = await auth('driver@kumbola.com', 'kumbola123')
const ver404 = await fetch(`${BASE}/api/payments/verify?reference=${encodeURIComponent(ref)}`, {
  headers: { Authorization: `Bearer ${drv}` },
})
check("other user's verify -> 404", ver404.status === 404, ver404.status)

// --- 4. validation guards ---
const low = await fetch(`${BASE}/api/payments/initialize`, {
  method: 'POST', headers: H, body: JSON.stringify({ amount: 3, network: 'MTN MoMo' }),
})
check('below minimum rejected', low.status === 400, low.status)
const huge = await fetch(`${BASE}/api/payments/initialize`, {
  method: 'POST', headers: H, body: JSON.stringify({ amount: 5000, network: 'MTN MoMo' }),
})
check('above maximum rejected', huge.status === 400, huge.status)

// --- 5. webhook: inactive without keys, auth required with keys ---
const wh = await fetch(`${BASE}/api/payments/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
check('webhook 503 without keys (simulation mode)', wh.status === 503, wh.status)

// --- 6. transactions ledger shows the simulated top-up ---
const w = await fetch(`${BASE}/api/wallet`, { headers: { Authorization: `Bearer ${cust}` } }).then(j)
const lastTop = ((w.transactions as Json[]) ?? []).find((t) => t.reference === ref)
check('transaction ledger row created', !!lastTop && lastTop.type === 'topup', lastTop)

console.log(failed ? 'PAYMENTS E2E: FAILED' : 'PAYMENTS E2E: ALL PASS')
if (failed) process.exit(1)
