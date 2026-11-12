// GET /api/admin — city/ops dashboard (role: admin)
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'
import { RECYCLABLES_BONUS_PER_KG } from '@/lib/constants'
import type { AdminDashboardPayload, BookingStatus, Profile, DumpingReport, DisposalSite } from '@/lib/types'

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'admin') return fail('Admin access only', 403)
  const admin = supabaseAdmin()

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
  ] = await Promise.all([
    admin.from('profiles').select('*'),
    admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(500),
    admin.from('disposal_verifications').select('*'),
    admin.from('transactions').select('amount_ghs, created_at').eq('type', 'commission'),
    admin.from('transactions').select('amount_ghs').in('type', ['payout', 'bonus']),
    admin.from('dumping_reports').select('*').order('created_at', { ascending: false }).limit(30),
    admin.from('disposal_sites').select('*').eq('is_active', true),
    admin.from('notifications').select('id', { count: 'exact', head: true }),
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

  // daily activity, last 14 days
  const daily: { date: string; bookings: number; tonnes: number }[] = []
  for (let i = 13; i >= 0; i--) {
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

  // ---------- growth & revenue analytics (last 14 days) ----------
  const delivered = bookings.filter((b) => b.status === 'collected' || b.status === 'verified')
  const growthSeries: { date: string; users: number }[] = []
  const revenueDaily: { date: string; ghs: number }[] = []
  let newUsers14d = 0
  let newUsersToday = 0
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 86400000))
    const dayUsers = profiles.filter((p) => dayKey(new Date(p.created_at as string)) === key)
    const dayRevenue = commissionTxns.filter((t) => dayKey(new Date(t.created_at)) === key)
    growthSeries.push({ date: key, users: dayUsers.length })
    revenueDaily.push({ date: key, ghs: Number(dayRevenue.reduce((s, t) => s + Number(t.amount_ghs ?? 0), 0).toFixed(2)) })
    newUsers14d += dayUsers.length
    if (key === today) newUsersToday = dayUsers.length
  }
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
    drivers,
    recentBookings: hydratedRecent,
    reports: (reportsRes.data ?? []) as DumpingReport[],
    sites: (sitesRes.data ?? []) as DisposalSite[],
  }
  return json(payload)
}
