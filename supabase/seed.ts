/**
 * KumBola — demo seed for Supabase
 * Run: bun supabase/seed.ts
 * Creates demo accounts (password: kumbola123), plans, disposal sites,
 * bookings across all statuses, verifications, transactions, notifications.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

const PASSWORD = 'kumbola123'

// deterministic PRNG
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260901)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const rint = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const rfloat = (min: number, max: number, dp = 2) => {
  const v = rnd() * (max - min) + min
  return Number(v.toFixed(dp))
}
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString()

// ---------------- static reference data ----------------
const PLANS = [
  { id: 'individual_weekly', name: 'Individual Weekly', description: 'One 240-litre bin or three sacks a week, on a reliable schedule.', price_ghs: 45, pickups_per_month: 4.3, target: 'Most households', sort_order: 1 },
  { id: 'compound_shared', name: 'Compound Shared', description: 'Compound houses sharing a bin, collected twice a week. About GHS 1 a day per household.', price_ghs: 30, pickups_per_month: 2.2, target: 'Compound houses', sort_order: 2 },
  { id: 'premium_twice_weekly', name: 'Premium Twice-Weekly', description: 'Twice-weekly collection for larger or higher-income households.', price_ghs: 80, pickups_per_month: 8.7, target: 'Larger households', sort_order: 3 },
  { id: 'payg', name: 'Pay-As-You-Go', description: 'No commitment. GHS 6 per small sack, book whenever you need.', price_ghs: 24, pickups_per_month: 4.0, target: 'Low-income & irregular users', sort_order: 4 },
  { id: 'business', name: 'Business', description: 'Shops, chop bars, hostels and schools. Three pickups a week with compliance records.', price_ghs: 300, pickups_per_month: 13, target: 'Businesses', sort_order: 5 },
  { id: 'institutional', name: 'Institutional Zone', description: 'Assembly zones, markets and estates. Includes the live city dashboard.', price_ghs: 15000, pickups_per_month: 30, target: 'Institutions', sort_order: 6 },
]

const SITES = [
  { id: 'oti_landfill', name: 'Oti Sanitary Landfill', type: 'landfill', lat: 6.7347, lng: -1.5806, geofence_radius_m: 300, municipality: 'KMA' },
  { id: 'suame_transfer', name: 'Suame Transfer Station', type: 'transfer_station', lat: 6.6926, lng: -1.6497, geofence_radius_m: 150, municipality: 'Suame' },
  { id: 'antoakrom_aggregation', name: 'WasteCure Aggregation Point (Antoakrom)', type: 'aggregation', lat: 6.7617, lng: -1.6589, geofence_radius_m: 150, municipality: 'Kwabre East' },
  { id: 'adagya_recycling', name: 'Adagya Compost & Recycling Plant', type: 'recycling', lat: 6.5989, lng: -1.7005, geofence_radius_m: 400, municipality: 'KMA South' },
  { id: 'kaase_transfer', name: 'Kaase Recycling & Transfer Hub', type: 'transfer_station', lat: 6.683, lng: -1.642, geofence_radius_m: 180, municipality: 'KMA' },
]

const MUNIS = ['Suame', 'Kwabre East', 'Oforikrom', 'Asokwa', 'Old Tafo', 'Kwadaso']

type DriverDef = { email: string; name: string; phone: string; plate: string; muni: string; online: boolean; rating: number; ratingCount: number }
const DRIVERS: DriverDef[] = [
  { email: 'driver@kumbola.com', name: 'Kwame Osei', phone: '+233 55 102 3344', plate: 'AS-4821-26', muni: 'Suame', online: true, rating: 4.9, ratingCount: 212 },
  { email: 'driver1@kumbola.com', name: 'Yaw Boateng', phone: '+233 55 118 7755', plate: 'KE-2204-26', muni: 'Kwabre East', online: true, rating: 4.8, ratingCount: 168 },
  { email: 'driver2@kumbola.com', name: 'Musah Abdulai', phone: '+233 55 340 9911', plate: 'AS-7719-26', muni: 'Suame', online: true, rating: 4.7, ratingCount: 141 },
  { email: 'driver3@kumbola.com', name: 'Kofi Adjei', phone: '+233 55 277 6612', plate: 'OF-3390-26', muni: 'Oforikrom', online: true, rating: 4.9, ratingCount: 97 },
  { email: 'driver4@kumbola.com', name: 'Abena Sarpong', phone: '+233 55 612 8430', plate: 'OF-1188-26', muni: 'Oforikrom', online: true, rating: 5.0, ratingCount: 64 },
  { email: 'driver5@kumbola.com', name: 'Nana Kwabena', phone: '+233 55 908 1123', plate: 'AK-5567-26', muni: 'Asokwa', online: false, rating: 4.6, ratingCount: 88 },
  { email: 'driver6@kumbola.com', name: 'Kwabena Frimpong', phone: '+233 55 451 2278', plate: 'OT-8823-26', muni: 'Old Tafo', online: false, rating: 4.7, ratingCount: 120 },
  { email: 'driver7@kumbola.com', name: 'Issah Fuseini', phone: '+233 55 733 4490', plate: 'KW-2210-26', muni: 'Kwadaso', online: true, rating: 4.8, ratingCount: 73 },
]

type CustomerDef = { email: string; name: string; phone: string; type: 'household' | 'business' | 'institution'; muni: string; address: string; plan?: string; credits?: number }
const CUSTOMERS: CustomerDef[] = [
  { email: 'customer@kumbola.com', name: 'Ama Serwaa', phone: '+233 54 123 4567', type: 'household', muni: 'Suame', address: 'House 12, Asuoyeboah Main Road', plan: 'individual_weekly', credits: 2 },
  { email: 'customer1@kumbola.com', name: 'Akosua Mensah', phone: '+233 54 220 1188', type: 'household', muni: 'Kwabre East', address: 'Compound G8, Antoakrom', plan: 'compound_shared', credits: 1 },
  { email: 'customer2@kumbola.com', name: 'Kofi Owusu', phone: '+233 54 771 2233', type: 'household', muni: 'Oforikrom', address: 'Kotei Junction, near Blue Danube' },
  { email: 'customer3@kumbola.com', name: 'Yaa Asantewaa', phone: '+233 54 902 4471', type: 'household', muni: 'Suame', address: 'Suame Roundabout, behind the market' },
  { email: 'customer4@kumbola.com', name: 'Efua Boateng', phone: '+233 54 338 9902', type: 'household', muni: 'Oforikrom', address: 'Ayeduase Gate, Block C' },
  { email: 'business@kumbola.com', name: 'Jollof Junction Chop Bar', phone: '+233 54 500 7788', type: 'business', muni: 'Suame', address: 'Suame Magazine Main Street', plan: 'business', credits: 9 },
  { email: 'business1@kumbola.com', name: 'HostelPoint Kotei', phone: '+233 54 887 2211', type: 'business', muni: 'Oforikrom', address: 'Kotei Hostel Row 4' },
  { email: 'business2@kumbola.com', name: 'FreshStop Mini Mart', phone: '+233 54 644 9012', type: 'business', muni: 'Asokwa', address: 'Asokwa Industrial Area' },
  { email: 'institution@kumbola.com', name: 'KNUST Guest Services', phone: '+233 54 300 6677', type: 'institution', muni: 'Oforikrom', address: 'KNUST Campus, Guest Houses', plan: 'institutional', credits: 24 },
  { email: 'institution1@kumbola.com', name: 'Bright Stars Academy', phone: '+233 54 619 5544', type: 'institution', muni: 'Kwabre East', address: 'Mampong Road, Meduma' },
]

const ADMIN = { email: 'admin@kumbola.com', name: 'City Sanitation Desk', phone: '+233 55 000 0000' }

const PRICES: Record<string, number> = { small_sack: 6, standard_bin: 12, bulky: 25 }
const EST_KG: Record<string, number> = { small_sack: 15, standard_bin: 40, bulky: 250 }
const SIZES = ['small_sack', 'standard_bin', 'standard_bin', 'bulky'] as const

let refCounter = 100001
const nextRef = () => `KB-${refCounter++}`

async function main() {
  console.log('Purging existing KumBola demo data…')
  // 1) purge dependent tables first (FK order)
  for (const t of ['disposal_verifications', 'transactions', 'notifications', 'bookings', 'dumping_reports']) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw new Error(`purge ${t}: ${error.message}`)
  }
  const { error: pErr } = await db.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (pErr) throw new Error(`purge profiles: ${pErr.message}`)
  // 2) then delete demo auth users
  let page = 1
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    if (!data.users.length) break
    for (const u of data.users) {
      if (u.email?.endsWith('@kumbola.com')) {
        const { error: delErr } = await db.auth.admin.deleteUser(u.id)
        if (delErr) throw new Error(`delete user ${u.email}: ${delErr.message}`)
      }
    }
    if (data.users.length < 200) break
    page++
  }

  console.log('Seeding plans & sites…')
  await db.from('plans').upsert(PLANS)
  await db.from('disposal_sites').upsert(SITES)

  console.log('Creating auth users & profiles…')
  const driverIds: string[] = []
  const driverByEmail = new Map<string, string>()
  for (const d of DRIVERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: d.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: d.name, role: 'driver' },
    })
    if (error) throw error
    driverByEmail.set(d.email, data.user.id)
    driverIds.push(data.user.id)
  }
  const customerIds: string[] = []
  const customerByEmail = new Map<string, string>()
  for (const c of CUSTOMERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: c.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: c.name, role: 'customer' },
    })
    if (error) throw error
    customerByEmail.set(c.email, data.user.id)
    customerIds.push(data.user.id)
  }
  const adminRes = await db.auth.admin.createUser({
    email: ADMIN.email, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: ADMIN.name, role: 'admin' },
  })
  if (adminRes.error) throw adminRes.error

  // profiles — every row must have the SAME keys (PostgREST multi-row insert NULLs missing keys)
  const baseProfile = {
    account_type: null as string | null, plan_id: null as string | null, plan_credits: 0,
    municipality: null as string | null, address: null as string | null, wallet_balance: 0,
    vehicle_plate: null as string | null, vehicle_type: 'Aboboyaa 200cc' as string | null, base_municipality: null as string | null,
    rating: 5, rating_count: 0, total_jobs: 0, total_earnings: 0, is_online: false, license_verified: true,
  }
  const profileRows = DRIVERS.map((d) => ({
    ...baseProfile,
    id: driverByEmail.get(d.email)!, role: 'driver', full_name: d.name, phone: d.phone, email: d.email,
    vehicle_plate: d.plate, base_municipality: d.muni, municipality: d.muni,
    rating: d.rating, rating_count: d.ratingCount, is_online: d.online,
    address: 'Onboarded under L.I. 2519',
  }))
  profileRows.push({
    ...baseProfile,
    id: adminRes.data.user.id, role: 'admin', full_name: ADMIN.name, phone: ADMIN.phone, email: ADMIN.email,
    municipality: 'KMA', address: 'Kumasi Metropolitan Assembly',
  })
  const profileExtra: Record<string, { wallet_balance: number }> = {}
  for (const c of CUSTOMERS) {
    profileRows.push({
      ...baseProfile,
      id: customerByEmail.get(c.email)!, role: 'customer', full_name: c.name, phone: c.phone, email: c.email,
      account_type: c.type, municipality: c.muni, address: c.address,
      plan_id: c.plan ?? null, plan_credits: c.credits ?? 0,
    })
    profileExtra[c.email] = { wallet_balance: c.email === 'customer@kumbola.com' ? 120 : rfloat(15, 90) }
  }
  const { error: profErr } = await db.from('profiles').insert(profileRows)
  if (profErr) throw new Error(`profiles: ${profErr.message}`)
  for (const [email, w] of Object.entries(profileExtra)) {
    await db.from('profiles').update({ wallet_balance: w.wallet_balance }).eq('id', customerByEmail.get(email)!)
  }

  console.log('Seeding bookings lifecycle…')
  const SIZE_KIND = { small_sack: 'general', standard_bin: 'general', bulky: 'general' }
  let seedBookings: {
    customer_email: string; driver_email: string | null; size: string; muni: string; address: string;
    status: string; ageDays: number; usePlan: boolean; code: string; notes: string | null
  }[] = []

  const addB = (o: Partial<typeof seedBookings[0]> & { customer_email: string; status: string; ageDays: number }) =>
    seedBookings.push({
      driver_email: null, size: pick([...SIZES]), muni: 'Suame', address: 'Address on file',
      usePlan: false, code: String(rint(1000, 9999)), notes: null, ...o,
    } as never)

  // Verified history for every customer (creates receipts, driver earnings, admin charts)
  for (const c of CUSTOMERS) {
    const n = c.type === 'household' ? rint(3, 5) : rint(4, 6)
    for (let i = 0; i < n; i++) {
      addB({ customer_email: c.email, status: 'verified', ageDays: rint(1, 29), muni: c.muni, address: c.address, usePlan: c.plan ? rnd() < 0.5 : false })
    }
  }
  // Pending jobs waiting for drivers (the "available jobs" board)
  addB({ customer_email: 'customer@kumbola.com', status: 'pending', ageDays: 0, muni: 'Suame', address: 'House 12, Asuoyeboah Main Road', size: 'standard_bin', code: '1234', notes: 'Bin at the side gate, blue lid' })
  addB({ customer_email: 'customer3@kumbola.com', status: 'pending', ageDays: 0, muni: 'Suame', address: 'Suame Roundabout, behind the market', size: 'bulky', code: '2231', notes: 'Old mattresses, 2 pieces' })
  addB({ customer_email: 'customer1@kumbola.com', status: 'pending', ageDays: 0, muni: 'Kwabre East', address: 'Compound G8, Antoakrom', size: 'standard_bin', code: '3345' })
  addB({ customer_email: 'customer2@kumbola.com', status: 'pending', ageDays: 0, muni: 'Oforikrom', address: 'Kotei Junction, near Blue Danube', size: 'small_sack', code: '4456' })
  addB({ customer_email: 'customer4@kumbola.com', status: 'pending', ageDays: 0, muni: 'Oforikrom', address: 'Ayeduase Gate, Block C', size: 'standard_bin', code: '5567' })
  addB({ customer_email: 'business1@kumbola.com', status: 'pending', ageDays: 0, muni: 'Oforikrom', address: 'Kotei Hostel Row 4', size: 'bulky', code: '6678' })
  addB({ customer_email: 'institution1@kumbola.com', status: 'pending', ageDays: 0, muni: 'Kwabre East', address: 'Mampong Road, Meduma', size: 'bulky', code: '7789' })
  addB({ customer_email: 'business@kumbola.com', status: 'pending', ageDays: 0, muni: 'Suame', address: 'Suame Magazine Main Street', size: 'standard_bin', code: '8890' })
  // Active jobs mid-flow
  addB({ customer_email: 'customer1@kumbola.com', status: 'assigned', ageDays: 0, muni: 'Kwabre East', address: 'Compound G8, Antoakrom', size: 'standard_bin', code: '2468', driver_email: 'driver@kumbola.com' })
  addB({ customer_email: 'customer2@kumbola.com', status: 'assigned', ageDays: 0, muni: 'Oforikrom', address: 'Kotei Junction, near Blue Danube', size: 'small_sack', code: '1357', driver_email: 'driver3@kumbola.com' })
  addB({ customer_email: 'customer4@kumbola.com', status: 'collected', ageDays: 0, muni: 'Oforikrom', address: 'Ayeduase Gate, Block C', size: 'standard_bin', code: '8642', driver_email: 'driver1@kumbola.com' })
  addB({ customer_email: 'business@kumbola.com', status: 'collected', ageDays: 0, muni: 'Suame', address: 'Suame Magazine Main Street', size: 'bulky', code: '9753', driver_email: 'driver2@kumbola.com' })
  addB({ customer_email: 'customer3@kumbola.com', status: 'cancelled', ageDays: 2, muni: 'Suame', address: 'Suame Roundabout, behind the market', size: 'small_sack', code: '1122' })
  addB({ customer_email: 'customer2@kumbola.com', status: 'cancelled', ageDays: 5, muni: 'Oforikrom', address: 'Kotei Junction', size: 'small_sack', code: '3344' })
  addB({ customer_email: 'customer4@kumbola.com', status: 'cancelled', ageDays: 8, muni: 'Oforikrom', address: 'Ayeduase Gate', size: 'standard_bin', code: '5566' })
  addB({ customer_email: 'customer1@kumbola.com', status: 'cancelled', ageDays: 12, muni: 'Kwabre East', address: 'Compound G8, Antoakrom', size: 'small_sack', code: '7788' })

  const driverTotals = new Map<string, { jobs: number; earnings: number }>()
  const bump = (id: string, pay: number) => {
    const cur = driverTotals.get(id) ?? { jobs: 0, earnings: 0 }
    cur.jobs += 1; cur.earnings += pay
    driverTotals.set(id, cur)
  }

  let inserted = 0
  for (const b of seedBookings) {
    // resolve driver: auto-assign one from the same municipality for completed jobs
    if ((b.status === 'assigned' || b.status === 'collected' || b.status === 'verified') && !b.driver_email) {
      const local = DRIVERS.filter((d) => d.muni === b.muni)
      const pool = local.length ? local : DRIVERS
      b.driver_email = pick(pool).email
    }
    const customerId = customerByEmail.get(b.customer_email)!
    const custDef = CUSTOMERS.find((c) => c.email === b.customer_email)!
    const isPlan = b.usePlan && !!custDef.plan
    const amount = isPlan ? 0 : PRICES[b.size]
    const payout = Number((isPlan ? 8.47 : amount * 0.85).toFixed(2))
    const commission = Number((isPlan ? 1.5 : amount * 0.15).toFixed(2))
    const estKg = Number((EST_KG[b.size] * rfloat(0.8, 1.25, 2)).toFixed(1))
    const created = daysAgo(b.ageDays, rint(0, 9))
    const row: Record<string, unknown> = {
      reference: nextRef(), customer_id: customerId, booking_type: isPlan ? 'plan' : 'one_off',
      plan_id: isPlan ? custDef.plan : null, waste_size: b.size, waste_kind: custDef.type === 'household' ? 'general' : custDef.type === 'business' ? 'business' : 'institutional',
      estimated_kg: estKg, municipality: b.muni, address: b.address, pickup_code: b.code,
      preferred_time: pick(['now', 'today', 'tomorrow']), notes: b.notes,
      amount_ghs: amount, driver_payout_ghs: payout, commission_ghs: commission, used_credit: isPlan, status: b.status,
      created_at: created,
    }
    if (b.status === 'assigned' || b.status === 'collected' || b.status === 'verified') {
      row.driver_id = b.driver_email ? driverByEmail.get(b.driver_email) : null
      row.assigned_at = b.status === 'assigned' ? daysAgo(0, 0.5) : daysAgo(b.ageDays, 1)
    }
    if (b.status === 'collected' || b.status === 'verified') row.collected_at = b.status === 'collected' ? daysAgo(0, 0.3) : daysAgo(b.ageDays, 0.6)
    if (b.status === 'verified') row.verified_at = daysAgo(b.ageDays, 0)
    if (b.status === 'cancelled') row.cancelled_at = daysAgo(b.ageDays, 0.2)

    const { data: bk, error: bkErr } = await db.from('bookings').insert(row).select('id').single()
    if (bkErr) throw new Error(`booking: ${bkErr.message} ${JSON.stringify(row).slice(0, 200)}`)
    inserted++

    if (b.status === 'verified') {
      const driverId = driverByEmail.get(b.driver_email!)!
      if (!driverId) throw new Error(`no driver resolved for verified booking ${b.customer_email}`)
      const site = pick(SITES)
      const weightKg = Number((estKg * rfloat(0.85, 1.15, 2)).toFixed(1))
      const hasRec = rnd() < 0.45
      const recKg = hasRec ? rfloat(2, 14, 1) : 0
      const bonus = Number((recKg * 0.5).toFixed(2))
      // jitter inside geofence
      const lat = Number((site.lat + rfloat(-0.0008, 0.0008, 6)).toFixed(6))
      const lng = Number((site.lng + rfloat(-0.0008, 0.0008, 6)).toFixed(6))
      const { error: vErr } = await db.from('disposal_verifications').insert({
        booking_id: bk.id, driver_id: driverId, site_id: site.id, weight_kg: weightKg, recyclables_kg: recKg,
        lat, lng, distance_m: rfloat(12, 90, 1), within_geofence: true,
        photo_url: `/images/verify/${site.id}.jpg`, site_ticket: `TKT-${rint(100000, 999999)}`,
        status: 'approved', created_at: daysAgo(b.ageDays, 0),
      })
      if (vErr) throw new Error(`verification: ${vErr.message}`)
      const txns = []
      if (amount > 0) txns.push({ user_id: customerId, booking_id: bk.id, type: 'payment', amount_ghs: amount, method: 'momo', network: pick(['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money']), reference: `PAY-${rint(100000, 999999)}`, created_at: created })
      txns.push({ user_id: driverId, booking_id: bk.id, type: 'payout', amount_ghs: payout, method: 'momo', network: 'MTN MoMo', reference: `OUT-${rint(100000, 999999)}`, created_at: daysAgo(b.ageDays, 0) })
      txns.push({ user_id: driverId, booking_id: bk.id, type: 'commission', amount_ghs: commission, method: 'platform', reference: `COM-${rint(100000, 999999)}`, created_at: daysAgo(b.ageDays, 0) })
      if (bonus > 0) txns.push({ user_id: driverId, booking_id: bk.id, type: 'bonus', amount_ghs: bonus, method: 'platform', reference: `BON-${rint(100000, 999999)}`, note: `${recKg} kg recyclables`, created_at: daysAgo(b.ageDays, 0) })
      const { error: txErr } = await db.from('transactions').insert(txns)
      if (txErr) throw new Error(`txns: ${txErr.message}`)
      bump(driverId, payout + bonus)
    }
    if (b.status === 'collected' || b.status === 'assigned') {
      const driverId = driverByEmail.get(b.driver_email!)!
      bump(driverId, 0) // in-progress, no earnings yet
    }
  }

  console.log('Applying driver totals…')
  for (const [id, t] of driverTotals) {
    const { error } = await db.from('profiles').update({ total_jobs: t.jobs, total_earnings: Number(t.earnings.toFixed(2)) }).eq('id', id)
    if (error) throw new Error(`driver totals: ${error.message}`)
  }

  console.log('Seeding wallet history for demo customer…')
  const ama = customerByEmail.get('customer@kumbola.com')!
  await db.from('transactions').insert([
    { user_id: ama, type: 'topup', amount_ghs: 100, method: 'momo', network: 'MTN MoMo', reference: `TOP-${rint(100000, 999999)}`, created_at: daysAgo(9, 2) },
    { user_id: ama, type: 'topup', amount_ghs: 70, method: 'momo', network: 'MTN MoMo', reference: `TOP-${rint(100000, 999999)}`, created_at: daysAgo(3, 4) },
  ])

  console.log('Seeding notifications…')
  const notif = []
  notif.push(
    { user_id: ama, title: 'Welcome to KumBola! 🎉', body: 'Your verified waste collection account is ready. Book your first pickup any time.', kind: 'success', created_at: daysAgo(9) },
    { user_id: ama, title: 'Plan activated', body: 'Individual Weekly is active — 4 pickups a month at GHS 45.', kind: 'info', created_at: daysAgo(9, 1) },
    { user_id: ama, title: 'Disposal verified', body: 'Your last pickup was verified at an approved site. Receipt available.', kind: 'success', created_at: daysAgo(1, 3) },
    { user_id: driverByEmail.get('driver@kumbola.com')!, title: 'New job available', body: 'A pickup near you is waiting. Open Available Jobs to accept.', kind: 'info', created_at: daysAgo(0, 1) },
    { user_id: driverByEmail.get('driver@kumbola.com')!, title: 'Payout sent', body: 'Your daily mobile money payout has been processed.', kind: 'success', created_at: daysAgo(1, 2) },
    { user_id: driverByEmail.get('driver@kumbola.com')!, title: 'You are L.I. 2519 verified ✅', body: 'Your licence and vehicle checks are complete. Lease-to-own progress continues.', kind: 'success', created_at: daysAgo(20) },
    { user_id: adminRes.data.user.id, title: 'Weekly report ready', body: 'Collection heatmaps and disposal stats are on the dashboard.', kind: 'info', created_at: daysAgo(2, 5) },
    { user_id: adminRes.data.user.id, title: 'New dumping report', body: 'A resident reported open burning at Old Tafo. Review it on the map.', kind: 'warning', created_at: daysAgo(1, 7) },
  )
  const { error: nErr } = await db.from('notifications').insert(notif)
  if (nErr) throw new Error(`notifications: ${nErr.message}`)

  console.log('Seeding dumping reports…')
  await db.from('dumping_reports').insert([
    { municipality: 'Old Tafo', location_text: 'Tafo Nhyiaeso, near the stream', description: 'Household waste burning close to residential homes.', severity: 'high', status: 'open', lat: 6.7336, lng: -1.6106, reporter_name: 'Anonymous resident', created_at: daysAgo(1, 6) },
    { municipality: 'Suame', location_text: 'Suame Magazine back lane', description: 'Pile of scrap and refuse by the drainage.', severity: 'medium', status: 'open', lat: 6.6887, lng: -1.6562, reporter_name: 'Driver: Kwame O.', created_at: daysAgo(2, 3) },
    { municipality: 'Oforikrom', location_text: 'Ayeduase New Site', description: 'Overflowing bin not collected for a week.', severity: 'medium', status: 'reviewing', lat: 6.6697, lng: -1.5692, reporter_name: 'Anonymous resident', created_at: daysAgo(4, 2) },
    { municipality: 'Asokwa', location_text: 'Asokwa Market stretch', description: 'Market waste dumped after closing hours.', severity: 'high', status: 'open', lat: 6.6797, lng: -1.6206, reporter_name: 'City marshal', created_at: daysAgo(3, 8) },
    { municipality: 'Kwabre East', location_text: 'Antoakrom – river side', description: 'Plastic bags ending in the stream after rains.', severity: 'high', status: 'resolved', lat: 6.7621, lng: -1.6602, reporter_name: 'Community agent', created_at: daysAgo(8) },
    { municipality: 'Kwadaso', location_text: 'Kwadaso Estate loop', description: 'Construction rubble dumped overnight.', severity: 'low', status: 'open', lat: 6.6846, lng: -1.6646, reporter_name: 'Anonymous resident', created_at: daysAgo(5, 1) },
  ])

  // sanity check
  const { count: bkCount } = await db.from('bookings').select('*', { count: 'exact', head: true })
  const { count: profCount } = await db.from('profiles').select('*', { count: 'exact', head: true })
  const { count: vCount } = await db.from('disposal_verifications').select('*', { count: 'exact', head: true })
  const { count: tCount } = await db.from('transactions').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Seed complete: ${profCount} profiles, ${bkCount} bookings, ${vCount} verifications, ${tCount} transactions`)
  console.log('Demo logins (password: kumbola123):')
  console.log('  customer@kumbola.com  — Ama Serwaa (household, Suame)')
  console.log('  business@kumbola.com  — Jollof Junction (business, Suame)')
  console.log('  driver@kumbola.com    — Kwame Osei (Aboboyaa driver, Suame)')
  console.log('  admin@kumbola.com     — KMA Sanitation Desk (city admin)')
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  process.exit(1)
})
