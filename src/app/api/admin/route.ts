// GET /api/admin — city/ops dashboard (role: admin)
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'
import { RECYCLABLES_BONUS_PER_KG } from '@/lib/constants'
import type { AdminDashboardPayload, BookingStatus, Profile, DumpingReport, DisposalSite, Plan } from '@/lib/types'

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'admin') return fail('Admin access only', 403)
  const admin = supabaseAdmin()

  const url = new URL(req.url)
  const daysParam = Number(url.searchParams.get('days') ?? '14')
  const days = [7, 14, 30].includes(daysParam) ? daysParam : 14

  const today = dayKey(new Date())

  const [
    profilesRes,
    bookingsRes,
    verifsRes,
    commTxnRes,
    payoutTxnRes,
    reportsRes,
    sitesRes,
    notifCountRes,
    verifAllRes,
    auditRes,
    plansRes,
    settingsRes,
  ] = await Promise.all([
    admin.from('profiles').select('*'),
    admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(500),
    admin.from('disposal_verifications').select('*'),
    admin.from('transactions').select('amount_ghs, created_at').eq('type', 'commission'),
    admin.from('transactions').select('amount_ghs').in('type', ['payout', 'bonus']),
    admin.from('dumping_reports').select('*').order('created_at', { ascending: false }).limit(30),
    admin.from('disposal_sites').select('*'),
    admin.from('notifications').select('id', { count: 'exact', head: true }),
    admin.from('disposal_verifications').select('*').order('created_at', { ascending: false }).limit(20),
    admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(15),
    admin.from('plans').select('*').order('sort_order'),
    admin.from('app_settings').select('*').order('key'),
  ])

  const profiles = (profilesRes.data ?? []) as Profile[]
  const bookings = (bookingsRes.data ?? []) as Record<string, unknown>[]
  const verifs = verifsRes.data ?? []
  const customers = profiles.filter((p) => p.role === 'customer')
  const drivers = profiles.filter((p) => p.role === 'driver')
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled')

  const tonnesVerified = verifs.reduce((s, v) => s + Number(v.weight_kg ?? 0), 0) / 1000
  const recyclablesKg = verifs.reduce((s, v) => s + Number(v.recyclables_kg ?? 0), 0)
  const revenueCommission = (commTxnRes.data ?? []).reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0)
  const commissionTxns = (commTxnRes.data ?? []) as { amount_ghs: unknown; created_at: string }[]
  const driverPayouts = (payoutTxnRes.data ?? []).reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0)
  const recMargin = (recyclablesKg * RECYCLABLES_BONUS_PER_KG) / 3 // net platform margin after driver bonus & handling
  const dashboardFees = 1200 // seeded institutional dashboard fees (YTD)

  const statusOrder: BookingStatus[] = ['pending', 'assigned', 'collected', 'verified', 'cancelled']
  const byStatus = statusOrder.map((status) => ({ status, count: bookings.filter((b) => b.status === status).length }))

  // daily activity + growth + revenue, last N days
  const daily: { date: string; bookings: number; tonnes: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = dayKey(d)
    const dayBookings = activeBookings.filter((b) => dayKey(new Date(b.created_at as string)) === key)
    const dayVerifs = verifs.filter((v) => dayKey(new Date(v.created_at as string)) === key)
    daily.push({
      date: key,
      bookings: dayBookings.length,
      tonnes: Number((dayVerifs.reduce((s, v) => s + Number(v.weight_kg ?? 0), 0) / 1000).toFixed(2)),
    })
  }

  // by municipality
  const munis = [...new Set(bookings.map((b) => (b.municipality as string) ?? 'Other'))]
  const byMunicipality = munis
    .map((municipality) => {
      const mBookings = bookings.filter((b) => b.municipality === municipality)
      const mVerifs = verifs.filter((v) => mBookings.some((b) => b.id === v.booking_id))
      return {
        municipality,
        bookings: mBookings.length,
        tonnes: Number((mVerifs.reduce((s, v) => s + Number(v.weight_kg ?? 0), 0) / 1000).toFixed(2)),
      }
    })
    .sort((a, b) => b.tonnes - a.tonnes)

  const hydratedRecent = await hydrateBookings(bookings.slice(0, 15))

  // ---------- Command Centre queues ----------
  const vettingQueue = drivers
    .filter((d) => d.vetting_status !== 'approved')
    .sort((a, b) => (a.vetting_status === 'pending_review' ? -1 : 1) - (b.vetting_status === 'pending_review' ? -1 : 1))

  const driverName = (id: string | null) =>
    id ? profiles.find((p) => p.id === id)?.full_name ?? 'Unknown' : '—'
  const siteName = (id: string) => (sitesRes.data as { id: string; name: string }[] | null)?.find((s) => s.id === id)?.name ?? 'Unknown site'
  const bookingById = new Map(bookings.map((b) => [b.id as string, b as Record<string, unknown>]))
  const reviewQueue = (verifAllRes.data ?? []).map((v) => {
    const row = v as Record<string, unknown>
    const b = bookingById.get(row.booking_id as string)
    return {
      id: row.id as string,
      status: row.status as 'pending' | 'approved' | 'rejected',
      reference: (b?.reference as string) ?? '—',
      municipality: (b?.municipality as string) ?? '—',
      driverName: driverName(row.driver_id as string),
      siteName: siteName(row.site_id as string),
      weightKg: Number(row.weight_kg ?? 0),
      recyclablesKg: Number(row.recyclables_kg ?? 0),
      withinGeofence: Boolean(row.within_geofence),
      distanceM: row.distance_m === null || row.distance_m === undefined ? null : Number(row.distance_m),
      hasPhoto: Boolean(row.photo_url),
      hasTicket: Boolean(row.site_ticket),
      method: (row.method as string) ?? '',
      createdAt: row.created_at as string,
    }
  })

  const auditEvents = (auditRes.data ?? []).map((e) => {
    const row = e as Record<string, unknown>
    return {
      id: row.id as string,
      actorName: (row.actor_name as string) || 'system',
      action: row.action as string,
      targetType: (row.target_type as string) || '',
      targetId: (row.target_id as string) ?? null,
      details: (row.details as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as string,
    }
  })

  // ---------- growth & revenue analytics (last 14 days) ----------
  const delivered = bookings.filter((b) => b.status === 'collected' || b.status === 'verified')
  const growthSeries: { date: string; users: number }[] = []
  const revenueDaily: { date: string; ghs: number }[] = []
  let newUsers14d = 0
  let newUsersToday = 0
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 86400000))
    const dayUsers = profiles.filter((p) => dayKey(new Date(p.created_at as string)) === key)
    const dayRevenue = commissionTxns.filter((t) => dayKey(new Date(t.created_at)) === key)
    growthSeries.push({ date: key, users: dayUsers.length })
    revenueDaily.push({ date: key, ghs: Number(dayRevenue.reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0).toFixed(2)) })
    newUsers14d += dayUsers.length
    if (key === today) newUsersToday = dayUsers.length
  }
  if (days === 7) newUsers14d = growthSeries.reduce((s, g) => s + g.users, 0)
  const cutoff30d = Date.now() - 30 * 86400000
  const activeCustomers30d = new Set(
    activeBookings
      .filter((b) => new Date(b.created_at as string).getTime() >= cutoff30d)
      .map((b) => b.customer_id as string)
  ).size

  // ---------- driver integrity analytics (off-platform bypass signals) ----------
  // Repeat driver-customer pairs = the classic bypass signature: the driver
  // serves the same household repeatedly and may then move the relationship
  // offline. Cancels after assignment and unverified completions corroborate.
  const pairCounts = new Map<string, number>()
  for (const b of delivered) {
    const key = `${b.driver_id as string}|${b.customer_id as string}`
    if (!b.driver_id) continue
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  }
  const repeatBookings = [...pairCounts.values()].reduce((s, n) => s + (n >= 2 ? n : 0), 0)
  const repeatRatePct = delivered.length ? Math.round((repeatBookings / delivered.length) * 100) : 0

  const integrity = drivers
    .map((d) => {
      const mine = bookings.filter((b) => b.driver_id === d.id)
      const mineDelivered = mine.filter((b) => b.status === 'collected' || b.status === 'verified')
      const verified = mine.filter((b) => b.status === 'verified').length
      const cancelAfterAssign = mine.filter((b) => b.status === 'cancelled' && b.driver_id).length
      const perCustomer = new Map<string, number>()
      for (const b of mineDelivered) {
        perCustomer.set(b.customer_id as string, (perCustomer.get(b.customer_id as string) ?? 0) + 1)
      }
      const repeatCustomers = [...perCustomer.values()].filter((n) => n >= 2).length
      const verificationPct = mineDelivered.length ? Math.round((verified / mineDelivered.length) * 100) : null

      let score = 100
      const flags: string[] = []
      if (repeatCustomers > 0) {
        score -= repeatCustomers * 15
        flags.push(`${repeatCustomers} repeat customer${repeatCustomers > 1 ? 's' : ''}`)
      }
      if (cancelAfterAssign > 1) {
        score -= (cancelAfterAssign - 1) * 8
        flags.push(`${cancelAfterAssign} cancels after assignment`)
      }
      if (verificationPct !== null && mineDelivered.length >= 3 && verificationPct < 50) {
        score -= 15
        flags.push(`low disposal verification (${verificationPct}%)`)
      }
      return {
        driverId: d.id,
        fullName: d.full_name,
        completed: mineDelivered.length,
        verificationPct,
        cancelAfterAssign,
        repeatCustomers,
        score: Math.max(0, score),
        flags,
      }
    })
    .filter((r) => r.completed > 0 || r.cancelAfterAssign > 0)
    .sort((a, b) => a.score - b.score || b.repeatCustomers - a.repeatCustomers)

  const payload: AdminDashboardPayload = {
    kpis: {
      households: customers.filter((c) => c.account_type === 'household').length,
      businesses: customers.filter((c) => c.account_type === 'business' || c.account_type === 'institution').length,
      drivers: drivers.length,
      onlineDrivers: drivers.filter((d) => d.is_online).length,
      bookingsToday: bookings.filter((b) => dayKey(new Date(b.created_at as string)) === today).length,
      tonnesVerified: Number(tonnesVerified.toFixed(2)),
      recyclablesKg: Math.round(recyclablesKg),
      verificationRate: activeBookings.length
        ? Math.round((bookings.filter((b) => b.status === 'verified').length / activeBookings.length) * 100)
        : 0,
      revenueCommission: Number(revenueCommission.toFixed(2)),
      driverPayouts: Number(driverPayouts.toFixed(2)),
      pendingJobs: bookings.filter((b) => b.status === 'pending').length,
      openReports: (reportsRes.data ?? []).filter((r) => r.status !== 'resolved').length,
      walletFloat: Number(customers.reduce((s, c) => s + Number(c.wallet_balance ?? 0), 0).toFixed(2)),
    },
    daily,
    byMunicipality,
    byStatus,
    revenueMix: [
      { label: 'Commission', value: Number(revenueCommission.toFixed(2)) },
      { label: 'Recyclables margin', value: Number(recMargin.toFixed(2)) },
      { label: 'Dashboard fees', value: dashboardFees },
    ],
    growth: { newUsers14d, newUsersToday, activeCustomers30d, repeatRatePct },
    growthSeries,
    revenueDaily,
    integrity,
    vettingQueue,
    reviewQueue,
    auditEvents,
    drivers,
    customers,
    plans: (plansRes.data ?? []) as Plan[],
    settings: (settingsRes.data ?? []).map((s) => {
      const row = s as Record<string, unknown>
      return {
        key: row.key as string,
        value: row.value as string,
        updatedByName: (row.updated_by_name as string) || 'system',
        updatedAt: row.updated_at as string,
      }
    }),
    integrations: {
      supabase: true, // this query succeeded — the database is reachable
      paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
      sms: false, // Arkesel integration pending (blueprint Phase 2)
    },
    recentBookings: hydratedRecent,
    reports: (reportsRes.data ?? []) as DumpingReport[],
    sites: (sitesRes.data ?? []) as DisposalSite[],
  }
  return json(payload)
}
