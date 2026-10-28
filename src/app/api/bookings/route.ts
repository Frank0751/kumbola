// /api/bookings
// GET  — role-scoped listing (customer: own bookings; driver: available/active/history)
// POST — create a booking (customer)
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'
import { ONE_OFF_PRICES, WASTE_SIZES, PLAN_PICKUP_TARIFF, DRIVER_COMMISSION } from '@/lib/constants'
import type { Booking, WasteSize } from '@/lib/types'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const admin = supabaseAdmin()

  if (auth.profile.role === 'driver') {
    const [availRes, mineRes] = await Promise.all([
      admin.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(25),
      admin.from('bookings').select('*').eq('driver_id', auth.userId).in('status', ['assigned', 'collected']).order('created_at', { ascending: false }),
      // history fetched below
    ])
    const histRes = await admin
      .from('bookings')
      .select('*')
      .eq('driver_id', auth.userId)
      .in('status', ['verified', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(40)

    const [available, active, history] = await Promise.all([
      hydrateBookings((availRes.data ?? []) as Record<string, unknown>[]),
      hydrateBookings((mineRes.data ?? []) as Record<string, unknown>[]),
      hydrateBookings((histRes.data ?? []) as Record<string, unknown>[]),
    ])
    return json({ available, active, history })
  }

  // customer (and admin previewing): own bookings
  const { data } = await admin
    .from('bookings')
    .select('*')
    .eq('customer_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(100)
  const bookings = await hydrateBookings((data ?? []) as Record<string, unknown>[])
  return json({ bookings })
}

function pickupCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'customer') return fail('Only customer accounts can book pickups', 403)

  const body = (await req.json().catch(() => null)) as
    | { wasteSize?: WasteSize; preferredTime?: string; notes?: string; usePlan?: boolean; address?: string; municipality?: string }
    | null
  if (!body) return fail('Invalid request body')

  const size = body.wasteSize
  if (!size || !ONE_OFF_PRICES[size]) return fail('Choose a valid waste size')
  const sizeDef = WASTE_SIZES.find((s) => s.id === size)!
  const municipality = (body.municipality ?? auth.profile.municipality ?? 'Suame').trim()
  const address = (body.address ?? auth.profile.address ?? '').trim()
  if (!address) return fail('A pickup address is required')

  const admin = supabaseAdmin()
  const usePlan = !!body.usePlan && !!auth.profile.plan_id && auth.profile.plan_credits > 0

  let amount = 0
  let payout = 0
  let commission = 0
  if (usePlan) {
    payout = Number((PLAN_PICKUP_TARIFF * (1 - DRIVER_COMMISSION)).toFixed(2))
    commission = Number((PLAN_PICKUP_TARIFF * DRIVER_COMMISSION).toFixed(2))
  } else {
    amount = ONE_OFF_PRICES[size]
    payout = Number((amount * (1 - DRIVER_COMMISSION)).toFixed(2))
    commission = Number((amount * DRIVER_COMMISSION).toFixed(2))
    if (auth.profile.wallet_balance < amount) {
      return fail(`Insufficient wallet balance — top up GHS ${amount} to book this pickup.`, 402)
    }
  }

  // atomic-ish: deduct wallet first (guarding balance), then insert booking
  if (amount > 0) {
    const { data: updated, error: dedErr } = await admin
      .from('profiles')
      .update({ wallet_balance: auth.profile.wallet_balance - amount })
      .eq('id', auth.userId)
      .gte('wallet_balance', amount)
      .select('wallet_balance')
      .single()
    if (dedErr || !updated) return fail('Insufficient wallet balance — top up first.', 402)
  }

  const { data: booking, error: bkErr } = await admin
    .from('bookings')
    .insert({
      reference: `KB-${Date.now().toString(36).toUpperCase()}`,
      customer_id: auth.userId,
      booking_type: usePlan ? 'plan' : 'one_off',
      plan_id: usePlan ? auth.profile.plan_id : null,
      waste_size: size,
      waste_kind: auth.profile.account_type === 'household' ? 'general' : auth.profile.account_type === 'business' ? 'business' : 'institutional',
      estimated_kg: sizeDef.estKg,
      municipality,
      address,
      pickup_code: pickupCode(),
      preferred_time: ['now', 'today', 'tomorrow'].includes(body.preferredTime ?? '') ? body.preferredTime : 'now',
      notes: body.notes?.slice(0, 300) ?? null,
      amount_ghs: amount,
      driver_payout_ghs: payout,
      commission_ghs: commission,
      used_credit: usePlan,
      status: 'pending',
    })
    .select('*')
    .single()
  if (bkErr || !booking) {
    // rollback wallet deduction
    if (amount > 0) await admin.from('profiles').update({ wallet_balance: auth.profile.wallet_balance }).eq('id', auth.userId)
    return fail(bkErr?.message ?? 'Could not create booking', 500)
  }

  if (amount > 0) {
    await admin.from('transactions').insert({
      user_id: auth.userId,
      booking_id: booking.id,
      type: 'payment',
      amount_ghs: amount,
      method: 'momo',
      network: 'MTN MoMo',
      reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
    })
  }
  if (usePlan) {
    await admin.from('profiles').update({ plan_credits: auth.profile.plan_credits - 1 }).eq('id', auth.userId)
  }
  await admin.from('notifications').insert({
    user_id: auth.userId,
    title: 'Pickup requested',
    body: `Booking ${booking.reference} is queued for dispatch. Your pickup code is ${booking.pickup_code} — show it to the operator when they arrive.`,
    kind: 'info',
  })

  const [hydrated] = await hydrateBookings([booking as unknown as Record<string, unknown>])
  return json({ booking: hydrated satisfies Booking }, 201)
}
