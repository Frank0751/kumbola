// GET /api/payments/verify?reference=… — confirm a payment after the
// Paystack checkout redirects back. In real mode it asks Paystack directly
// (webhook-independent), so localhost dev and hosted deploys both converge.
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { finalizeTopupIntent, paystackEnabled, paystackVerify, type PaymentIntentRow } from '@/lib/payments-server'

export async function GET(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const reference = new URL(req.url).searchParams.get('reference')
  if (!reference) return fail('reference query parameter required')
  const admin = supabaseAdmin()

  const { data: intent } = await admin
    .from('payment_intents')
    .select('*')
    .eq('reference', reference)
    .eq('user_id', auth.userId)
    .single()
  if (!intent) return fail('Payment reference not found', 404)
  const row = intent as PaymentIntentRow

  if (row.status === 'succeeded') {
    const { data: p } = await admin.from('profiles').select('wallet_balance').eq('id', auth.userId).single()
    return json({ status: 'succeeded', balance: Number(p?.wallet_balance ?? 0) })
  }
  if (row.status === 'failed') return json({ status: 'failed' }, 200)
  if (!paystackEnabled()) {
    // Simulation mode finalizes at initialize time; an initiated intent here is stale.
    return json({ status: row.status }, 200)
  }

  const ps = await paystackVerify(reference)
  if (!ps.ok) return fail(ps.message ?? 'Could not verify payment', 502)
  if (ps.status === 'success') {
    const fin = await finalizeTopupIntent(admin, row)
    if (!fin.ok) return fail(fin.error ?? 'Could not credit wallet', 500)
    return json({ status: 'succeeded', balance: fin.balance })
  }
  if (ps.status === 'failed' || ps.status === 'abandoned') {
    await admin.from('payment_intents').update({ status: 'failed' }).eq('id', row.id)
    return json({ status: 'failed' }, 200)
  }
  return json({ status: 'initiated' }, 200)
}
