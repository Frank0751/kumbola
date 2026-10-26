// POST /api/notifications — mark one or all notifications read
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const body = (await req.json().catch(() => null)) as { id?: string; all?: boolean } | null
  const admin = supabaseAdmin()

  if (body?.all) {
    await admin.from('notifications').update({ read: true }).eq('user_id', auth.userId).eq('read', false)
    return json({ ok: true })
  }
  if (body?.id) {
    await admin.from('notifications').update({ read: true }).eq('id', body.id).eq('user_id', auth.userId)
    return json({ ok: true })
  }
  return fail('Provide notification id or all=true')
}
