// POST /api/roles — switch the signed-in account between customer and
// operator (driver) modes. One account, both worlds: a client can become a
// driver and vice versa. All historical data (bookings, jobs, wallet,
// transactions) is keyed by user id, so nothing is lost on a switch.
//
// Rules:
//   - body.role must be 'customer' | 'driver'
//   - admins keep the city dashboard (no switching away from admin)
//   - switching to driver requires a vehicle plate — either supplied in the
//     body or already stored on the profile from a previous operator stint
//   - switching to customer keeps ALL operator fields (instant switch back)
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import type { Profile } from '@/lib/types'

interface RolesBody {
  role: 'customer' | 'driver'
  vehiclePlate?: string
  vehicleType?: string
  baseMunicipality?: string
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const admin = supabaseAdmin()
  const profile = auth.profile as Profile

  if (profile.role === 'admin') {
    return fail('Admins keep the city dashboard — switching is for customer and operator accounts.', 403)
  }

  let body: RolesBody
  try {
    body = (await req.json()) as RolesBody
  } catch {
    return fail('Invalid request body')
  }

  const target = body.role
  if (target !== 'customer' && target !== 'driver') {
    return fail('Role must be "customer" or "driver"')
  }
  if (target === profile.role) {
    return fail(target === 'driver' ? 'You are already in operator mode.' : 'You are already in customer mode.', 400)
  }

  if (target === 'driver') {
    const plate = body.vehiclePlate?.trim() || profile.vehicle_plate
    if (!plate) return fail('Vehicle plate is required for operators')

    const { data: updated, error } = await admin
      .from('profiles')
      .update({
        role: 'driver',
        vehicle_plate: plate,
        vehicle_type: body.vehicleType?.trim() || profile.vehicle_type || 'Aboboyaa 200cc',
        base_municipality: body.baseMunicipality?.trim() || profile.base_municipality || profile.municipality,
        is_online: false,
      })
      .eq('id', auth.userId)
      .select('*')
      .single()
    if (error || !updated) return fail(error?.message ?? 'Could not switch to operator mode', 500)

    await admin.from('notifications').insert({
      user_id: auth.userId,
      title: 'Operator mode unlocked 🛺',
      body: 'Your account can now accept pickups. Go online from the operator app to start earning — your customer bookings and wallet are safe and waiting.',
      kind: 'success',
    })
    return json({ profile: updated })
  }

  // target === 'customer' — operator fields are intentionally preserved so
  // switching back is one tap (plate, type, base, verifications, history).
  const { data: updated, error } = await admin
    .from('profiles')
    .update({ role: 'customer', is_online: false })
    .eq('id', auth.userId)
    .select('*')
    .single()
  if (error || !updated) return fail(error?.message ?? 'Could not switch to customer mode', 500)

  await admin.from('notifications').insert({
    user_id: auth.userId,
    title: 'Customer mode on 🏠',
    body: 'Welcome back to booking mode. Your operator history and earnings are saved — switch back anytime from the account menu.',
    kind: 'info',
  })
  return json({ profile: updated })
}
