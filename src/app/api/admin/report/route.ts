// GET /api/admin/report — controlled CSV exports (role: admin)
// Spec 16 "Controlled exports": exports of personal data need a stated reason,
// are logged to the audit trail, and carry generator metadata in the file.
//
//   ?type=bookings|transactions|impact|users|audit
//   &days=7|14|30|90        (window for bookings/transactions/impact)
//   &reason=<min 4 chars>   (required — recorded in audit_events)
//
// Response: text/csv attachment (Excel-ready, UTF-8 BOM).
import { verifyUser, fail, supabaseAdmin } from '@/lib/supabase-server'
import { recordAudit } from '@/lib/admin-actions'

const TYPES = ['bookings', 'transactions', 'impact', 'users', 'audit'] as const
type ReportType = (typeof TYPES)[number]

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',')
}

function stamp(title: string, rows: number, reason: string): string[][] {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  return [
    ['KumBola Command Centre report'],
    [title],
    ['Generated', now],
    ['Requested by', 'operations staff'],
    ['Reason', reason],
    ['Rows', String(rows)],
    [],
  ]
}

function toCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map((r) => csvRow(r)).join('\r\n') + '\r\n'
}

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'admin') return fail('Admin access only', 403)
  const admin = supabaseAdmin()

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  if (!TYPES.includes(type as ReportType)) return fail(`type must be one of: ${TYPES.join(', ')}`)
  const reason = (url.searchParams.get('reason') ?? '').trim()
  if (reason.length < 4) return fail('A stated reason (min 4 characters) is required for every export (spec 16)')
  const daysParam = Number(url.searchParams.get('days') ?? '30')
  const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30
  const cutoff = Date.now() - days * 86400000
  const since = new Date(cutoff).toISOString()

  let csv = ''
  let rowCount = 0

  if (type === 'bookings') {
    const [bookingsRes, profilesRes] = await Promise.all([
      admin.from('bookings').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
      admin.from('profiles').select('id, full_name, phone'),
    ])
    const nameOf = new Map(((profilesRes.data ?? []) as { id: string; full_name: string; phone: string | null }[]).map((p) => [p.id, p]))
    const list = (bookingsRes.data ?? []) as Record<string, unknown>[]
    rowCount = list.length
    const rows: unknown[][] = stamp(`Bookings — last ${days} days`, rowCount, reason)
    rows.push(['Reference', 'Created', 'Status', 'Municipality', 'Customer', 'Customer phone', 'Operator', 'Waste size', 'Waste kind', 'Est. kg', 'Amount GHS', 'Operator payout GHS', 'Commission GHS', 'Assigned at', 'Collected at', 'Verified at', 'Cancelled at'])
    for (const b of list) {
      const c = nameOf.get(b.customer_id as string)
      const d = nameOf.get(b.driver_id as string)
      rows.push([
        b.reference, b.created_at, b.status, b.municipality,
        c?.full_name ?? '—', c?.phone ?? '',
        d?.full_name ?? (b.driver_id ? 'unknown' : 'unassigned'),
        b.waste_size, b.waste_kind, b.estimated_kg,
        b.amount_ghs, b.driver_payout_ghs, b.commission_ghs,
        b.assigned_at ?? '', b.collected_at ?? '', b.verified_at ?? '', b.cancelled_at ?? '',
      ])
    }
    csv = toCsv(rows)
  } else if (type === 'transactions') {
    const [txnsRes, profilesRes] = await Promise.all([
      admin.from('transactions').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(3000),
      admin.from('profiles').select('id, full_name, role'),
    ])
    const nameOf = new Map(((profilesRes.data ?? []) as { id: string; full_name: string; role: string }[]).map((p) => [p.id, p]))
    const list = (txnsRes.data ?? []) as Record<string, unknown>[]
    rowCount = list.length
    const rows: unknown[][] = stamp(`Wallet ledger — last ${days} days`, rowCount, reason)
    rows.push(['Date', 'Account', 'Role', 'Type', 'Amount GHS', 'Method', 'Network', 'Reference', 'Note'])
    for (const t of list) {
      const p = nameOf.get(t.user_id as string)
      rows.push([t.created_at, p?.full_name ?? '—', p?.role ?? '', t.type, t.amount_ghs, t.method, t.network ?? '', t.reference ?? '', t.note ?? ''])
    }
    csv = toCsv(rows)
  } else if (type === 'impact') {
    // Funder-ready aggregates (spec 16: impact dashboard → report)
    const [bookingsRes, verifsRes, txnsRes, profilesRes, reportsRes] = await Promise.all([
      admin.from('bookings').select('*').gte('created_at', since),
      admin.from('disposal_verifications').select('*').gte('created_at', since),
      admin.from('transactions').select('type, amount_ghs').gte('created_at', since),
      admin.from('profiles').select('role, created_at'),
      admin.from('dumping_reports').select('*').gte('created_at', since),
    ])
    const bookings = (bookingsRes.data ?? []) as Record<string, unknown>[]
    const verifs = (verifsRes.data ?? []) as Record<string, unknown>[]
    const txns = (txnsRes.data ?? []) as Record<string, unknown>[]
    const profiles = (profilesRes.data ?? []) as Record<string, unknown>[]
    const reports = (reportsRes.data ?? []) as Record<string, unknown>[]
    const activeBookings = bookings.filter((b) => b.status !== 'cancelled')
    const delivered = bookings.filter((b) => b.status === 'collected' || b.status === 'verified')
    const verified = bookings.filter((b) => b.status === 'verified')
    const tonnes = verifs.reduce((s, v) => s + Number(v.weight_kg ?? 0), 0) / 1000
    const recyclablesKg = verifs.reduce((s, v) => s + Number(v.recyclables_kg ?? 0), 0)
    const commission = txns.filter((t) => t.type === 'commission').reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0)
    const payouts = txns.filter((t) => t.type === 'payout' || t.type === 'bonus').reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0)
    const munis = [...new Set(bookings.map((b) => (b.municipality as string) ?? 'Other'))]

    rowCount = 12 + munis.length
    const rows: unknown[][] = stamp(`Impact & operations summary — last ${days} days`, rowCount, reason)
    rows.push(['Metric', 'Value'])
    rows.push(['Bookings placed', activeBookings.length])
    rows.push(['Jobs delivered (collected + verified)', delivered.length])
    rows.push(['Jobs fully verified at site', verified.length])
    rows.push(['Verification rate %', activeBookings.length ? Math.round((verified.length / activeBookings.length) * 100) : 0])
    rows.push(['Tonnes collected (verified)', tonnes.toFixed(2)])
    rows.push(['Recyclables recovered kg', Math.round(recyclablesKg)])
    rows.push(['Operator earnings GHS', payouts.toFixed(2)])
    rows.push(['Platform commission GHS', commission.toFixed(2)])
    rows.push(['Illegal dumping reports', reports.length])
    rows.push(['New accounts joined', profiles.filter((p) => new Date(p.created_at as string).getTime() >= cutoff).length])
    rows.push([])
    rows.push(['Municipality', 'Jobs', 'Tonnes'])
    for (const m of munis) {
      const mb = bookings.filter((b) => b.municipality === m)
      const mIds = new Set(mb.map((b) => b.id as string))
      const mt = verifs.filter((v) => mIds.has(v.booking_id as string)).reduce((s, v) => s + Number(v.weight_kg ?? 0), 0) / 1000
      rows.push([m, mb.length, mt.toFixed(2)])
    }
    csv = toCsv(rows)
  } else if (type === 'users') {
    const [profilesRes, plansRes] = await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
      admin.from('plans').select('id, name'),
    ])
    const planName = new Map(((plansRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]))
    const list = (profilesRes.data ?? []) as Record<string, unknown>[]
    rowCount = list.length
    const rows: unknown[][] = stamp('Accounts register', rowCount, reason)
    rows.push(['Joined', 'Role', 'Full name', 'Email', 'Phone', 'Account type', 'Municipality', 'Plan', 'Wallet GHS', 'Account status', 'Block reason', 'Vetting', 'Total jobs', 'Rating'])
    for (const p of list) {
      rows.push([
        p.created_at, p.role, p.full_name, p.email ?? '', p.phone ?? '',
        p.account_type ?? '', p.municipality ?? '',
        p.plan_id ? planName.get(p.plan_id as string) ?? p.plan_id : '',
        p.wallet_balance ?? 0,
        (p.account_status as string) ?? 'active', p.block_reason ?? '',
        p.role === 'driver' ? (p.vetting_status as string) ?? '' : '',
        p.total_jobs ?? 0, p.rating ?? '',
      ])
    }
    csv = toCsv(rows)
  } else {
    // audit — full trail dump (spec 21: searchable, 2+ year retention)
    const auditRes = await admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(5000)
    const list = (auditRes.data ?? []) as Record<string, unknown>[]
    rowCount = list.length
    const rows: unknown[][] = stamp('Audit trail', rowCount, reason)
    rows.push(['When', 'Staff', 'Action', 'Target type', 'Target id', 'Details'])
    for (const e of list) {
      rows.push([e.created_at, e.actor_name, e.action, e.target_type, e.target_id ?? '', e.details ? JSON.stringify(e.details) : ''])
    }
    csv = toCsv(rows)
  }

  await recordAudit(admin, {
    actorId: auth.userId,
    actorName: auth.profile.full_name,
    action: 'report.export',
    targetType: 'report',
    targetId: type,
    details: { type, days, reason, rows: rowCount },
  })

  const filename = `kumbola_${type}_${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
