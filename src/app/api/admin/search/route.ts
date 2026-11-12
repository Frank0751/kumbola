// GET /api/admin/search?q= — global search (role: admin)
// Spec 3 "Global search": one box finds any job, customer or operator
// by reference, name, phone or pickup code.
import { verifyUser, json, supabaseAdmin } from '@/lib/supabase-server'
import { hydrateBookings } from '@/lib/booking-helpers'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return json({ jobs: [], people: [] })
  if (auth.profile.role !== 'admin') return json({ jobs: [], people: [] })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return json({ jobs: [], people: [] })
  const admin = supabaseAdmin()
  const like = `%${q.replace(/[%_]/g, '')}%`

  const [jobsRes, peopleRes] = await Promise.all([
    admin
      .from('bookings')
      .select('*')
      .or(`reference.ilike.${like},pickup_code.eq.${q.replace(/[%_]/g, '')},address.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('profiles')
      .select('id, role, full_name, phone, email, municipality, account_status, vetting_status, wallet_balance')
      .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like},vehicle_plate.ilike.${like}`)
      .neq('role', 'admin')
      .limit(8),
  ])

  const jobs = await hydrateBookings((jobsRes.data ?? []) as Record<string, unknown>[])
  const people = (peopleRes.data ?? []) as {
    id: string
    role: string
    full_name: string
    phone: string | null
    email: string | null
    municipality: string | null
    account_status: string
    vetting_status: string
    wallet_balance: number
  }[]
  return json({ jobs, people })
}
