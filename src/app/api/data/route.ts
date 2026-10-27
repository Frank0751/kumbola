// GET /api/data — public reference data (plans, disposal sites)
import { supabaseAdmin, json } from '@/lib/supabase-server'
import { MUNICIPALITIES } from '@/lib/constants'

export async function GET() {
  const admin = supabaseAdmin()
  const [{ data: plans }, { data: sites }] = await Promise.all([
    admin.from('plans').select('*').eq('is_active', true).order('sort_order'),
    admin.from('disposal_sites').select('*').eq('is_active', true),
  ])
  return json({ plans: plans ?? [], sites: sites ?? [], municipalities: MUNICIPALITIES })
}
