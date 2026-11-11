// KumBola golden-path E2E via the app's own API layer (same endpoints the UI calls).
// Customer books -> driver accepts -> collects with pickup code -> disposal verified -> payouts released -> admin sees KPIs.
const BASE = process.env.E2E_BASE ?? 'http://localhost:3000'

type Json = Record<string, unknown>
const j = (r: Response) => r.json() as Promise<Json>

async function auth(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signin', email, password }),
  })
  const data = await j(res)
  const session = data.session as { access_token: string; profile: Json } | undefined
  if (!session) throw new Error(`signin failed for ${email}: ${JSON.stringify(data)}`)
  return { token: session.access_token, profile: session.profile }
}

async function api(token: string, path: string, body?: Json, method = 'GET') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await j(res)
  return { status: res.status, data }
}

function check(name: string, cond: boolean, detail: unknown = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${cond ? '' : ` :: ${JSON.stringify(detail).slice(0, 220)}`}`)
  if (!cond) process.exitCode = 1
}

// --- 1. customer signs in ---
const cust = await auth('customer@kumbola.com', 'kumbola123')
const balanceBefore = Number(cust.profile.wallet_balance)
console.log(`customer: ${cust.profile.full_name} — wallet GHS ${balanceBefore}, role ${cust.profile.role}`)

// --- 2. book a small-sack pickup now ---
const bk = await api(cust.token, '/api/bookings', {
  wasteSize: 'small_sack', preferredTime: 'now', address: 'House 12, Asuoyeboah Main Road, Suame',
}, 'POST')
check('booking created (201)', bk.status === 201 || bk.status === 200, bk)
const booking = bk.data.booking as { id: string; reference: string; pickup_code: string; amount_ghs: number } | undefined
check('booking has reference + pickup code', !!booking?.reference && !!booking?.pickup_code, bk.data)
console.log(`booking: ${booking?.reference} — pickup code ${booking?.pickup_code} — GHS ${booking?.amount_ghs}`)

// --- 3. wallet debited ---
const me = await api(cust.token, '/api/me')
const balanceAfter = Number((me.data.profile as Json)?.wallet_balance)
check(`wallet debited by ${booking?.amount_ghs} (${balanceBefore} -> ${balanceAfter})`, balanceAfter === balanceBefore - Number(booking?.amount_ghs), me.data)

// --- disposal sites (needed for verification) ---
const pub = await fetch(`${BASE}/api/data`).then(j)
const sites = (pub.sites as Json[]) ?? []
check('disposal sites public', sites.length >= 5, sites.length)

// --- 4. driver goes online ---
const drv = await auth('driver@kumbola.com', 'kumbola123')
const on = await api(drv.token, '/api/driver', { online: true }, 'POST')
check('driver online toggle', on.status === 200 && on.data.is_online === true, on)

// --- 5. driver sees the job board; finish any pre-existing active job first (business rule) ---
const dash = await api(drv.token, '/api/driver')
const available = (dash.data.available as Json[]) ?? []
const mine = available.find((b) => b.reference === booking?.reference)
check('new booking visible on driver job board', !!mine, available.map((b) => b.reference))

const active = dash.data.active as { id: string; reference: string } | undefined
if (active) {
  console.log(`driver has pre-existing active job ${active.reference} — finishing it first`)
  const { default: pg } = await import('pg')
  const dbc = new pg.Client({ connectionString: process.env.SUPABASE_DB_SESSION_POOL_URL })
  await dbc.connect()
  const codeRes = await dbc.query('select pickup_code from bookings where id = $1', [active.id])
  await dbc.end()
  const activeCode = String(codeRes.rows[0]?.pickup_code)
  const colA = await api(drv.token, '/api/bookings/actions', { bookingId: active.id, action: 'collect', code: activeCode }, 'POST')
  check('pre-existing job collected', colA.status === 200, colA)
  const verA = await api(drv.token, '/api/bookings/actions', {
    bookingId: active.id, action: 'verify', siteId: (sites[0] as { id: string }).id, weightKg: 40, recyclablesKg: 6,
  }, 'POST')
  check('pre-existing job disposal verified', verA.status === 200, verA)
}

const acc = await api(drv.token, '/api/bookings/actions', { bookingId: booking!.id, action: 'accept' }, 'POST')
check('driver accepted new job (assigned)', acc.status === 200, acc)

// --- 6. collect with the customer's pickup code ---
const col = await api(drv.token, '/api/bookings/actions', { bookingId: booking!.id, action: 'collect', code: booking!.pickup_code }, 'POST')
check('collected with pickup code', col.status === 200, col)

// --- 7. disposal verification (server simulates GPS inside the geofence) ---
const site = sites[0] as { id: string; name: string }
const ver = await api(drv.token, '/api/bookings/actions', {
  bookingId: booking!.id, action: 'verify', siteId: site.id, weightKg: 15, recyclablesKg: 4,
}, 'POST')
check(`disposal verified at ${site.name}`, ver.status === 200, ver)

// --- 8. driver earnings reflect the payout + recyclables bonus ---
const dash2 = await api(drv.token, '/api/driver')
const today = (dash2.data.today as Json) ?? {}
console.log(`driver today: ${JSON.stringify(today)}`)
const txns = ((dash2.data.transactions as Json[]) ?? []).slice(0, 4)
console.log(`driver latest txns: ${JSON.stringify(txns.map((t) => `${t.type}:${t.amount_ghs}`))}`)

// --- 9. admin sees KPIs ---
const adm = await auth('admin@kumbola.com', 'kumbola123')
const admData = await api(adm.token, '/api/admin')
const kpis = (admData.data.kpis as Json) ?? {}
check('admin KPIs present', Object.keys(kpis).length >= 4, Object.keys(kpis))
console.log(`admin KPIs: ${JSON.stringify(kpis).slice(0, 300)}`)

// --- 10. customer sees verified receipt ---
const bk2 = await api(cust.token, '/api/bookings')
const mine2 = ((bk2.data.bookings as Json[]) ?? []).find((b) => b.reference === booking?.reference)
check('customer booking now verified', mine2?.status === 'verified', mine2)

console.log(process.exitCode ? 'E2E: FAILED' : 'E2E: ALL PASS')
