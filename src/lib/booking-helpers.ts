// Server-side helpers to hydrate bookings with joined customer/driver/site/verification
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Booking, DisposalVerification, DisposalSite } from '@/lib/types'

export interface HydrateOptions {
  // Strip pickup_code. Set this for every response an operator receives: the code is
  // the customer's proof that the operator actually showed up, so the operator must
  // only ever learn it by asking the customer at the door.
  forDriver?: boolean
}

export async function hydrateBookings(rows: Record<string, unknown>[], opts: HydrateOptions = {}): Promise<Booking[]> {
  if (!rows.length) return []
  const admin = supabaseAdmin()

  const driverIds = [...new Set(rows.map((r) => r.driver_id).filter(Boolean) as string[])]
  const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean) as string[])]
  const bookingIds = rows.map((r) => r.id as string)

  const [driversRes, customersRes, verifsRes] = await Promise.all([
    driverIds.length
      ? admin.from('profiles').select('id, full_name, phone, rating, vehicle_plate, vehicle_type, account_type, municipality').in('id', driverIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] | null }),
    customerIds.length
      ? admin.from('profiles').select('id, full_name, phone, municipality, account_type').in('id', customerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] | null }),
    admin.from('disposal_verifications').select('*').in('booking_id', bookingIds),
  ])

  const siteIds = [...new Set((verifsRes.data ?? []).map((v) => v.site_id).filter(Boolean) as string[])]
  const sitesRes = siteIds.length
    ? await admin.from('disposal_sites').select('*').in('id', siteIds)
    : { data: [] as DisposalSite[] | null }

  const driverMap = new Map<string, Record<string, unknown>>(
    ((driversRes.data ?? []) as Record<string, unknown>[]).map((d) => [d.id as string, d])
  )
  const customerMap = new Map<string, Record<string, unknown>>(
    ((customersRes.data ?? []) as Record<string, unknown>[]).map((c) => [c.id as string, c])
  )
  const siteMap = new Map<string, DisposalSite>(((sitesRes.data ?? []) as DisposalSite[]).map((s) => [s.id, s]))
  const verifMap = new Map<string, DisposalVerification>(
    (verifsRes.data ?? []).map((v) => [v.booking_id as string, { ...v, site: siteMap.get(v.site_id) ?? null }])
  )

  return rows.map((r) => ({
    ...(stripPickupCode(r, opts.forDriver) as unknown as Booking),
    driver: r.driver_id
      ? ((driverMap.get(r.driver_id as string) ?? null) as Booking['driver'])
      : null,
    customer: (customerMap.get(r.customer_id as string) ?? undefined) as Booking['customer'],
    verification: verifMap.get(r.id as string) ?? null,
  }))
}

function stripPickupCode(row: Record<string, unknown>, strip?: boolean): Record<string, unknown> {
  if (!strip) return row
  const { pickup_code, ...rest } = row
  return rest
}
