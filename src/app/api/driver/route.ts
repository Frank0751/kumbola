// /api/driver
// GET  — driver dashboard: available jobs, active job, history, payouts, leaderboard
// POST — { online: boolean } toggle
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'
import type { DriverDashboardPayload, Transaction, Booking } from '@/lib/types'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'driver') return fail('Driver access only', 403)
  const admin = supabaseAdmin()

  const [availRes, activeRes, histRes, txnRes, boardRes, onlineRes] = await Promise.all([
    admin.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(20),
    admin
      .from('bookings')
      .select('*')
      .eq('driver_id', auth.userId)
      .in('status', ['assigned', 'collected'])
      .order('created_at', { ascending: false })
      .limit(3),
    admin
      .from('bookings')
      .select('*')
      .eq('driver_id', auth.userId)
      .in('status', ['verified', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('transactions')
      .select('*')
      .eq('user_id', auth.userId)
      .in('type', ['payout', 'bonus'])
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('profiles')
      .select('id, full_name, rating, total_jobs, total_earnings, vehicle_plate')
      .eq('role', 'driver')
      .order('total_earnings', { ascending: false })
      .limit(5),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver').eq('is_online', true),
  ])

  const [available, activeAll, history] = await Promise.all([
    hydrateBookings((availRes.data ?? []) as Record<string, unknown>[]),
    hydrateBookings((activeRes.data ?? []) as Record<string, unknown>[]),
    hydrateBookings((histRes.data ?? []) as Record<string, unknown>[]),
  ])

  const payload: DriverDashboardPayload = {
    available,
    active: (activeAll[0] as Booking | undefined) ?? null,
    history,
    transactions: (txnRes.data ?? []) as Transaction[],
    onlineDrivers: onlineRes.count ?? 0,
    leaderboard: boardRes.data ?? [],
  }
  return json(payload)
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'driver') return fail('Driver access only', 403)
  const body = (await req.json().catch(() => null)) as { online?: boolean } | null
  if (typeof body?.online !== 'boolean') return fail('online boolean required')

  const { error } = await supabaseAdmin()
    .from('profiles')
    .update({ is_online: body.online })
    .eq('id', auth.userId)
  if (error) return fail(error.message, 500)
  return json({ is_online: body.online })
}
