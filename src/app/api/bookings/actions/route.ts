// POST /api/bookings/actions
// { bookingId, action: 'accept' | 'collect' | 'verify' | 'cancel', code?, siteId?, weightKg?, recyclablesKg? }
import { verifyUser, json, fail, supabaseAdmin, simulatedSitePosition, haversineM } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'
import { RECYCLABLES_BONUS_PER_KG } from '@/lib/constants'
import type { Booking, DisposalSite } from '@/lib/types'

interface ActionBody {
  bookingId?: string
  action?: 'accept' | 'collect' | 'verify' | 'cancel'
  code?: string
  siteId?: string
  weightKg?: number
  recyclablesKg?: number
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const body = (await req.json().catch(() => null)) as ActionBody | null
  if (!body?.bookingId || !body.action) return fail('bookingId and action are required')

  const admin = supabaseAdmin()
  const { data: bkRow } = await admin.from('bookings').select('*').eq('id', body.bookingId).single()
  if (!bkRow) return fail('Booking not found', 404)

  // ---------------- DRIVER: accept ----------------
  if (body.action === 'accept') {
    if (auth.profile.role !== 'driver') return fail('Only operators can accept jobs', 403)
    if (bkRow.status !== 'pending') return fail('This job was just taken by another operator', 409)
    if (!auth.profile.is_online) return fail('Go online to accept jobs', 409)
    const activeRes = await admin
      .from('bookings')
      .select('id')
      .eq('driver_id', auth.userId)
      .in('status', ['assigned', 'collected'])
      .limit(1)
    if ((activeRes.data ?? []).length > 0) return fail('Finish your active job before accepting another', 409)

    const { error } = await admin
      .from('bookings')
      .update({ driver_id: auth.userId, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', body.bookingId)
      .eq('status', 'pending')
    if (error) return fail(error.message, 500)

    await admin.from('notifications').insert({
      user_id: bkRow.customer_id,
      title: 'Operator assigned 🛺',
      body: `${auth.profile.full_name} (${auth.profile.vehicle_plate ?? 'Aboboyaa'}) is on the way for ${bkRow.reference}. Show pickup code ${bkRow.pickup_code} on arrival.`,
      kind: 'info',
    })
    const [hydrated] = await hydrateBookings([{ ...bkRow, driver_id: auth.userId, status: 'assigned' } as unknown as Record<string, unknown>])
    return json({ booking: hydrated })
  }

  // ---------------- DRIVER: confirm pickup with code ----------------
  if (body.action === 'collect') {
    if (auth.profile.role !== 'driver') return fail('Only operators can confirm collection', 403)
    if (bkRow.driver_id !== auth.userId) return fail('This job is not assigned to you', 403)
    if (bkRow.status !== 'assigned') return fail('This job is not awaiting collection', 409)
    if (!body.code || String(body.code).trim() !== String(bkRow.pickup_code)) return fail('Wrong pickup code — ask the customer to show the 4-digit code', 422)

    const { error } = await admin
      .from('bookings')
      .update({ status: 'collected', collected_at: new Date().toISOString() })
      .eq('id', body.bookingId)
    if (error) return fail(error.message, 500)

    await admin.from('notifications').insert({
      user_id: bkRow.customer_id,
      title: 'Waste collected ✅',
      body: `Your load for ${bkRow.reference} is on its way to an approved site. You will get a disposal confirmation shortly.`,
      kind: 'info',
    })
    const [hydrated] = await hydrateBookings([{ ...bkRow, status: 'collected' } as unknown as Record<string, unknown>])
    return json({ booking: hydrated })
  }

  // ---------------- DRIVER: verify disposal (proof of disposal) ----------------
  if (body.action === 'verify') {
    if (auth.profile.role !== 'driver') return fail('Only operators can submit disposal proof', 403)
    if (bkRow.driver_id !== auth.userId) return fail('This job is not assigned to you', 403)
    if (bkRow.status !== 'collected') return fail('Confirm pickup before disposal verification', 409)

    const { data: site } = await admin.from('disposal_sites').select('*').eq('id', body.siteId ?? '').single()
    if (!site) return fail('Choose a valid disposal site', 422)
    const weightKg = Math.max(1, Math.min(5000, Number(body.weightKg ?? bkRow.estimated_kg)))
    const recyclablesKg = Math.max(0, Math.min(weightKg, Number(body.recyclablesKg ?? 0)))

    // demo-mode GPS: simulate arrival near the site, then verify the geofence
    const pos = simulatedSitePosition(site as unknown as DisposalSite, site.geofence_radius_m)
    const distance = haversineM(pos.lat, pos.lng, Number(site.lat), Number(site.lng))
    const within = distance <= (site.geofence_radius_m ?? 200)
    if (!within) return fail('You are outside the site geofence — drive closer and retry.', 422)

    const ticket = `TKT-${Math.floor(100000 + Math.random() * 900000)}`
    const bonus = Number((recyclablesKg * RECYCLABLES_BONUS_PER_KG).toFixed(2))
    const payout = Number(bkRow.driver_payout_ghs) + bonus

    const { data: verif, error: vErr } = await admin
      .from('disposal_verifications')
      .insert({
        booking_id: body.bookingId,
        driver_id: auth.userId,
        site_id: site.id,
        weight_kg: weightKg,
        recyclables_kg: recyclablesKg,
        lat: pos.lat,
        lng: pos.lng,
        distance_m: Number(distance.toFixed(1)),
        within_geofence: within,
        photo_url: `/images/verify/${site.id}.jpg`,
        site_ticket: ticket,
        status: 'approved',
      })
      .select('*')
      .single()
    if (vErr) return fail(vErr.message, 500)

    const { error: bErr } = await admin
      .from('bookings')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', body.bookingId)
    if (bErr) return fail(bErr.message, 500)

    type TxnRow = {
      user_id: string
      booking_id: string
      type: 'payout' | 'commission' | 'bonus'
      amount_ghs: number
      method: string
      network?: string
      reference: string
      note?: string
    }
    const txns: TxnRow[] = [
      {
        user_id: auth.userId,
        booking_id: body.bookingId,
        type: 'payout' as const,
        amount_ghs: Number(bkRow.driver_payout_ghs),
        method: 'momo',
        network: 'MTN MoMo',
        reference: `OUT-${Date.now().toString(36).toUpperCase()}`,
        note: `Payout for ${bkRow.reference}`,
      },
      {
        user_id: auth.userId,
        booking_id: body.bookingId,
        type: 'commission' as const,
        amount_ghs: Number(bkRow.commission_ghs),
        method: 'platform',
        reference: `COM-${Date.now().toString(36).toUpperCase()}`,
        note: `Platform commission for ${bkRow.reference}`,
      },
    ]
    if (bonus > 0) {
      txns.push({
        user_id: auth.userId,
        booking_id: body.bookingId,
        type: 'bonus' as const,
        amount_ghs: bonus,
        method: 'platform',
        reference: `BON-${Date.now().toString(36).toUpperCase()}`,
        note: `${recyclablesKg} kg recyclables × GHS ${RECYCLABLES_BONUS_PER_KG.toFixed(2)}`,
      })
    }
    await admin.from('transactions').insert(txns)
    await admin
      .from('profiles')
      .update({
        total_jobs: auth.profile.total_jobs + 1,
        total_earnings: Number((auth.profile.total_earnings + payout).toFixed(2)),
      })
      .eq('id', auth.userId)

    await admin.from('notifications').insert([
      {
        user_id: bkRow.customer_id,
        title: 'Disposal verified 🌍',
        body: `${Number(weightKg).toFixed(0)} kg from ${bkRow.reference} was verified at ${site.name}. Ticket ${ticket}. Thank you for keeping Kumasi clean!`,
        kind: 'success',
      },
      {
        user_id: auth.userId,
        title: 'Payout sent 💸',
        body: `GHS ${payout.toFixed(2)} (${bonus > 0 ? `incl. GHS ${bonus.toFixed(2)} recyclables bonus` : 'fare + 85% share'}) is on its way to your mobile money.`,
        kind: 'success',
      },
    ])

    const [hydrated] = await hydrateBookings([{ ...bkRow, status: 'verified' } as unknown as Record<string, unknown>])
    return json({ booking: hydrated, verification: { ...verif, site } })
  }

  // ---------------- CUSTOMER: cancel ----------------
  if (body.action === 'cancel') {
    if (auth.profile.role !== 'customer') return fail('Only the customer can cancel a booking', 403)
    if (bkRow.customer_id !== auth.userId) return fail('This is not your booking', 403)
    if (!['pending', 'assigned'].includes(bkRow.status)) return fail('This booking can no longer be cancelled', 409)

    const { error } = await admin
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', body.bookingId)
    if (error) return fail(error.message, 500)

    if (bkRow.used_credit) {
      await admin.from('profiles').update({ plan_credits: auth.profile.plan_credits + 1 }).eq('id', auth.userId)
    } else if (Number(bkRow.amount_ghs) > 0) {
      await admin
        .from('profiles')
        .update({ wallet_balance: Number((auth.profile.wallet_balance + Number(bkRow.amount_ghs)).toFixed(2)) })
        .eq('id', auth.userId)
      await admin.from('transactions').insert({
        user_id: auth.userId,
        booking_id: body.bookingId,
        type: 'topup',
        amount_ghs: Number(bkRow.amount_ghs),
        method: 'refund',
        reference: `REF-${Date.now().toString(36).toUpperCase()}`,
        note: `Refund for cancelled booking ${bkRow.reference}`,
      })
    }
    if (bkRow.driver_id) {
      await admin.from('notifications').insert({
        user_id: bkRow.driver_id,
        title: 'Job cancelled',
        body: `${bkRow.reference} was cancelled by the customer. The wallet has been refunded.`,
        kind: 'warning',
      })
    }
    const [hydrated] = await hydrateBookings([{ ...bkRow, status: 'cancelled' } as unknown as Record<string, unknown>])
    return json({ booking: hydrated })
  }

  return fail('Unknown action')
}
