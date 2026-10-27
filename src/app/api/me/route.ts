// GET /api/me — profile + plan + notifications
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import type { MePayload } from '@/lib/types'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const admin = supabaseAdmin()

  let plan = null
  if (auth.profile.plan_id) {
    const { data } = await admin.from('plans').select('*').eq('id', auth.profile.plan_id).single()
    plan = data
  }
  const { data: notifications } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(25)

  const unread = (notifications ?? []).filter((n) => !n.read).length
  const payload: MePayload = {
    profile: auth.profile,
    plan,
    notifications: notifications ?? [],
    unread,
  }
  return json(payload)
}
