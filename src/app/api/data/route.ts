// GET /api/data — public reference data (plans, disposal sites, control flags)
import { supabaseAdmin, json } from '@/lib/supabase-server'
import { getSettings } from '@/lib/app-settings'
import { MUNICIPALITIES } from '@/lib/constants'

export async function GET() {
  const admin = supabaseAdmin()
  const [{ data: plans }, { data: sites }, flags] = await Promise.all([
    admin.from('plans').select('*').eq('is_active', true).order('sort_order'),
    admin.from('disposal_sites').select('*').eq('is_active', true),
    getSettings(['maintenance_mode', 'booking_enabled']),
  ])
  return json({
    plans: plans ?? [],
    sites: sites ?? [],
    municipalities: MUNICIPALITIES,
    // Command Centre control flags (Task 19) — the client shows a maintenance
    // banner and can disable the booking CTA from these.
    maintenance: flags.maintenance_mode === 'true',
    bookingEnabled: flags.booking_enabled !== 'false',
  })
}
