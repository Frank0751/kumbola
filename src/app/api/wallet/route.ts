// /api/wallet
// GET  — balance + transaction history
// POST — { action: 'subscribe', planId }
// Wallet top-ups go through /api/payments/initialize (Paystack), never here.
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import type { Transaction, Plan } from '@/lib/types'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('transactions')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(60)
  return json({ balance: auth.profile.wallet_balance, transactions: (data ?? []) as Transaction[] })
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const body = (await req.json().catch(() => null)) as
    | { action?: 'subscribe'; planId?: string }
    | null
  if (!body?.action) return fail('Missing action')
  const admin = supabaseAdmin()

  if (body.action === 'subscribe') {
    if (auth.profile.role !== 'customer') return fail('Only customer accounts can subscribe to plans', 403)
    if (!body.planId) return fail('Choose a plan')
    const { data: plan } = await admin.from('plans').select('*').eq('id', body.planId).eq('is_active', true).single()
    if (!plan) return fail('Plan not found', 404)
    if (auth.profile.plan_id === plan.id) return fail('You are already on this plan', 409)

    const price = Number(plan.price_ghs)
    if (auth.profile.wallet_balance < price) {
      return fail(`Top up GHS ${(price - auth.profile.wallet_balance).toFixed(2)} more to activate ${plan.name}.`, 402)
    }
    const credits = Math.max(1, Math.round(Number(plan.pickups_per_month)))
    await admin
      .from('profiles')
      .update({ wallet_balance: Number((auth.profile.wallet_balance - price).toFixed(2)), plan_id: plan.id, plan_credits: credits })
      .eq('id', auth.userId)
    await admin.from('transactions').insert({
      user_id: auth.userId,
      type: 'subscription',
      amount_ghs: price,
      method: 'momo',
      network: 'MTN MoMo',
      reference: `SUB-${Date.now().toString(36).toUpperCase()}`,
      note: `${plan.name}, ${credits} pickups activated`,
    })
    await admin.from('notifications').insert({
      user_id: auth.userId,
      title: 'Plan activated',
      body: `${plan.name} is now active with ${credits} pickups. Credits appear automatically when you book.`,
      kind: 'success',
    })
    return json({ plan: plan as Plan, credits })
  }

  return fail('Unknown action')
}
