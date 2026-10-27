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
    admin.from('transactions').select('amount_ghs').eq('type', 'commission'),
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
    drivers,
    recentBookings: hydratedRecent,
    reports: (reportsRes.data ?? []) as DumpingReport[],
    sites: (sitesRes.data ?? []) as DisposalSite[],
  }
  return json(payload)
}
